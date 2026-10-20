import { apiClient } from '@/lib/api-client';
import type { ApiSuccessResponse } from '@/types/api';
import type { Notification, NotificationListResult } from '@/types/notification';

export async function listNotifications(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<NotificationListResult> {
  const response = await apiClient.get<ApiSuccessResponse<NotificationListResult>>('/notifications', {
    params: {
      page: params?.page,
      limit: params?.limit,
      unreadOnly: params?.unreadOnly ? 'true' : undefined,
    },
  });
  return response.data.data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiClient.get<ApiSuccessResponse<{ count: number }>>(
    '/notifications/unread-count',
  );
  return response.data.data.count;
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const response = await apiClient.patch<ApiSuccessResponse<{ notification: Notification }>>(
    `/notifications/${id}/read`,
  );
  return response.data.data.notification;
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await apiClient.post<ApiSuccessResponse<{ modifiedCount: number }>>(
    '/notifications/read-all',
  );
  return response.data.data.modifiedCount;
}
