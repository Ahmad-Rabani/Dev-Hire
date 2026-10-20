import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { RefreshSession } from '../auth/refresh-session.model';
import { Job } from '../jobs/job.model';
import { Proposal } from '../proposals/proposal.model';
import { Review } from '../reviews/review.model';
import { User } from '../users/user.model';
import { Contract } from './contract.model';

const futureDeadline = () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
const futureDue = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

describe('Contracts, milestones & reviews API', () => {
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

  async function hireFlow(prefix = 'main') {
    const client = await register('client', `${prefix}-c@example.com`);
    const freelancer = await register('freelancer', `${prefix}-f@example.com`);
    const outsider = await register('client', `${prefix}-other@example.com`);

    const jobRes = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${client.token}`)
      .send({
        title: 'Build a contract dashboard',
        description: 'Need React work with milestones and clear deliverables for the team.',
        skills: ['React'],
        budgetType: 'fixed',
        budgetMin: 500,
        budgetMax: 1000,
        currency: 'USD',
        deadline: futureDeadline(),
        status: 'open',
      });
    expect(jobRes.status).toBe(201);
    const jobId = jobRes.body.data.job.id as string;

    const proposalRes = await request(app)
      .post(`/api/v1/jobs/${jobId}/proposals`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send({
        coverLetter:
          'I can deliver the dashboard with milestones and clear weekly progress updates.',
        bidAmount: 900,
        deliveryDays: 21,
      });
    expect(proposalRes.status).toBe(201);
    const proposalId = proposalRes.body.data.proposal.id as string;

    const acceptRes = await request(app)
      .post(`/api/v1/proposals/${proposalId}/accept`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(acceptRes.status).toBe(200);
    const contractId = acceptRes.body.data.contract.id as string;
    expect(acceptRes.body.data.contract.pricingType).toBe('fixed');

    return { client, freelancer, outsider, jobId, contractId };
  }

  it('lists contracts for participants and denies outsiders', async () => {
    const { client, freelancer, outsider, contractId } = await hireFlow();

    const clientList = await request(app)
      .get('/api/v1/contracts')
      .set('Authorization', `Bearer ${client.token}`);
    expect(clientList.status).toBe(200);
    expect(clientList.body.data.contracts).toHaveLength(1);
    expect(clientList.body.data.contracts[0].id).toBe(contractId);

    const freelancerList = await request(app)
      .get('/api/v1/contracts')
      .set('Authorization', `Bearer ${freelancer.token}`);
    expect(freelancerList.status).toBe(200);
    expect(freelancerList.body.data.contracts).toHaveLength(1);

    const outsiderList = await request(app)
      .get('/api/v1/contracts')
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(outsiderList.status).toBe(200);
    expect(outsiderList.body.data.contracts).toHaveLength(0);

    const forbiddenDetail = await request(app)
      .get(`/api/v1/contracts/${contractId}`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(forbiddenDetail.status).toBe(403);

    const badId = await request(app)
      .get('/api/v1/contracts/not-a-valid-id')
      .set('Authorization', `Bearer ${client.token}`);
    expect(badId.status).toBe(400);

    const missing = await request(app)
      .get(`/api/v1/contracts/${new mongoose.Types.ObjectId().toString()}`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(missing.status).toBe(404);
  });

  it('runs the milestone lifecycle and blocks invalid transitions', async () => {
    const { client, freelancer, outsider, contractId } = await hireFlow();

    const asFreelancer = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send({
        title: 'Design system',
        description: 'Create reusable UI components for the dashboard screens.',
        amount: 300,
        dueDate: futureDue(),
      });
    expect(asFreelancer.status).toBe(403);

    const overBudget = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({
        title: 'Everything',
        description: 'This amount exceeds the fixed contract total and must fail.',
        amount: 901,
        dueDate: futureDue(),
      });
    expect(overBudget.status).toBe(400);

    const m1 = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({
        title: 'UI foundation',
        description: 'Design tokens, layout shell, and navigation for the app.',
        amount: 400,
        dueDate: futureDue(),
      });
    expect(m1.status).toBe(201);
    const milestoneId = m1.body.data.contract.milestones[0].id as string;

    const m2 = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({
        title: 'Charts and data',
        description: 'Wire up charts and filtered tables for contract metrics.',
        amount: 500,
        dueDate: futureDue(),
      });
    expect(m2.status).toBe(201);

    const submitAsClient = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones/${milestoneId}/submit`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ submissionNotes: 'Here is the UI foundation deliverable for review.' });
    expect(submitAsClient.status).toBe(403);

    const submit = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones/${milestoneId}/submit`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send({
        submissionNotes: 'UI foundation is ready with tokens and layout shell.',
        deliverableUrl: 'https://example.com/deliverable',
      });
    expect(submit.status).toBe(200);
    expect(submit.body.data.contract.milestones[0].status).toBe('submitted');

    const approveAsFreelancer = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones/${milestoneId}/approve`)
      .set('Authorization', `Bearer ${freelancer.token}`);
    expect(approveAsFreelancer.status).toBe(403);

    const outsiderApprove = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones/${milestoneId}/approve`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(outsiderApprove.status).toBe(403);

    const revision = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones/${milestoneId}/request-revision`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ feedback: 'Please tighten spacing on mobile and add dark mode tokens.' });
    expect(revision.status).toBe(200);
    expect(revision.body.data.contract.milestones[0].status).toBe('revision_requested');

    const resubmit = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones/${milestoneId}/submit`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send({ submissionNotes: 'Updated spacing and dark mode tokens as requested.' });
    expect(resubmit.status).toBe(200);

    const approve = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones/${milestoneId}/approve`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(approve.status).toBe(200);
    expect(approve.body.data.contract.milestones[0].status).toBe('approved');
    expect(approve.body.data.contract.progress.approvedMilestones).toBe(1);

    const reapprove = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones/${milestoneId}/approve`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(reapprove.status).toBe(400);

    const editApproved = await request(app)
      .patch(`/api/v1/contracts/${contractId}/milestones/${milestoneId}`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ title: 'Should fail' });
    expect(editApproved.status).toBe(400);
  });

  it('completes contracts only when milestones are fully approved', async () => {
    const { client, freelancer, contractId, jobId } = await hireFlow();

    const early = await request(app)
      .patch(`/api/v1/contracts/${contractId}/complete`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(early.status).toBe(400);

    const added = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({
        title: 'Full delivery',
        description: 'Ship the complete dashboard including tests and docs.',
        amount: 900,
        dueDate: futureDue(),
      });
    expect(added.status).toBe(201);
    const milestoneId = added.body.data.contract.milestones[0].id as string;

    await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones/${milestoneId}/submit`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send({ submissionNotes: 'Full dashboard delivered with tests and documentation.' });

    const incomplete = await request(app)
      .patch(`/api/v1/contracts/${contractId}/complete`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(incomplete.status).toBe(400);

    await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones/${milestoneId}/approve`)
      .set('Authorization', `Bearer ${client.token}`);

    const asFreelancer = await request(app)
      .patch(`/api/v1/contracts/${contractId}/complete`)
      .set('Authorization', `Bearer ${freelancer.token}`);
    expect(asFreelancer.status).toBe(403);

    const done = await request(app)
      .patch(`/api/v1/contracts/${contractId}/complete`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(done.status).toBe(200);
    expect(done.body.data.contract.status).toBe('completed');
    expect(done.body.data.contract.completedAt).toBeTruthy();

    const job = await Job.findById(jobId);
    expect(job?.status).toBe('closed');

    const again = await request(app)
      .patch(`/api/v1/contracts/${contractId}/complete`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(again.status).toBe(200);
    expect(again.body.data.contract.status).toBe('completed');
  });

  it('allows cancellation only before advanced milestone work', async () => {
    const { client, freelancer, contractId } = await hireFlow();

    const cancel = await request(app)
      .post(`/api/v1/contracts/${contractId}/cancel`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ reason: 'Project priorities changed and we no longer need this work.' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.contract.status).toBe('cancelled');

    const completeCancelled = await request(app)
      .patch(`/api/v1/contracts/${contractId}/complete`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(completeCancelled.status).toBe(400);

    // Fresh hire to test block when submitted
    const second = await hireFlow('second');
    const add = await request(app)
      .post(`/api/v1/contracts/${second.contractId}/milestones`)
      .set('Authorization', `Bearer ${second.client.token}`)
      .send({
        title: 'Kickoff',
        description: 'Initial setup and repository scaffolding for the project.',
        amount: 900,
        dueDate: futureDue(),
      });
    const mid = add.body.data.contract.milestones[0].id as string;
    await request(app)
      .post(`/api/v1/contracts/${second.contractId}/milestones/${mid}/submit`)
      .set('Authorization', `Bearer ${second.freelancer.token}`)
      .send({ submissionNotes: 'Kickoff scaffolding is ready for your review now.' });

    const blockedOwner = await request(app)
      .post(`/api/v1/contracts/${second.contractId}/cancel`)
      .set('Authorization', `Bearer ${second.client.token}`)
      .send({ reason: 'Trying to cancel after submission should be rejected by rules.' });
    expect(blockedOwner.status).toBe(400);
  });

  it('supports reciprocal reviews after completion and updates ratings', async () => {
    const { client, freelancer, contractId } = await hireFlow();

    const added = await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({
        title: 'Delivery',
        description: 'Final delivery of the contracted dashboard work package.',
        amount: 900,
        dueDate: futureDue(),
      });
    expect(added.status).toBe(201);
    const milestoneId = added.body.data.contract.milestones[0].id as string;
    await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones/${milestoneId}/submit`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send({ submissionNotes: 'Final package is complete and ready for acceptance.' });
    await request(app)
      .post(`/api/v1/contracts/${contractId}/milestones/${milestoneId}/approve`)
      .set('Authorization', `Bearer ${client.token}`);
    await request(app)
      .patch(`/api/v1/contracts/${contractId}/complete`)
      .set('Authorization', `Bearer ${client.token}`);

    const earlyReview = await request(app)
      .post(`/api/v1/contracts/${contractId}/reviews`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ rating: 5, comment: 'Excellent communication and quality throughout.' });
    // already completed above — should succeed
    expect(earlyReview.status).toBe(201);

    const duplicate = await request(app)
      .post(`/api/v1/contracts/${contractId}/reviews`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ rating: 4, comment: 'Trying to leave a second review must fail uniquely.' });
    expect(duplicate.status).toBe(409);

    const badRating = await request(app)
      .post(`/api/v1/contracts/${contractId}/reviews`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send({ rating: 6, comment: 'This rating is invalid and should be rejected.' });
    expect(badRating.status).toBe(400);

    const freelancerReview = await request(app)
      .post(`/api/v1/contracts/${contractId}/reviews`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send({ rating: 5, comment: 'Clear requirements and fast feedback from the client.' });
    expect(freelancerReview.status).toBe(201);

    const publicReviews = await request(app).get(
      `/api/v1/freelancers/${freelancer.userId}/reviews`,
    );
    expect(publicReviews.status).toBe(200);
    expect(publicReviews.body.data.reviewCount).toBe(1);
    expect(publicReviews.body.data.averageRating).toBe(5);
    expect(publicReviews.body.data.reviews[0].comment).toContain('Excellent');
  });
});
