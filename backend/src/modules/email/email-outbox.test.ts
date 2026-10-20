import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailOutbox } from './email-outbox.model';
import { processEmailOutbox, queueEmail } from './email-outbox.service';

vi.mock('../../utils/email', () => ({
  sendMail: vi.fn(async () => ({ delivered: true })),
}));

import { sendMail } from '../../utils/email';

describe('Email outbox', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await EmailOutbox.deleteMany({});
    vi.mocked(sendMail).mockClear();
    vi.mocked(sendMail).mockResolvedValue({ delivered: true });
  });

  it('queues and sends with dedupe, without marking sent before delivery', async () => {
    await queueEmail({
      to: 'a@example.com',
      subject: 'Hello',
      text: 'Body',
      dedupeKey: 'test:hello',
    });
    await queueEmail({
      to: 'a@example.com',
      subject: 'Hello',
      text: 'Body',
      dedupeKey: 'test:hello',
    });

    expect(await EmailOutbox.countDocuments()).toBe(1);

    const result = await processEmailOutbox();
    expect(result.sent).toBe(1);
    expect(sendMail).toHaveBeenCalledTimes(1);

    const row = await EmailOutbox.findOne({ dedupeKey: 'test:hello' });
    expect(row?.status).toBe('sent');
    expect(row?.sentAt).toBeTruthy();
  });

  it('reclaims a stale processing lease after crash simulation', async () => {
    const stuck = await EmailOutbox.create({
      to: 'b@example.com',
      subject: 'Stuck',
      text: 'Body',
      status: 'processing',
      attempts: 1,
      maxAttempts: 5,
      scheduledAt: new Date(Date.now() - 60_000),
      leaseExpiresAt: new Date(Date.now() - 1000),
    });

    const result = await processEmailOutbox();
    expect(result.sent).toBe(1);

    const row = await EmailOutbox.findById(stuck._id);
    expect(row?.status).toBe('sent');
  });

  it('retries when SMTP fails and keeps status pending under maxAttempts', async () => {
    vi.mocked(sendMail).mockResolvedValue({ delivered: false });
    await queueEmail({
      to: 'c@example.com',
      subject: 'Fail',
      text: 'Body',
      dedupeKey: 'test:fail',
    });

    const result = await processEmailOutbox();
    expect(result.sent).toBe(0);

    const row = await EmailOutbox.findOne({ dedupeKey: 'test:fail' });
    expect(row?.status).toBe('pending');
    expect(row?.attempts).toBe(1);
    expect(row?.lastError).toBeTruthy();
  });
});
