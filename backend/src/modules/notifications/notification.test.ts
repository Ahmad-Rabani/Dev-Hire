import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { RefreshSession } from '../auth/refresh-session.model';
import { Job } from '../jobs/job.model';
import { Proposal } from '../proposals/proposal.model';
import { User } from '../users/user.model';
import { EmailOutbox } from '../email/email-outbox.model';
import { Notification } from './notification.model';

const futureDeadline = () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

describe('Notifications API', () => {
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
      Notification.deleteMany({}),
      EmailOutbox.deleteMany({}),
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

  it('creates a notification for the client when a proposal is submitted', async () => {
    const client = await register('client', 'c@example.com');
    const freelancer = await register('freelancer', 'f@example.com');

    const jobRes = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${client.token}`)
      .send({
        title: 'Need notification-aware React work',
        description: 'Build features that trigger persistent notifications for the hiring client.',
        skills: ['React'],
        budgetType: 'fixed',
        budgetMin: 300,
        budgetMax: 600,
        currency: 'USD',
        deadline: futureDeadline(),
        status: 'open',
      });
    const jobId = jobRes.body.data.job.id as string;

    const proposal = await request(app)
      .post(`/api/v1/jobs/${jobId}/proposals`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send({
        coverLetter:
          'I can deliver this with clear milestones and communication throughout the project.',
        bidAmount: 450,
        deliveryDays: 10,
      });
    expect(proposal.status).toBe(201);

    const list = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${client.token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.notifications.length).toBeGreaterThanOrEqual(1);
    expect(list.body.data.notifications[0].type).toBe('proposal.submitted');

    const count = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${client.token}`);
    expect(count.body.data.count).toBeGreaterThanOrEqual(1);

    const other = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${freelancer.token}`);
    expect(other.body.data.notifications).toHaveLength(0);

    const mark = await request(app)
      .patch(`/api/v1/notifications/${list.body.data.notifications[0].id}/read`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(mark.status).toBe(200);
    expect(mark.body.data.notification.readAt).toBeTruthy();

    const forged = await request(app)
      .patch(`/api/v1/notifications/${list.body.data.notifications[0].id}/read`)
      .set('Authorization', `Bearer ${freelancer.token}`);
    expect(forged.status).toBe(403);

    expect(await EmailOutbox.countDocuments({})).toBeGreaterThanOrEqual(1);
  });
});
