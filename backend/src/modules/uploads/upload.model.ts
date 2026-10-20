import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import {
  UPLOAD_PURPOSES,
  UPLOAD_VISIBILITIES,
  type UploadPurpose,
  type UploadVisibility,
} from './upload.types';

export interface IUpload {
  owner: Types.ObjectId;
  purpose: UploadPurpose;
  visibility: UploadVisibility;
  storageKey: string;
  originalName: string;
  mimeType: string;
  size: number;
  resourceType?: string;
  resourceId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUploadDocument extends IUpload, Document {
  _id: Types.ObjectId;
}

const uploadSchema = new Schema<IUploadDocument>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purpose: { type: String, enum: UPLOAD_PURPOSES, required: true },
    visibility: { type: String, enum: UPLOAD_VISIBILITIES, required: true },
    storageKey: { type: String, required: true, unique: true },
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
    mimeType: { type: String, required: true, maxlength: 120 },
    size: { type: Number, required: true, min: 1 },
    resourceType: { type: String, trim: true, maxlength: 40 },
    resourceId: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);

uploadSchema.index({ owner: 1, purpose: 1, createdAt: -1 });

export const Upload: Model<IUploadDocument> =
  mongoose.models.Upload ?? mongoose.model<IUploadDocument>('Upload', uploadSchema);
