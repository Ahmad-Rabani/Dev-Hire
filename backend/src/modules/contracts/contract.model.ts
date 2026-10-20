import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import { BUDGET_TYPES, type BudgetType } from '../jobs/job.types';
import {
  CONTRACT_STATUSES,
  MILESTONE_STATUSES,
  type ContractStatus,
  type MilestoneStatus,
} from './contract.types';

export type IMilestone = {
  _id: Types.ObjectId;
  title: string;
  description: string;
  amount: number;
  dueDate: Date;
  status: MilestoneStatus;
  submissionNotes?: string;
  deliverableUrl?: string;
  deliverableUploadIds?: Types.ObjectId[];
  submittedAt?: Date;
  revisionFeedback?: string;
  revisionRequestedAt?: Date;
  approvedAt?: Date;
};

export interface IContract {
  job: Types.ObjectId;
  client: Types.ObjectId;
  freelancer: Types.ObjectId;
  proposal: Types.ObjectId;
  amount: number;
  pricingType: BudgetType;
  status: ContractStatus;
  startDate: Date;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  cancelReason?: string;
  milestones: Types.DocumentArray<IMilestone>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContractDocument extends IContract, Document {
  _id: Types.ObjectId;
}

const milestoneSchema = new Schema<IMilestone>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    amount: { type: Number, required: true, min: 0, max: 1_000_000 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: MILESTONE_STATUSES, default: 'pending' },
    submissionNotes: { type: String, trim: true, maxlength: 5000 },
    deliverableUrl: { type: String, trim: true, maxlength: 500 },
    deliverableUploadIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Upload' }],
      default: [],
      validate: {
        validator: (ids: Types.ObjectId[]) => ids.length <= 5,
        message: 'A maximum of 5 deliverable files is allowed',
      },
    },
    submittedAt: { type: Date },
    revisionFeedback: { type: String, trim: true, maxlength: 2000 },
    revisionRequestedAt: { type: Date },
    approvedAt: { type: Date },
  },
  { _id: true },
);

/**
 * Contract created on proposal acceptance (Phase 4).
 * Phase 5 adds embedded milestones and completion/cancellation fields.
 */
const contractSchema = new Schema<IContractDocument>(
  {
    job: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    client: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    freelancer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    proposal: { type: Schema.Types.ObjectId, ref: 'Proposal', required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    pricingType: { type: String, enum: BUDGET_TYPES, default: 'fixed' },
    status: { type: String, enum: CONTRACT_STATUSES, default: 'active' },
    startDate: { type: Date, required: true, default: () => new Date() },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, trim: true, maxlength: 1000 },
    milestones: { type: [milestoneSchema], default: [] },
  },
  { timestamps: true },
);

contractSchema.index({ job: 1 }, { unique: true });
contractSchema.index({ client: 1, status: 1, createdAt: -1 });
contractSchema.index({ freelancer: 1, status: 1, createdAt: -1 });

export const Contract: Model<IContractDocument> =
  mongoose.models.Contract ?? mongoose.model<IContractDocument>('Contract', contractSchema);
