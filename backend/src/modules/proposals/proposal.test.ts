import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { RefreshSession } from '../auth/refresh-session.model';
import { Contract } from '../contracts/contract.model';
import { Job } from '../jobs/job.model';
import { User } from '../users/user.model';
import { Proposal } from './proposal.model';

const futureDeadline = () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

describe('Proposals API', () => {
  let mongo: MongoMemoryServer;
  const app = createApp();

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      RefreshSession.deleteMany({}),
      Job.deleteMany({}),
      Proposal.deleteMany({}),
      Contract.deleteMany({}),
    ]);
  });

  async function register(role: 'client' | 'freelancer', email: string) {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: role === 'client' ? 'Casey Client' : 'Fran Freelancer',
      email,
      password: 'Password1',
      role,
      acceptTerms: true,
    });
    expect(res.status).toBe(201);
    return {
      token: res.body.data.accessToken as string,
      userId: res.body.data.user.id as string,
    };
  }

  async function createOpenJob(clientToken: string) {
    const res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        title: 'Need a React developer now',
        description: 'Build a dashboard with charts, auth, and responsive layout for our team.',
        skills: ['React', 'TypeScript'],
        budgetType: 'fixed',
        budgetMin: 500,
        budgetMax: 1200,
        currency: 'USD',
        deadline: futureDeadline(),
        status: 'open',
      });
    expect(res.status).toBe(201);
    return res.body.data.job.id as string;
  }

  const proposalBody = {
    coverLetter:
      'I have shipped multiple React dashboards and can deliver a polished MVP quickly with TypeScript.',
    bidAmount: 900,
    deliveryDays: 14,
  };

  it('lets freelancers submit proposals and blocks invalid submissions', async () => {
    const client = await register('client', 'c1@example.com');
    const freelancer = await register('freelancer', 'f1@example.com');
    const otherClient = await register('client', 'c2@example.com');
    const jobId = await createOpenJob(client.token);

    const unauth = await request(app).post(`/api/v1/jobs/${jobId}/proposals`).send(proposalBody);
    expect(unauth.status).toBe(401);

    const asClient = await request(app)
      .post(`/api/v1/jobs/${jobId}/proposals`)
      .set('Authorization', `Bearer ${client.token}`)
      .send(proposalBody);
    expect(asClient.status).toBe(403);

    const created = await request(app)
      .post(`/api/v1/jobs/${jobId}/proposals`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send(proposalBody);
    expect(created.status).toBe(201);
    expect(created.body.data.proposal.status).toBe('pending');
    expect(created.body.data.proposal.freelancer.id).toBe(freelancer.userId);

    const duplicate = await request(app)
      .post(`/api/v1/jobs/${jobId}/proposals`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send(proposalBody);
    expect(duplicate.status).toBe(409);

    const forged = await request(app)
      .post(`/api/v1/jobs/${jobId}/proposals`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send({ ...proposalBody, status: 'accepted', freelancerId: otherClient.userId });
    expect(forged.status).toBe(400);
  });

  it('blocks applying to own job and non-open jobs', async () => {
    // Client who is also... clients can't submit. Create job as client, try as freelancer who isn't owner.
    const client = await register('client', 'owner@example.com');
    const jobId = await createOpenJob(client.token);

    // Pause job
    await request(app)
      .post(`/api/v1/jobs/${jobId}/status`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ status: 'paused' });

    const freelancer = await register('freelancer', 'f2@example.com');
    const toPaused = await request(app)
      .post(`/api/v1/jobs/${jobId}/proposals`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send(proposalBody);
    expect(toPaused.status).toBe(400);
  });

  it('supports freelancer list/edit/withdraw and client list privacy', async () => {
    const client = await register('client', 'c3@example.com');
    const otherClient = await register('client', 'c4@example.com');
    const freelancer = await register('freelancer', 'f3@example.com');
    const jobId = await createOpenJob(client.token);

    const created = await request(app)
      .post(`/api/v1/jobs/${jobId}/proposals`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send(proposalBody);
    const proposalId = created.body.data.proposal.id as string;

    const mine = await request(app)
      .get('/api/v1/users/me/proposals')
      .set('Authorization', `Bearer ${freelancer.token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data.proposals).toHaveLength(1);

    const ownerList = await request(app)
      .get(`/api/v1/jobs/${jobId}/proposals`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(ownerList.status).toBe(200);
    expect(ownerList.body.data.proposals).toHaveLength(1);

    const otherList = await request(app)
      .get(`/api/v1/jobs/${jobId}/proposals`)
      .set('Authorization', `Bearer ${otherClient.token}`);
    expect(otherList.status).toBe(403);

    const edited = await request(app)
      .patch(`/api/v1/proposals/${proposalId}`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send({ bidAmount: 850 });
    expect(edited.status).toBe(200);
    expect(edited.body.data.proposal.bidAmount).toBe(850);

    const withdrawn = await request(app)
      .post(`/api/v1/proposals/${proposalId}/withdraw`)
      .set('Authorization', `Bearer ${freelancer.token}`);
    expect(withdrawn.status).toBe(200);
    expect(withdrawn.body.data.proposal.status).toBe('withdrawn');

    const acceptWithdrawn = await request(app)
      .post(`/api/v1/proposals/${proposalId}/accept`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(acceptWithdrawn.status).toBe(400);
  });

  it('accepts a proposal, creates one contract, rejects others, and is idempotent', async () => {
    const client = await register('client', 'hire@example.com');
    const f1 = await register('freelancer', 'fa@example.com');
    const f2 = await register('freelancer', 'fb@example.com');
    const jobId = await createOpenJob(client.token);

    const p1 = await request(app)
      .post(`/api/v1/jobs/${jobId}/proposals`)
      .set('Authorization', `Bearer ${f1.token}`)
      .send(proposalBody);
    const p2 = await request(app)
      .post(`/api/v1/jobs/${jobId}/proposals`)
      .set('Authorization', `Bearer ${f2.token}`)
      .send({ ...proposalBody, bidAmount: 700 });

    const proposalId = p1.body.data.proposal.id as string;
    const otherId = p2.body.data.proposal.id as string;

    const forbiddenAccept = await request(app)
      .post(`/api/v1/proposals/${proposalId}/accept`)
      .set('Authorization', `Bearer ${f1.token}`);
    expect(forbiddenAccept.status).toBe(403);

    const accepted = await request(app)
      .post(`/api/v1/proposals/${proposalId}/accept`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.proposal.status).toBe('accepted');
    expect(accepted.body.data.contract.amount).toBe(900);
    expect(accepted.body.data.contract.jobId).toBe(jobId);
    expect(accepted.body.data.contract.freelancerId).toBe(f1.userId);

    const job = await Job.findById(jobId);
    expect(job?.status).toBe('in_progress');

    const other = await Proposal.findById(otherId);
    expect(other?.status).toBe('rejected');

    const contracts = await Contract.find({ job: jobId });
    expect(contracts).toHaveLength(1);

    const again = await request(app)
      .post(`/api/v1/proposals/${proposalId}/accept`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(again.status).toBe(200);
    expect(again.body.data.contract.id).toBe(accepted.body.data.contract.id);

    const acceptOther = await request(app)
      .post(`/api/v1/proposals/${otherId}/accept`)
      .set('Authorization', `Bearer ${client.token}`);
    expect([400, 409]).toContain(acceptOther.status);

    const publicJobs = await request(app).get('/api/v1/jobs');
    expect(
      publicJobs.body.data.jobs.find((j: { id: string }) => j.id === jobId),
    ).toBeUndefined();
  });

  it('rejects a pending proposal', async () => {
    const client = await register('client', 'rej@example.com');
    const freelancer = await register('freelancer', 'fr@example.com');
    const jobId = await createOpenJob(client.token);
    const created = await request(app)
      .post(`/api/v1/jobs/${jobId}/proposals`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send(proposalBody);

    const rejected = await request(app)
      .post(`/api/v1/proposals/${created.body.data.proposal.id}/reject`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.proposal.status).toBe('rejected');
  });
});
