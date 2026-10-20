'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notification.service';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params: { page: number; unreadOnly: boolean }) =>
    [...notificationKeys.all, 'list', params] as const,
  unread: ['notifications', 'unread-count'] as const,
};

export function useNotifications(params: { page?: number; unreadOnly?: boolean } = {}) {
  const page = params.page ?? 1;
  const unreadOnly = params.unreadOnly ?? false;
  return useQuery({
    queryKey: notificationKeys.list({ page, unreadOnly }),
    queryFn: () => listNotifications({ page, limit: 20, unreadOnly }),
  });
}

export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: getUnreadNotificationCount,
    enabled,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
        queryClient.invalidateQueries({ queryKey: notificationKeys.unread }),
      ]);
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
        queryClient.invalidateQueries({ queryKey: notificationKeys.unread }),
      ]);
    },
  });
}
