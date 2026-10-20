import { forbidden, notFound } from '../../utils/AppError';
import { emitNotificationToUser } from '../../realtime/socket';
import { logger } from '../../utils/logger';
import { Notification } from './notification.model';
import type {
  NotificationResourceType,
  NotificationType,
  PublicNotification,
} from './notification.types';

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

export function toPublicNotification(doc: {
  _id: { toString(): string };
  type: NotificationType;
  title: string;
  message: string;
  resourceType?: NotificationResourceType;
  resourceId?: { toString(): string };
  actor?: { toString(): string } | null;
  readAt?: Date | null;
  createdAt: Date;
}): PublicNotification {
  return {
    id: doc._id.toString(),
    type: doc.type,
    title: doc.title,
    message: doc.message,
    resourceType: doc.resourceType,
    resourceId: doc.resourceId?.toString(),
    actorId: doc.actor ? doc.actor.toString() : undefined,
    readAt: doc.readAt ? doc.readAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
  };
}

export type CreateNotificationInput = {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceType?: NotificationResourceType;
  resourceId?: string;
  dedupeKey?: string;
};

/**
 * Persist a notification, then emit over Socket.IO if the recipient is online.
 * Never throws for socket failures. Duplicate dedupeKey is treated as success (idempotent).
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<PublicNotification | null> {
  try {
    const doc = await Notification.create({
      recipient: input.recipientId,
      actor: input.actorId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      dedupeKey: input.dedupeKey ?? null,
      readAt: null,
    });

    const publicNotification = toPublicNotification(doc);
    try {
      emitNotificationToUser(input.recipientId, publicNotification);
    } catch (error) {
      logger.warn('Socket emit failed (notification still stored)', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return publicNotification;
  } catch (error) {
    if (isDuplicateKeyError(error) && input.dedupeKey) {
      const existing = await Notification.findOne({ dedupeKey: input.dedupeKey });
      return existing ? toPublicNotification(existing) : null;
    }
    logger.error('Failed to create notification', {
      message: error instanceof Error ? error.message : String(error),
      type: input.type,
    });
    return null;
  }
}

function paginationMeta(page: number, limit: number, totalItems: number) {
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}

export async function listMyNotifications(
  userId: string,
  query: { unreadOnly?: boolean; page: number; limit: number },
): Promise<{
  notifications: PublicNotification[];
  pagination: ReturnType<typeof paginationMeta>;
}> {
  const filter: Record<string, unknown> = { recipient: userId };
  if (query.unreadOnly) {
    filter.readAt = null;
  }

  const skip = (query.page - 1) * query.limit;
  const [docs, totalItems] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Notification.countDocuments(filter),
  ]);

  return {
    notifications: docs.map(toPublicNotification),
    pagination: paginationMeta(query.page, query.limit, totalItems),
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return Notification.countDocuments({ recipient: userId, readAt: null });
}

export async function markAsRead(
  userId: string,
  notificationId: string,
): Promise<PublicNotification> {
  const doc = await Notification.findById(notificationId);
  if (!doc) {
    throw notFound('Notification not found');
  }
  if (doc.recipient.toString() !== userId) {
    throw forbidden('You do not have access to this notification');
  }

  if (!doc.readAt) {
    doc.readAt = new Date();
    await doc.save();
  }
  return toPublicNotification(doc);
}

export async function markAllAsRead(userId: string): Promise<{ updated: number }> {
  const result = await Notification.updateMany(
    { recipient: userId, readAt: null },
    { $set: { readAt: new Date() } },
  );
  return { updated: result.modifiedCount };
}
