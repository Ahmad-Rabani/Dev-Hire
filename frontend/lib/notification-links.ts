import type { Notification } from '@/types/notification';
import type { UserRole } from '@/types/user';

/**
 * Map a notification resource to an in-app route.
 * Destination pages still enforce their own authorization.
 */
export function notificationHref(
  notification: Notification,
  role?: UserRole,
): string | null {
  const { resourceType, resourceId } = notification;
  if (!resourceType || !resourceId) return null;

  switch (resourceType) {
    case 'contract':
      return `/contracts/${resourceId}`;
    case 'job':
      if (role === 'client') return `/client/jobs/${resourceId}/proposals`;
      return `/jobs/${resourceId}`;
    case 'proposal':
      if (role === 'freelancer') return '/freelancer/proposals';
      if (role === 'client') return '/client/jobs';
      return null;
    case 'milestone':
      return `/contracts/${resourceId}`;
    case 'review':
      return role === 'freelancer' ? '/freelancer/dashboard' : '/client/dashboard';
    default:
      return null;
  }
}
