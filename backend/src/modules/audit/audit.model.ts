import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES, type AuditAction, type AuditTargetType } from './audit.types';

export interface IAuditLog {
  actor: Types.ObjectId;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: Types.ObjectId;
  reason?: string;
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuditLogDocument extends IAuditLog, Document {
  _id: Types.ObjectId;
}

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    targetType: { type: String, enum: AUDIT_TARGET_TYPES, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    reason: { type: String, trim: true, maxlength: 1000 },
    summary: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLogDocument> =
  mongoose.models.AuditLog ?? mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema);
