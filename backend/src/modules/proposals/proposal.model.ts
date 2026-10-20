import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import { PROPOSAL_STATUSES, type ProposalStatus } from './proposal.types';

export interface IProposal {
  job: Types.ObjectId;
  freelancer: Types.ObjectId;
  coverLetter: string;
  bidAmount: number;
  deliveryDays: number;
  status: ProposalStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProposalDocument extends IProposal, Document {
  _id: Types.ObjectId;
}

const proposalSchema = new Schema<IProposalDocument>(
  {
    job: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    freelancer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coverLetter: { type: String, required: true, trim: true, maxlength: 5000 },
    bidAmount: { type: Number, required: true, min: 1, max: 1_000_000 },
    deliveryDays: { type: Number, required: true, min: 1, max: 365 },
    status: { type: String, enum: PROPOSAL_STATUSES, default: 'pending' },
  },
  { timestamps: true },
);

// One application per freelancer per job (including concurrent requests).
proposalSchema.index({ job: 1, freelancer: 1 }, { unique: true });

// At most one accepted proposal per job (partial unique index).
proposalSchema.index(
  { job: 1 },
  { unique: true, partialFilterExpression: { status: 'accepted' } },
);

proposalSchema.index({ freelancer: 1, createdAt: -1 });
proposalSchema.index({ job: 1, status: 1, createdAt: -1 });

export const Proposal: Model<IProposalDocument> =
  mongoose.models.Proposal ?? mongoose.model<IProposalDocument>('Proposal', proposalSchema);
