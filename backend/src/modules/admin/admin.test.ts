import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { AuditLog } from '../audit/audit.model';
import { RefreshSession } from '../auth/refresh-session.model';
import { Contract } from '../contracts/contract.model';
import { Job } from '../jobs/job.model';
import { Proposal } from '../proposals/proposal.model';
import { Report } from '../reports/report.model';
import { Review } from '../reviews/review.model';
import { User } from '../users/user.model';
import { hashPassword } from '../../utils/password';

const futureDeadline = () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

describe('Dashboards, admin & reports API', () => {
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
      Report.deleteMany({}),
      AuditLog.deleteMany({}),
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

  async function createAdmin(email = 'admin@example.com') {
    const passwordHash = await hashPassword('Password1');
    const admin = await User.create({
      name: 'Ada Admin',
      email,
      passwordHash,
      role: 'admin',
      status: 'active',
      emailVerified: true,
    });
    const login = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'Password1',
    });
    expect(login.status).toBe(200);
    return {
      token: login.body.data.accessToken as string,
      userId: admin._id.toString(),
    };
  }

  it('returns role dashboards and blocks cross-role access', async () => {
    const client = await register('client', 'c@example.com');
    const freelancer = await register('freelancer', 'f@example.com');
    const admin = await createAdmin();

    const jobRes = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${client.token}`)
      .send({
        title: 'Analytics dashboard work',
        description: 'Build client metrics views with accurate aggregations from MongoDB.',
        skills: ['React'],
        budgetType: 'fixed',
        budgetMin: 400,
        budgetMax: 800,
        currency: 'USD',
        deadline: futureDeadline(),
        status: 'open',
      });
    expect(jobRes.status).toBe(201);

    const clientDash = await request(app)
      .get('/api/v1/client/dashboard')
      .set('Authorization', `Bearer ${client.token}`);
    expect(clientDash.status).toBe(200);
    expect(clientDash.body.data.stats.jobsTotal).toBe(1);
    expect(clientDash.body.data.stats.jobsOpen).toBe(1);

    const freelancerAsClient = await request(app)
      .get('/api/v1/client/dashboard')
      .set('Authorization', `Bearer ${freelancer.token}`);
    expect(freelancerAsClient.status).toBe(403);

    const freelancerDash = await request(app)
      .get('/api/v1/freelancer/dashboard')
      .set('Authorization', `Bearer ${freelancer.token}`);
    expect(freelancerDash.status).toBe(200);
    expect(freelancerDash.body.data.stats.proposalsTotal).toBe(0);

    const adminDash = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(adminDash.status).toBe(200);
    expect(adminDash.body.data.stats.usersTotal).toBeGreaterThanOrEqual(3);
    expect(adminDash.body.data.stats.jobsOpen).toBe(1);

    const clientAsAdmin = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${client.token}`);
    expect(clientAsAdmin.status).toBe(403);
  });

  it('lets admins suspend and reactivate users with audit + session enforcement', async () => {
    const client = await register('client', 'suspend-me@example.com');
    const admin = await createAdmin();
    const secondAdmin = await createAdmin('admin2@example.com');

    const selfSuspend = await request(app)
      .patch(`/api/v1/admin/users/${admin.userId}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'suspended', reason: 'Trying to suspend myself should be rejected.' });
    expect(selfSuspend.status).toBe(403);

    const suspend = await request(app)
      .patch(`/api/v1/admin/users/${client.userId}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'suspended', reason: 'Spam job postings violating platform guidelines.' });
    expect(suspend.status).toBe(200);
    expect(suspend.body.data.user.status).toBe('suspended');

    const blocked = await request(app)
      .get('/api/v1/client/dashboard')
      .set('Authorization', `Bearer ${client.token}`);
    expect(blocked.status).toBe(403);

    const audits = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(audits.status).toBe(200);
    expect(audits.body.data.logs.some((l: { action: string }) => l.action === 'user.suspended')).toBe(
      true,
    );

    const reactivate = await request(app)
      .patch(`/api/v1/admin/users/${client.userId}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'active' });
    expect(reactivate.status).toBe(200);

    // Suspend the extra admin so only one active admin remains, then assert last-admin guard.
    await request(app)
      .patch(`/api/v1/admin/users/${secondAdmin.userId}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'suspended', reason: 'Temporary leave — other admin remains active.' });

    const { updateUserStatus } = await import('./admin.service');
    await expect(
      updateUserStatus(client.userId, admin.userId, {
        status: 'suspended',
        reason: 'Service-level check: cannot remove the last active administrator.',
      }),
    ).rejects.toThrow(/last active administrator/i);
  });

  it('hides moderated jobs from public discovery and records audit', async () => {
    const client = await register('client', 'owner@example.com');
    const freelancer = await register('freelancer', 'seeker@example.com');
    const admin = await createAdmin();

    const jobRes = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${client.token}`)
      .send({
        title: 'Suspicious open listing',
        description: 'This job will be hidden by moderation while remaining open for the owner.',
        skills: ['Node'],
        budgetType: 'fixed',
        budgetMin: 200,
        budgetMax: 400,
        currency: 'USD',
        deadline: futureDeadline(),
        status: 'open',
      });
    const jobId = jobRes.body.data.job.id as string;

    const publicBefore = await request(app).get('/api/v1/jobs');
    expect(publicBefore.body.data.jobs.some((j: { id: string }) => j.id === jobId)).toBe(true);

    const hide = await request(app)
      .patch(`/api/v1/admin/jobs/${jobId}/moderation`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        moderationStatus: 'hidden',
        reason: 'Misleading claims about guaranteed employment outcomes.',
      });
    expect(hide.status).toBe(200);
    expect(hide.body.data.job.moderationStatus).toBe('hidden');

    const publicAfter = await request(app).get('/api/v1/jobs');
    expect(publicAfter.body.data.jobs.some((j: { id: string }) => j.id === jobId)).toBe(false);

    const publicDetail = await request(app).get(`/api/v1/jobs/${jobId}`);
    expect(publicDetail.status).toBe(404);

    const ownerDetail = await request(app)
      .get(`/api/v1/jobs/${jobId}`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(ownerDetail.status).toBe(200);

    const apply = await request(app)
      .post(`/api/v1/jobs/${jobId}/proposals`)
      .set('Authorization', `Bearer ${freelancer.token}`)
      .send({
        coverLetter: 'I would like to apply but this job should reject applications while hidden.',
        bidAmount: 300,
        deliveryDays: 10,
      });
    expect(apply.status).toBe(400);

    const restore = await request(app)
      .patch(`/api/v1/admin/jobs/${jobId}/moderation`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        moderationStatus: 'visible',
        reason: 'Owner corrected the listing after review.',
      });
    expect(restore.status).toBe(200);

    const nonAdmin = await request(app)
      .patch(`/api/v1/admin/jobs/${jobId}/moderation`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({
        moderationStatus: 'hidden',
        reason: 'Clients must not moderate jobs on the platform.',
      });
    expect(nonAdmin.status).toBe(403);
  });

  it('supports reporting and admin resolution with audit trail', async () => {
    const client = await register('client', 'reporter@example.com');
    const freelancer = await register('freelancer', 'target@example.com');
    const admin = await createAdmin();

    const report = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${client.token}`)
      .send({
        targetType: 'user',
        targetId: freelancer.userId,
        category: 'spam',
        explanation: 'This profile appears to be soliciting off-platform payments repeatedly.',
      });
    expect(report.status).toBe(201);

    const duplicate = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${client.token}`)
      .send({
        targetType: 'user',
        targetId: freelancer.userId,
        category: 'spam',
        explanation: 'Duplicate open report against the same user should be rejected.',
      });
    expect(duplicate.status).toBe(409);

    const listAsUser = await request(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${client.token}`);
    expect(listAsUser.status).toBe(403);

    const list = await request(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.reports).toHaveLength(1);
    const reportId = list.body.data.reports[0].id as string;

    const resolve = await request(app)
      .patch(`/api/v1/admin/reports/${reportId}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        status: 'resolved',
        resolutionNote: 'Reviewed profile; issued warning and closed the case.',
      });
    expect(resolve.status).toBe(200);
    expect(resolve.body.data.report.status).toBe('resolved');

    const logs = await AuditLog.find({ action: 'report.resolved' });
    expect(logs.length).toBe(1);
  });
});
