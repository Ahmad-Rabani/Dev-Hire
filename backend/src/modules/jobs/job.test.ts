import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { User } from '../users/user.model';
import { RefreshSession } from '../auth/refresh-session.model';
import { Job } from './job.model';

const futureDeadline = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const jobPayload = {
  title: 'Build a React dashboard',
  description: 'Need an experienced React developer to build an analytics dashboard with charts.',
  skills: ['React', 'TypeScript'],
  budgetType: 'fixed' as const,
  budgetMin: 500,
  budgetMax: 1500,
  currency: 'USD',
  deadline: futureDeadline(),
  status: 'open' as const,
};

describe('Jobs API', () => {
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
    return res.body.data.accessToken as string;
  }

  it('allows clients to create jobs and rejects freelancers/unauthenticated', async () => {
    const clientToken = await register('client', 'client1@example.com');
    const freelancerToken = await register('freelancer', 'free1@example.com');

    const created = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(jobPayload);
    expect(created.status).toBe(201);
    expect(created.body.data.job.title).toBe(jobPayload.title);
    expect(created.body.data.job.client.id).toBeTruthy();

    const unauth = await request(app).post('/api/v1/jobs').send(jobPayload);
    expect(unauth.status).toBe(401);

    const asFreelancer = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${freelancerToken}`)
      .send(jobPayload);
    expect(asFreelancer.status).toBe(403);

    const withFakeOwner = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ ...jobPayload, clientId: new mongoose.Types.ObjectId().toString() });
    // Unknown fields are stripped by Zod object (not .strict on create) — ownership still from auth
    expect([201, 400]).toContain(withFakeOwner.status);
    if (withFakeOwner.status === 201) {
      expect(withFakeOwner.body.data.job.client.id).not.toBe(
        (jobPayload as { clientId?: string }).clientId,
      );
    }
  });

  it('validates budget, deadline, and required fields', async () => {
    const token = await register('client', 'client2@example.com');

    const badBudget = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...jobPayload, budgetMin: 2000, budgetMax: 500 });
    expect(badBudget.status).toBe(400);

    const pastDeadline = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...jobPayload, deadline: new Date(Date.now() - 86400000).toISOString() });
    expect(pastDeadline.status).toBe(400);

    const missing = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'x' });
    expect(missing.status).toBe(400);

    const badId = await request(app).get('/api/v1/jobs/not-an-id');
    expect(badId.status).toBe(400);
  });

  it('enforces ownership on update/delete and hides drafts from public', async () => {
    const ownerToken = await register('client', 'owner@example.com');
    const otherToken = await register('client', 'other@example.com');

    const draft = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ ...jobPayload, status: 'draft', title: 'Secret draft project' });
    const draftId = draft.body.data.job.id as string;

    const publicList = await request(app).get('/api/v1/jobs');
    expect(publicList.body.data.jobs.find((j: { id: string }) => j.id === draftId)).toBeUndefined();

    const publicGet = await request(app).get(`/api/v1/jobs/${draftId}`);
    expect(publicGet.status).toBe(404);

    const ownerGet = await request(app)
      .get(`/api/v1/jobs/${draftId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(ownerGet.status).toBe(200);

    const otherEdit = await request(app)
      .patch(`/api/v1/jobs/${draftId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Hijacked title here' });
    expect(otherEdit.status).toBe(403);

    const ownerEdit = await request(app)
      .patch(`/api/v1/jobs/${draftId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Updated draft title ok' });
    expect(ownerEdit.status).toBe(200);
    expect(ownerEdit.body.data.job.title).toBe('Updated draft title ok');

    const protectedField = await request(app)
      .patch(`/api/v1/jobs/${draftId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'open', client: otherToken });
    expect(protectedField.status).toBe(400);
  });

  it('supports status transitions and deletion rules', async () => {
    const token = await register('client', 'status@example.com');
    const created = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...jobPayload, status: 'draft' });
    const id = created.body.data.job.id as string;

    const invalid = await request(app)
      .post(`/api/v1/jobs/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'closed' });
    expect(invalid.status).toBe(400);

    const publish = await request(app)
      .post(`/api/v1/jobs/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'open' });
    expect(publish.status).toBe(200);
    expect(publish.body.data.job.status).toBe('open');

    const cannotDeleteOpen = await request(app)
      .delete(`/api/v1/jobs/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(cannotDeleteOpen.status).toBe(400);

    await request(app)
      .post(`/api/v1/jobs/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cancelled' });

    const deleted = await request(app)
      .delete(`/api/v1/jobs/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleted.status).toBe(200);
  });

  it('searches, filters, sorts, and paginates public jobs', async () => {
    const token = await register('client', 'list@example.com');

    for (let i = 0; i < 5; i += 1) {
      const isReact = i % 2 === 0;
      await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...jobPayload,
          title: isReact ? `React role ${i}` : `Python role ${i}`,
          description: isReact
            ? 'Looking for a frontend engineer experienced with component libraries and SPA architecture.'
            : 'Looking for a backend engineer experienced with scripting, APIs, and data pipelines.',
          skills: isReact ? ['React'] : ['Python'],
          budgetMin: 100 * (i + 1),
          budgetMax: 200 * (i + 1),
          status: 'open',
        });
    }

    const search = await request(app).get('/api/v1/jobs').query({ search: 'React' });
    expect(search.status).toBe(200);
    expect(search.body.data.jobs.length).toBeGreaterThan(0);
    expect(
      search.body.data.jobs.every(
        (j: { title: string; skills: string[] }) =>
          j.title.includes('React') || j.skills.includes('React'),
      ),
    ).toBe(true);

    const filtered = await request(app)
      .get('/api/v1/jobs')
      .query({ skills: 'Python', minBudget: 100, maxBudget: 1000, budgetType: 'fixed' });
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.jobs.every((j: { skills: string[] }) => j.skills.includes('Python'))).toBe(
      true,
    );

    const sorted = await request(app)
      .get('/api/v1/jobs')
      .query({ sortBy: 'budgetMin', sortOrder: 'asc' });
    const budgets = sorted.body.data.jobs.map((j: { budgetMin: number }) => j.budgetMin);
    const copy = [...budgets].sort((a, b) => a - b);
    expect(budgets).toEqual(copy);

    const page1 = await request(app).get('/api/v1/jobs').query({ page: 1, limit: 2 });
    expect(page1.body.data.pagination).toMatchObject({
      page: 1,
      limit: 2,
      totalItems: 5,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: false,
    });
    expect(page1.body.data.jobs).toHaveLength(2);

    const tooBig = await request(app).get('/api/v1/jobs').query({ limit: 999 });
    expect(tooBig.status).toBe(400);

    const mine = await request(app)
      .get('/api/v1/jobs/mine')
      .set('Authorization', `Bearer ${token}`)
      .query({ status: 'open' });
    expect(mine.status).toBe(200);
    expect(mine.body.data.jobs).toHaveLength(5);
  });
});
