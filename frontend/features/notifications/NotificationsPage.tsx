'use client';

import { Alert, App, Button, Checkbox, Empty, Pagination, Spin } from 'antd';
import Link from 'next/link';
import { useState } from 'react';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications';
import { getApiErrorMessage } from '@/lib/api-client';
import { notificationHref } from '@/lib/notification-links';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { useAuthStore } from '@/stores/auth-store';

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

function NotificationsContent() {
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const listQuery = useNotifications({ page, unreadOnly });
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  if (listQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }

  if (listQuery.isError) {
    return <Alert type="error" showIcon message={getApiErrorMessage(listQuery.error)} />;
  }

  const data = listQuery.data;
  const items = data?.notifications ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Checkbox
          checked={unreadOnly}
          onChange={(e) => {
            setUnreadOnly(e.target.checked);
            setPage(1);
          }}
        >
          Unread only
        </Checkbox>
        <Button
          disabled={!items.some((n) => !n.readAt) && (data?.pagination.totalItems ?? 0) === 0}
          loading={markAll.isPending}
          onClick={() =>
            markAll.mutate(undefined, {
              onSuccess: () => message.success('All notifications marked as read'),
              onError: (error) => message.error(getApiErrorMessage(error)),
            })
          }
        >
          Mark all as read
        </Button>
      </div>

      {items.length === 0 ? (
        <Empty description={unreadOnly ? 'No unread notifications' : 'No notifications yet'} />
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {items.map((n) => {
            const href = notificationHref(n, user?.role);
            const unread = !n.readAt;
            return (
              <li
                key={n.id}
                className={`flex flex-wrap items-start justify-between gap-3 px-4 py-3 ${
                  unread ? 'bg-teal-50/40' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{n.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatWhen(n.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {unread ? (
                    <Button
                      size="small"
                      loading={markOne.isPending}
                      onClick={() =>
                        markOne.mutate(n.id, {
                          onError: (error) => message.error(getApiErrorMessage(error)),
                        })
                      }
                    >
                      Mark read
                    </Button>
                  ) : null}
                  {href ? (
                    <Link href={href}>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => {
                          if (unread) {
                            markOne.mutate(n.id);
                          }
                        }}
                      >
                        Open
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(data?.pagination.totalPages ?? 0) > 1 ? (
        <div className="flex justify-center">
          <Pagination
            current={page}
            pageSize={data?.pagination.limit ?? 20}
            total={data?.pagination.totalItems ?? 0}
            onChange={setPage}
            showSizeChanger={false}
          />
        </div>
      ) : null}
    </div>
  );
}

export function NotificationsPage() {
  return (
    <RequireAuth>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Notifications</h1>
        <p className="mt-1 text-sm text-slate-600">
          Persistent alerts for proposals, contracts, milestones, and reviews.
        </p>
        <div className="mt-6">
          <NotificationsContent />
        </div>
      </div>
    </RequireAuth>
  );
}
