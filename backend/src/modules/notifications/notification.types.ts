export const NOTIFICATION_TYPES = [
  'proposal.submitted',
  'proposal.accepted',
  'proposal.rejected',
  'contract.created',
  'contract.completed',
  'contract.cancelled',
  'milestone.submitted',
  'milestone.approved',
  'milestone.revision_requested',
  'review.received',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_RESOURCE_TYPES = [
  'job',
  'proposal',
  'contract',
  'milestone',
  'review',
] as const;
export type NotificationResourceType = (typeof NOTIFICATION_RESOURCE_TYPES)[number];

export type PublicNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceType?: NotificationResourceType;
  resourceId?: string;
  actorId?: string;
  readAt?: string | null;
  createdAt: string;
};
