import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IRefreshSession {
  user: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedBy?: Types.ObjectId | null;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRefreshSessionDocument extends IRefreshSession, Document {
  _id: Types.ObjectId;
}

const refreshSessionSchema = new Schema<IRefreshSessionDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedBy: { type: Schema.Types.ObjectId, ref: 'RefreshSession', default: null },
    userAgent: { type: String, maxlength: 512 },
    ip: { type: String, maxlength: 64 },
  },
  { timestamps: true },
);

refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshSession: Model<IRefreshSessionDocument> =
  mongoose.models.RefreshSession ??
  mongoose.model<IRefreshSessionDocument>('RefreshSession', refreshSessionSchema);
