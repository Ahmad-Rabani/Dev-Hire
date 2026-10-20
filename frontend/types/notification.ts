export type NotificationType =
  | 'proposal.submitted'
  | 'proposal.accepted'
  | 'proposal.rejected'
  | 'contract.created'
  | 'contract.completed'
  | 'contract.cancelled'
  | 'milestone.submitted'
  | 'milestone.approved'
  | 'milestone.revision_requested'
  | 'review.received';

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
  actorId?: string;
  readAt?: string | null;
  createdAt: string;
};

export type NotificationListResult = {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};
