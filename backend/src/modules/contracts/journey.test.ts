/**
 * Critical path regression: hire → milestones → complete → reviews.
 * Uses the public HTTP API (same surface as the frontend).
 */
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { RefreshSession } from '../auth/refresh-session.model';
import { Contract } from './contract.model';
import { Job } from '../jobs/job.model';
import { Proposal } from '../proposals/proposal.model';
import { Review } from '../reviews/review.model';
import { User } from '../users/user.model';
import { Notification } from '../notifications/notification.model';

describe('Critical hire → complete journey', () => {
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
      Review.deleteMany({}),
      Notification.deleteMany({}),
    ]);
  });

  async function register(email: string, role: 'client' | 'freelancer') {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: role === 'client' ? 'Client User' : 'Freelancer User',
      email,
      password: 'Password1',
      role,
      acceptTerms: true,
    });
    expect(res.status).toBe(201);
    return {
      token: res.body.data.accessToken as string,
      id: res.body.data.user.id as string,
    };
  }

  it('runs proposal accept, milestones, completion, and unique reviews', async () => {
    const client = await register('journey-client@example.com', 'client');
    const freelancer = await register('journey-freelancer@example.com', 'freelancer');

    const jobRes = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${client.token}`)
      .send({
        title: 'Build a marketplace hardening suite',
        description:
          'Implement and verify contracts, milestones, and reviews end to end for DevHire Phase 8.',
        skills: ['TypeScript', 'MongoDB'],
        budgetType: 'fixed',
        budgetMin: 500,
        budgetMax: 500,
        currency: 'USD',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'open',
      });
    expect(jobRes.status).toBe(201);
    const jobId = jobRes.body.data.job.id as string;

    const proposalRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/proposals`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send({
        coverLetter: 'I can harden this marketplace carefully and thoroughly for production.',
        bidAmount: 500,
        deliveryDays: 10,
      });
    expect(proposalRes.status).toBe(201);
    const proposalId = proposalRes.body.data.proposal.id as string;

    const dup = await request(app)
      .post(`/api/v1/jobs/${jobId}/proposals`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send({
        coverLetter: 'Duplicate attempt should fail with a conflict response from the API.',
        bidAmount: 500,
        deliveryDays: 10,
      });
    expect(dup.status).toBe(409);

    const accept = await request(app)
      .post(`/api/v1/proposals/${proposalId}/accept`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(accept.status).toBe(200);
    const contractId = accept.body.data.contract.id as string;
    expect(await Contract.countDocuments({ job: jobId })).toBe(1);

    const notify = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${freelancer.token}`);
    expect(notify.status).toBe(200);
    expect(notify.body.data.notifications.some((n: { type: string }) => n.type === 'proposal.accepted')).toBe(
      true,
    );

    const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const milestone = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({
        title: 'Delivery',
        description: 'Ship the hardened marketplace with tests and documentation.',
        amount: 500,
        dueDate: due,
      });
    expect(milestone.status).toBe(201);
    const milestoneId = milestone.body.data.contract.milestones[0].id as string;

    const submit = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones/${milestoneId}/submit`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send({
        submissionNotes: 'Initial delivery ready for client review with notes attached here.',
      });
    expect(submit.status).toBe(200);

    const revise = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones/${milestoneId}/request-revision`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ feedback: 'Please tighten the security checklist and resubmit the work.' });
    expect(revise.status).toBe(200);

    const resubmit = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones/${milestoneId}/submit`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send({
        submissionNotes: 'Revised delivery addresses the security checklist feedback completely.',
      });
    expect(resubmit.status).toBe(200);

    const approve = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones/${milestoneId}/approve`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(approve.status).toBe(200);

    const complete = await request(app)
      .patch(`/api/v1/contracts/${contractId}/complete`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(complete.status).toBe(200);
    expect(complete.body.data.contract.status).toBe('completed');

    const clientReview = await request(app)
      .post(`/api/v1/contracts/${contractId}/reviews`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ rating: 5, comment: 'Excellent communication and careful production hardening work.' });
    expect(clientReview.status).toBe(201);

    const freelancerReview = await request(app)
      .post(`/api/v1/contracts/${contractId}/reviews`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send({ rating: 5, comment: 'Clear requirements and fair milestone reviews throughout the job.' });
    expect(freelancerReview.status).toBe(201);

    const duplicateReview = await request(app)
      .post(`/api/v1/contracts/${contractId}/reviews`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ rating: 4, comment: 'Trying to leave a second review should be rejected by uniqueness.' });
    expect(duplicateReview.status).toBe(409);

    const stranger = await register('journey-stranger@example.com', 'client');
    const strangerReview = await request(app)
      .post(`/api/v1/contracts/${contractId}/reviews`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ rating: 1, comment: 'Unrelated users must not be able to review this contract at all.' });
    expect([403, 404]).toContain(strangerReview.status);
  }, 60_000);
});
