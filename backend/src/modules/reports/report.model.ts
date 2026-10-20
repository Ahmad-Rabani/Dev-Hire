import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import {
  REPORT_CATEGORIES,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  type ReportCategory,
  type ReportStatus,
  type ReportTargetType,
} from './report.types';

export interface IReport {
  reporter: Types.ObjectId;
  targetType: ReportTargetType;
  targetId: Types.ObjectId;
  category: ReportCategory;
  explanation: string;
  status: ReportStatus;
  resolutionNote?: string;
  resolvedBy?: Types.ObjectId | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReportDocument extends IReport, Document {
  _id: Types.ObjectId;
}

const reportSchema = new Schema<IReportDocument>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: REPORT_TARGET_TYPES, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    category: { type: String, enum: REPORT_CATEGORIES, required: true },
    explanation: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    status: { type: String, enum: REPORT_STATUSES, default: 'open' },
    resolutionNote: { type: String, trim: true, maxlength: 2000 },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
// Soft duplicate guard: same reporter + same target while still open
reportSchema.index(
  { reporter: 1, targetType: 1, targetId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['open', 'under_review'] } } },
);

export const Report: Model<IReportDocument> =
  mongoose.models.Report ?? mongoose.model<IReportDocument>('Report', reportSchema);
