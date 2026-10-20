import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export const EMAIL_OUTBOX_STATUSES = ['pending', 'processing', 'sent', 'failed'] as const;
export type EmailOutboxStatus = (typeof EMAIL_OUTBOX_STATUSES)[number];

export interface IEmailOutbox {
  to: string;
  subject: string;
  text: string;
  html?: string;
  status: EmailOutboxStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  dedupeKey?: string | null;
  scheduledAt: Date;
  /** When the current processing lease expires; stale leases can be reclaimed. */
  leaseExpiresAt?: Date | null;
  sentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailOutboxDocument extends IEmailOutbox, Document {
  _id: Types.ObjectId;
}

const emailOutboxSchema = new Schema<IEmailOutboxDocument>(
  {
    to: { type: String, required: true, trim: true, maxlength: 255 },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    text: { type: String, required: true, maxlength: 20_000 },
    html: { type: String, maxlength: 50_000 },
    status: { type: String, enum: EMAIL_OUTBOX_STATUSES, default: 'pending', index: true },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 5, min: 1 },
    lastError: { type: String, maxlength: 1000 },
    dedupeKey: { type: String, default: null },
    scheduledAt: { type: Date, default: () => new Date(), index: true },
    leaseExpiresAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

emailOutboxSchema.index(
  { dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } },
);
emailOutboxSchema.index({ status: 1, scheduledAt: 1 });

export const EmailOutbox: Model<IEmailOutboxDocument> =
  mongoose.models.EmailOutbox ??
  mongoose.model<IEmailOutboxDocument>('EmailOutbox', emailOutboxSchema);
