import { sendMail } from '../../utils/email';
import { logger } from '../../utils/logger';
import { EmailOutbox } from './email-outbox.model';

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
 * Does not mark sent until SMTP accepts the message (or SMTP is missing → failed with note).
 */
export async function processEmailOutbox(limit = 20): Promise<{ processed: number; sent: number }> {
  const due = await EmailOutbox.find({
    status: { $in: ['pending', 'failed'] },
    scheduledAt: { $lte: new Date() },
    $expr: { $lt: ['$attempts', '$maxAttempts'] },
  })
    .sort({ scheduledAt: 1 })
    .limit(limit);

  let sent = 0;
  for (const job of due) {
    const claimed = await EmailOutbox.findOneAndUpdate(
      { _id: job._id, status: { $in: ['pending', 'failed'] } },
      { $set: { status: 'processing' }, $inc: { attempts: 1 } },
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
      claimed.lastError = undefined;
      await claimed.save();
      sent += 1;
    } else {
      const attempts = claimed.attempts;
      const backoffMs = Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 30 * 60_000);
      claimed.status = attempts >= claimed.maxAttempts ? 'failed' : 'pending';
      claimed.lastError = 'SMTP unavailable or send failed';
      claimed.scheduledAt = new Date(Date.now() + backoffMs);
      await claimed.save();
    }
  }

  return { processed: due.length, sent };
}

let intervalHandle: NodeJS.Timeout | null = null;

/** Lightweight in-process worker for local/dev (no Redis). */
export function startEmailOutboxWorker(intervalMs = 15_000): void {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    void processEmailOutbox().catch((error) => {
      logger.error('Email outbox worker error', {
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }, intervalMs);
  // Don't keep process alive solely for the timer in tests.
  intervalHandle.unref?.();
}

export function stopEmailOutboxWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
