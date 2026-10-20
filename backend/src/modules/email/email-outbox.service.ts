import { sendMail } from '../../utils/email';
import { logger } from '../../utils/logger';
import { EmailOutbox } from './email-outbox.model';

/** How long a worker may hold a job in `processing` before another worker can reclaim it. */
const LEASE_MS = 5 * 60 * 1000;

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

export type QueueEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  dedupeKey?: string;
};

/**
 * Persist an outbound email after a business operation succeeds.
 * Delivery is handled asynchronously by processEmailOutbox / the worker.
 */
export async function queueEmail(input: QueueEmailInput): Promise<void> {
  try {
    if (input.dedupeKey) {
      const existing = await EmailOutbox.findOne({ dedupeKey: input.dedupeKey }).select('_id');
      if (existing) return;
    }
    await EmailOutbox.create({
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      dedupeKey: input.dedupeKey ?? null,
      status: 'pending',
      attempts: 0,
      maxAttempts: 5,
      scheduledAt: new Date(),
      leaseExpiresAt: null,
    });
  } catch (error) {
    if (isDuplicateKeyError(error) && input.dedupeKey) {
      return;
    }
    logger.error('Failed to enqueue email', {
      message: error instanceof Error ? error.message : String(error),
      subject: input.subject,
    });
  }
}

/**
 * Process pending outbox rows. Safe to call from a timer or CLI worker.
 *
 * Concurrency:
 * - Atomic claim via findOneAndUpdate (status must still be claimable).
 * - Stale `processing` leases (crash mid-send) become reclaimable after LEASE_MS.
 * - Does not mark sent until SMTP accepts the message.
 */
export async function processEmailOutbox(limit = 20): Promise<{ processed: number; sent: number }> {
  const now = new Date();
  const due = await EmailOutbox.find({
    $or: [
      {
        status: { $in: ['pending', 'failed'] },
        scheduledAt: { $lte: now },
        $expr: { $lt: ['$attempts', '$maxAttempts'] },
      },
      {
        status: 'processing',
        leaseExpiresAt: { $lte: now },
        $expr: { $lt: ['$attempts', '$maxAttempts'] },
      },
    ],
  })
    .sort({ scheduledAt: 1 })
    .limit(limit);

  let sent = 0;
  for (const job of due) {
    const leaseExpiresAt = new Date(Date.now() + LEASE_MS);
    const claimed = await EmailOutbox.findOneAndUpdate(
      {
        _id: job._id,
        $or: [
          { status: { $in: ['pending', 'failed'] } },
          { status: 'processing', leaseExpiresAt: { $lte: now } },
        ],
      },
      {
        $set: { status: 'processing', leaseExpiresAt },
        $inc: { attempts: 1 },
      },
      { returnDocument: 'after' },
    );
    if (!claimed) continue;

    const result = await sendMail({
      to: claimed.to,
      subject: claimed.subject,
      text: claimed.text,
      html: claimed.html,
    });

    if (result.delivered) {
      claimed.status = 'sent';
      claimed.sentAt = new Date();
      claimed.leaseExpiresAt = null;
      claimed.lastError = undefined;
      await claimed.save();
      sent += 1;
    } else {
      const attempts = claimed.attempts;
      const backoffMs = Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 30 * 60_000);
      claimed.status = attempts >= claimed.maxAttempts ? 'failed' : 'pending';
      claimed.lastError = 'SMTP unavailable or send failed';
      claimed.scheduledAt = new Date(Date.now() + backoffMs);
      claimed.leaseExpiresAt = null;
      await claimed.save();
    }
  }

  return { processed: due.length, sent };
}

let intervalHandle: NodeJS.Timeout | null = null;

/** Lightweight in-process worker for single-instance deploys (no Redis queue). */
export function startEmailOutboxWorker(intervalMs = 15_000): void {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    void processEmailOutbox().catch((error) => {
      logger.error('Email outbox worker error', {
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }, intervalMs);
  intervalHandle.unref?.();
}

export function stopEmailOutboxWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
