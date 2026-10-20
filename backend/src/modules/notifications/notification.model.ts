import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import {
  NOTIFICATION_RESOURCE_TYPES,
  NOTIFICATION_TYPES,
  type NotificationResourceType,
  type NotificationType,
} from './notification.types';

export interface INotification {
  recipient: Types.ObjectId;
  actor?: Types.ObjectId | null;
  type: NotificationType;
  title: string;
  message: string;
  resourceType?: NotificationResourceType;
  resourceId?: Types.ObjectId;
  readAt?: Date | null;
  /** Optional unique key to prevent duplicate notifications for the same event. */
  dedupeKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationDocument extends INotification, Document {
  _id: Types.ObjectId;
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    resourceType: { type: String, enum: NOTIFICATION_RESOURCE_TYPES },
    resourceId: { type: Schema.Types.ObjectId },
    readAt: { type: Date, default: null },
    dedupeKey: { type: String, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
notificationSchema.index(
  { dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } },
);

export const Notification: Model<INotificationDocument> =
  mongoose.models.Notification ??
  mongoose.model<INotificationDocument>('Notification', notificationSchema);
