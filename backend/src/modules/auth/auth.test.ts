import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { User } from '../users/user.model';
import { RefreshSession } from './refresh-session.model';
import { hashPassword } from '../../utils/password';
import { REFRESH_COOKIE_NAME } from '../../utils/cookies';

describe('Auth API', () => {
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
    await Promise.all([User.deleteMany({}), RefreshSession.deleteMany({})]);
  });

  it('registers a client and returns access token without password hash', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Ada Client',
      email: 'ada@example.com',
      password: 'Password1',
      role: 'client',
      acceptTerms: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe('ada@example.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']?.join(';')).toContain(REFRESH_COOKIE_NAME);

    const stored = await User.findOne({ email: 'ada@example.com' }).select('+passwordHash');
    expect(stored?.passwordHash).toBeTruthy();
    expect(stored?.passwordHash).not.toBe('Password1');
  });

  it('rejects duplicate email and public admin registration', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'Password1',
      role: 'client',
      acceptTerms: true,
    });

    const dup = await request(app).post('/api/v1/auth/register').send({
      name: 'Ada 2',
      email: 'ADA@example.com',
      password: 'Password1',
      role: 'freelancer',
      acceptTerms: true,
    });
    expect(dup.status).toBe(409);

    const adminAttempt = await request(app).post('/api/v1/auth/register').send({
      name: 'Hacker',
      email: 'hack@example.com',
      password: 'Password1',
      role: 'admin',
      acceptTerms: true,
    });
    expect(adminAttempt.status).toBe(400);
  });

  it('logs in, refreshes with rotation, and logs out', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Sam Freelancer',
      email: 'sam@example.com',
      password: 'Password1',
      role: 'freelancer',
      acceptTerms: true,
    });

    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'sam@example.com',
      password: 'Password1',
    });
    expect(login.status).toBe(200);
    const cookie = login.headers['set-cookie'];
    expect(cookie).toBeTruthy();

    const refresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(refresh.status).toBe(200);
    expect(refresh.body.data.accessToken).toBeTruthy();
    const rotatedCookie = refresh.headers['set-cookie'];

    // Old refresh cookie should be rejected (reuse / revoked).
    const reuse = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(reuse.status).toBe(401);

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${refresh.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('sam@example.com');

    const logout = await request(app).post('/api/v1/auth/logout').set('Cookie', rotatedCookie);
    expect(logout.status).toBe(200);

    const afterLogout = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', rotatedCookie);
    expect(afterLogout.status).toBe(401);
  });

  it('rejects invalid credentials and suspended users', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Blocked',
      email: 'blocked@example.com',
      password: 'Password1',
      role: 'client',
      acceptTerms: true,
    });

    const bad = await request(app).post('/api/v1/auth/login').send({
      email: 'blocked@example.com',
      password: 'WrongPass1',
    });
    expect(bad.status).toBe(401);

    await User.updateOne({ email: 'blocked@example.com' }, { status: 'suspended' });
    const suspended = await request(app).post('/api/v1/auth/login').send({
      email: 'blocked@example.com',
      password: 'Password1',
    });
    expect(suspended.status).toBe(403);
  });

  it('protects profile endpoints and blocks protected field updates', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({
      name: 'Pat',
      email: 'pat@example.com',
      password: 'Password1',
      role: 'freelancer',
      acceptTerms: true,
    });
    const token = reg.body.data.accessToken as string;

    const unauth = await request(app).get('/api/v1/users/me');
    expect(unauth.status).toBe(401);

    const update = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Pat Updated',
        professionalTitle: 'React Developer',
        skills: ['React', 'TypeScript'],
        role: 'admin',
        averageRating: 5,
        status: 'suspended',
      });

    // .strict() schema should reject unknown keys like role/status/averageRating
    expect(update.status).toBe(400);

    const ok = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Pat Updated',
        professionalTitle: 'React Developer',
        skills: ['React', 'TypeScript'],
      });
    expect(ok.status).toBe(200);
    expect(ok.body.data.user.name).toBe('Pat Updated');
    expect(ok.body.data.user.role).toBe('freelancer');
    expect(ok.body.data.user.averageRating).toBe(0);

    const publicProfile = await request(app).get(
      `/api/v1/freelancers/${ok.body.data.user.id}`,
    );
    expect(publicProfile.status).toBe(200);
    expect(publicProfile.body.data.freelancer.email).toBeUndefined();
    expect(publicProfile.body.data.freelancer.status).toBeUndefined();
  });

  it('verifies email and resets password', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({
      name: 'Vera',
      email: 'vera@example.com',
      password: 'Password1',
      role: 'client',
      acceptTerms: true,
    });
    expect(reg.body.data.user.emailVerified).toBe(false);

    const user = await User.findOne({ email: 'vera@example.com' }).select(
      '+emailVerificationTokenHash +passwordResetTokenHash +passwordResetExpires',
    );
    expect(user).toBeTruthy();

    // Simulate known verification token by writing a controllable hash
    const { generateOpaqueToken, hashToken } = await import('../../utils/cryptoTokens');
    const verifyToken = generateOpaqueToken();
    user!.emailVerificationTokenHash = hashToken(verifyToken);
    user!.emailVerificationExpires = new Date(Date.now() + 60_000);
    await user!.save();

    const verified = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: verifyToken });
    expect(verified.status).toBe(200);
    expect(verified.body.data.user.emailVerified).toBe(true);

    const forgot = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'vera@example.com' });
    expect(forgot.status).toBe(200);

    const resetToken = generateOpaqueToken();
    await User.updateOne(
      { email: 'vera@example.com' },
      {
        passwordResetTokenHash: hashToken(resetToken),
        passwordResetExpires: new Date(Date.now() + 60_000),
      },
    );

    const reset = await request(app).post('/api/v1/auth/reset-password').send({
      token: resetToken,
      password: 'NewPass12',
    });
    expect(reset.status).toBe(200);

    const loginOld = await request(app).post('/api/v1/auth/login').send({
      email: 'vera@example.com',
      password: 'Password1',
    });
    expect(loginOld.status).toBe(401);

    const loginNew = await request(app).post('/api/v1/auth/login').send({
      email: 'vera@example.com',
      password: 'NewPass12',
    });
    expect(loginNew.status).toBe(200);
  });

  it('creates hashed passwords for seeded admins via model helpers', async () => {
    const passwordHash = await hashPassword('AdminPass1');
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      passwordHash,
      role: 'admin',
      status: 'active',
      emailVerified: true,
    });
    expect(admin.role).toBe('admin');
    expect(passwordHash).not.toBe('AdminPass1');
  });
});
