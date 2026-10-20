import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import {
  BUDGET_TYPES,
  JOB_MODERATION_STATUSES,
  JOB_STATUSES,
  type BudgetType,
  type JobModerationStatus,
  type JobStatus,
} from './job.types';

export interface IJob {
  title: string;
  description: string;
  skills: string[];
  budgetType: BudgetType;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  deadline: Date;
  status: JobStatus;
  moderationStatus: JobModerationStatus;
  moderationReason?: string;
  moderatedAt?: Date | null;
  moderatedBy?: Types.ObjectId | null;
  client: Types.ObjectId;
  /** Private job brief attachments (Upload ids). */
  attachmentUploadIds?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IJobDocument extends IJob, Document {
  _id: Types.ObjectId;
}

const jobSchema = new Schema<IJobDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (skills: string[]) => skills.length >= 1 && skills.length <= 20,
        message: 'Provide between 1 and 20 skills',
      },
    },
    budgetType: { type: String, enum: BUDGET_TYPES, required: true },
    budgetMin: { type: Number, required: true, min: 0, max: 1_000_000 },
    budgetMax: { type: Number, required: true, min: 0, max: 1_000_000 },
    currency: { type: String, default: 'USD', uppercase: true, maxlength: 3 },
    deadline: { type: Date, required: true },
    status: { type: String, enum: JOB_STATUSES, default: 'draft' },
    moderationStatus: {
      type: String,
      enum: JOB_MODERATION_STATUSES,
      default: 'visible',
      index: true,
    },
    moderationReason: { type: String, trim: true, maxlength: 1000 },
    moderatedAt: { type: Date, default: null },
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    client: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    attachmentUploadIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Upload' }],
      default: [],
      validate: {
        validator: (ids: Types.ObjectId[]) => ids.length <= 5,
        message: 'A job may have at most 5 attachments',
      },
    },
  },
  { timestamps: true },
);

jobSchema.pre('validate', function ensureBudgetRange() {
  // Mongoose 9 document hooks are sync/async — do not expect a `next` callback.
  if (this.budgetMin > this.budgetMax) {
    this.invalidate('budgetMin', 'Minimum budget cannot exceed maximum budget');
  }
});

// Public listing: open + visible jobs newest-first
jobSchema.index({ status: 1, moderationStatus: 1, createdAt: -1 });
// Client dashboard: ownership + status/date
jobSchema.index({ client: 1, status: 1, createdAt: -1 });
// Budget filters / sort
jobSchema.index({ status: 1, budgetMin: 1, budgetMax: 1 });
jobSchema.index({ status: 1, deadline: 1 });
// Admin moderation queue
jobSchema.index({ moderationStatus: 1, updatedAt: -1 });
// Text search across title/description; skills matched separately via $in
jobSchema.index({ title: 'text', description: 'text' });

export const Job: Model<IJobDocument> =
  mongoose.models.Job ?? mongoose.model<IJobDocument>('Job', jobSchema);
