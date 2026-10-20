'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Input, Select, Space, Spin, Table, Tag } from 'antd';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { listAdminJobs, moderateAdminJob } from '@/services/dashboard.service';
import type { Job, JobModerationStatus, JobStatus } from '@/types/job';

type AdminJobRow = Job & { moderationReason?: string };

export function AdminJobsManager() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<JobStatus | undefined>();
  const [moderationStatus, setModerationStatus] = useState<JobModerationStatus | undefined>();
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({ search: search || undefined, status, moderationStatus, page, limit: 10 }),
    [search, status, moderationStatus, page],
  );

  const query = useQuery({
    queryKey: ['admin', 'jobs', params],
    queryFn: () => listAdminJobs(params),
  });

  const mutation = useMutation({
    mutationFn: ({
      id,
      moderationStatus: next,
      reason,
    }: {
      id: string;
      moderationStatus: JobModerationStatus;
      reason: string;
    }) => moderateAdminJob(id, { moderationStatus: next, reason }),
    onSuccess: async () => {
      message.success('Moderation updated');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] }),
        queryClient.invalidateQueries({ queryKey: ['jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] }),
      ]);
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  function confirmModeration(job: AdminJobRow, next: JobModerationStatus) {
    let reason = '';
    modal.confirm({
      title: `Set moderation to “${next}”?`,
      content: (
        <Input.TextArea
          rows={3}
          placeholder="Reason (required)"
          onChange={(e) => {
            reason = e.target.value;
          }}
        />
      ),
      onOk: () => {
        if (reason.trim().length < 10) {
          message.error('Reason must be at least 10 characters');
          return Promise.reject();
        }
        return mutation.mutateAsync({ id: job.id, moderationStatus: next, reason: reason.trim() });
      },
    });
  }

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }

  if (query.isError) {
    return <Alert type="error" showIcon message={getApiErrorMessage(query.error)} />;
  }

  const data = query.data!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input.Search
          placeholder="Search title"
          allowClear
          className="max-w-xs"
          onSearch={(v) => {
            setSearch(v.trim());
            setPage(1);
          }}
        />
        <Select
          allowClear
          placeholder="Lifecycle"
          className="w-40"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            'draft',
            'open',
            'paused',
            'in_progress',
            'closed',
            'cancelled',
          ].map((v) => ({ value: v, label: v }))}
        />
        <Select
          allowClear
          placeholder="Moderation"
          className="w-40"
          value={moderationStatus}
          onChange={(v) => {
            setModerationStatus(v);
            setPage(1);
          }}
          options={[
            { value: 'visible', label: 'Visible' },
            { value: 'hidden', label: 'Hidden' },
            { value: 'removed', label: 'Removed' },
          ]}
        />
      </div>

      <Table<AdminJobRow>
        rowKey="id"
        dataSource={data.jobs}
        pagination={{
          current: data.pagination.page,
          pageSize: data.pagination.limit,
          total: data.pagination.totalItems,
          onChange: setPage,
        }}
        columns={[
          {
            title: 'Title',
            dataIndex: 'title',
            render: (title: string, row) => (
              <Link href={`/jobs/${row.id}`} className="text-teal-800 hover:underline">
                {title}
              </Link>
            ),
          },
          {
            title: 'Lifecycle',
            dataIndex: 'status',
            render: (s: string) => <Tag>{s}</Tag>,
          },
          {
            title: 'Moderation',
            dataIndex: 'moderationStatus',
            render: (s: string) => <Tag color={s === 'visible' ? 'green' : 'orange'}>{s}</Tag>,
          },
          {
            title: 'Client',
            render: (_, row) => row.client?.name,
          },
          {
            title: 'Actions',
            render: (_, row) => (
              <Space wrap>
                {row.moderationStatus !== 'hidden' ? (
                  <Button size="small" onClick={() => confirmModeration(row, 'hidden')}>
                    Hide
                  </Button>
                ) : null}
                {row.moderationStatus !== 'removed' ? (
                  <Button size="small" danger onClick={() => confirmModeration(row, 'removed')}>
                    Remove
                  </Button>
                ) : null}
                {row.moderationStatus !== 'visible' ? (
                  <Button size="small" type="primary" onClick={() => confirmModeration(row, 'visible')}>
                    Restore
                  </Button>
                ) : null}
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
