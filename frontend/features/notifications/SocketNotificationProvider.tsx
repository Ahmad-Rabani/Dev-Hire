'use client';

import { App } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { notificationKeys } from '@/hooks/useNotifications';
import { notificationHref } from '@/lib/notification-links';
import { SOCKET_URL } from '@/lib/env';
import { useAuthStore } from '@/stores/auth-store';
import type { Notification } from '@/types/notification';

type SocketNotificationProviderProps = {
  children: ReactNode;
};

/**
 * One shared Socket.IO connection for the authenticated session.
 * MongoDB remains the source of truth; the socket only pushes live updates.
 */
export function SocketNotificationProvider({ children }: SocketNotificationProviderProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || !accessToken) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = io(SOCKET_URL, {
      autoConnect: true,
      auth: { token: accessToken },
      // Never put the access token in the query string.
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    const onNew = (payload: { notification?: Notification }) => {
      const notification = payload?.notification;
      if (!notification) return;

      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unread });

      const href = notificationHref(notification, user?.role);
      message.info({
        content: href ? (
          <a href={href} className="text-teal-800 underline">
            {notification.title}: {notification.message}
          </a>
        ) : (
          `${notification.title}: ${notification.message}`
        ),
        duration: 5,
      });
    };

    socket.on('notification:new', onNew);
    socket.on('connect_error', () => {
      // Offline users still have REST notifications — do not spam toasts.
    });

    return () => {
      socket.off('notification:new', onNew);
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [accessToken, status, message, queryClient, user?.role]);

  return children;
}
