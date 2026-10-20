'use client';

import { App, Badge, Button, Empty, Popover, Spin } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/hooks/useNotifications';
import { getApiErrorMessage } from '@/lib/api-client';
import { notificationHref } from '@/lib/notification-links';
import { useAuthStore } from '@/stores/auth-store';

function BellIcon() {
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function NotificationBell() {
  const { message } = App.useApp();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const unreadQuery = useUnreadNotificationCount(true);
  const recentQuery = useNotifications({ page: 1, unreadOnly: false });
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const count = unreadQuery.data ?? 0;
  const items = recentQuery.data?.notifications.slice(0, 8) ?? [];

  const onOpen = async (id: string, href: string | null) => {
    try {
      await markOne.mutateAsync(id);
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
    if (href) router.push(href);
  };

  const content = (
    <div className="w-[min(100vw-2rem,22rem)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-800">Notifications</p>
        <Button
          type="link"
          size="small"
          disabled={count === 0}
          loading={markAll.isPending}
          onClick={() => {
            markAll.mutate(undefined, {
              onError: (error) => message.error(getApiErrorMessage(error)),
            });
          }}
        >
          Mark all read
        </Button>
      </div>

      {recentQuery.isLoading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : recentQuery.isError ? (
        <p className="py-4 text-sm text-red-600">{getApiErrorMessage(recentQuery.error)}</p>
      ) : items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notifications yet" />
      ) : (
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {items.map((n) => {
            const href = notificationHref(n, user?.role);
            const unread = !n.readAt;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  className={`w-full rounded-md px-2 py-2 text-left transition hover:bg-slate-50 ${
                    unread ? 'bg-teal-50/60' : ''
                  }`}
                  onClick={() => void onOpen(n.id, href)}
                >
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{n.message}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{formatWhen(n.createdAt)}</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-2 border-t border-slate-100 pt-2 text-center">
        <Link href="/notifications" className="text-sm text-teal-700 hover:underline">
          View all notifications
        </Link>
      </div>
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="bottomRight">
      <Badge count={count} overflowCount={99} size="small">
        <Button
          type="text"
          aria-label={count > 0 ? `${count} unread notifications` : 'Notifications'}
          icon={<BellIcon />}
        />
      </Badge>
    </Popover>
  );
}
