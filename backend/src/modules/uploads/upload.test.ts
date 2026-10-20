import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { RefreshSession } from '../auth/refresh-session.model';
import { User } from '../users/user.model';
import { Upload } from './upload.model';

/** Minimal valid 1x1 PNG */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('Uploads API', () => {
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
    await Promise.all([User.deleteMany({}), RefreshSession.deleteMany({}), Upload.deleteMany({})]);
  });

  async function register(email: string) {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Uploader User',
      email,
      password: 'Password1',
      role: 'freelancer',
      acceptTerms: true,
    });
    expect(res.status).toBe(201);
    return {
      token: res.body.data.accessToken as string,
      userId: res.body.data.user.id as string,
    };
  }

  it('accepts a valid avatar image and rejects garbage content', async () => {
    const user = await register('up@example.com');

    const ok = await request(app)
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${user.token}`)
      .field('purpose', 'avatar')
      .attach('file', PNG, { filename: 'avatar.png', contentType: 'image/png' });
    expect(ok.status).toBe(201);
    expect(ok.body.data.upload.purpose).toBe('avatar');
    expect(ok.body.data.upload.visibility).toBe('public');

    const content = await request(app).get(`/api/v1/uploads/${ok.body.data.upload.id}/content`);
    expect(content.status).toBe(200);
    expect(content.headers['content-type']).toMatch(/image\/png/);

    const bad = await request(app)
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${user.token}`)
      .field('purpose', 'avatar')
      .attach('file', Buffer.from('not-an-image'), { filename: 'x.exe', contentType: 'application/octet-stream' });
    expect(bad.status).toBe(400);
  });

  it('blocks private file access for unrelated users', async () => {
    const owner = await register('owner@example.com');
    const stranger = await register('stranger@example.com');

    const uploaded = await request(app)
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${owner.token}`)
      .field('purpose', 'milestone_deliverable')
      .attach('file', PNG, { filename: 'deliverable.png', contentType: 'image/png' });
    expect(uploaded.status).toBe(201);

    const denied = await request(app)
      .get(`/api/v1/uploads/${uploaded.body.data.upload.id}/content`)
      .set('Authorization', `Bearer ${stranger.token}`);
    expect(denied.status).toBe(403);

    const metaDenied = await request(app)
      .get(`/api/v1/uploads/${uploaded.body.data.upload.id}`)
      .set('Authorization', `Bearer ${stranger.token}`);
    expect(metaDenied.status).toBe(403);

    const allowed = await request(app)
      .get(`/api/v1/uploads/${uploaded.body.data.upload.id}/content`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(allowed.status).toBe(200);

    const metaAllowed = await request(app)
      .get(`/api/v1/uploads/${uploaded.body.data.upload.id}`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(metaAllowed.status).toBe(200);
  });
});
