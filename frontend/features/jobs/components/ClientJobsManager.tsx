'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Empty, Input, Select, Space, Spin, Table, Tag } from 'antd';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { changeJobStatus, deleteJob, listMyJobs } from '@/services/jobs.service';
import type { Job, JobStatus } from '@/types/job';
import { formatBudget, formatDate, JOB_STATUS_COLORS } from '../lib/format';

const NEXT_STATUS: Partial<Record<JobStatus, JobStatus[]>> = {
  draft: ['open', 'cancelled'],
  open: ['paused', 'closed', 'cancelled'],
  paused: ['open', 'closed', 'cancelled'],
};

export function ClientJobsManager() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<JobStatus | undefined>();
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({ search: search || undefined, status, page, limit: 10, sortBy: 'createdAt' as const }),
    [search, status, page],
  );

  const query = useQuery({
    queryKey: ['jobs', 'mine', params],
    queryFn: () => listMyJobs(params),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['jobs'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: JobStatus }) => changeJobStatus(id, next),
    onSuccess: async () => {
      message.success('Status updated');
      await invalidate();
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJob(id),
    onSuccess: async () => {
      message.success('Job deleted');
      await invalidate();
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  function confirmDelete(job: Job) {
    modal.confirm({
      title: 'Delete this job?',
      content: `“${job.title}” will be permanently removed. Only draft/cancelled jobs can be deleted.`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(job.id),
    });
  }

  function confirmStatus(job: Job, next: JobStatus) {
    modal.confirm({
      title: `Change status to “${next}”?`,
      content: `Current status: ${job.status}`,
      onOk: () => statusMutation.mutateAsync({ id: job.id, next }),
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input.Search
          placeholder="Search my jobs"
          allowClear
          onSearch={(value) => {
            setSearch(value.trim());
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Select
          allowClear
          placeholder="Status"
          className="min-w-36"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'open', label: 'Open' },
            { value: 'paused', label: 'Paused' },
            { value: 'closed', label: 'Closed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <Link href="/client/jobs/new" className="ml-auto">
          <Button type="primary">Post a job</Button>
        </Link>
      </div>

      {!query.data?.jobs.length ? (
        <Empty description="You have not posted any jobs yet.">
          <Link href="/client/jobs/new">
            <Button type="primary">Create your first job</Button>
          </Link>
        </Empty>
      ) : (
        <Table
          rowKey="id"
          dataSource={query.data.jobs}
          pagination={{
            current: query.data.pagination.page,
            pageSize: query.data.pagination.limit,
            total: query.data.pagination.totalItems,
            onChange: setPage,
          }}
          columns={[
            {
              title: 'Title',
              dataIndex: 'title',
              render: (title: string, job: Job) => (
                <Link href={`/jobs/${job.id}`} className="text-teal-800 hover:underline">
                  {title}
                </Link>
              ),
            },
            {
              title: 'Budget',
              render: (_: unknown, job: Job) => formatBudget(job),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (value: JobStatus) => <Tag color={JOB_STATUS_COLORS[value]}>{value}</Tag>,
            },
            {
              title: 'Created',
              dataIndex: 'createdAt',
              render: (value: string) => formatDate(value),
            },
            {
              title: 'Deadline',
              dataIndex: 'deadline',
              render: (value: string) => formatDate(value),
            },
            {
              title: 'Actions',
              render: (_: unknown, job: Job) => (
                <Space wrap size="small">
                  {['draft', 'open', 'paused'].includes(job.status) ? (
                    <Link href={`/client/jobs/${job.id}/edit`}>
                      <Button size="small">Edit</Button>
                    </Link>
                  ) : null}
                  {(NEXT_STATUS[job.status] ?? []).map((next) => (
                    <Button
                      key={next}
                      size="small"
                      onClick={() => confirmStatus(job, next)}
                      loading={statusMutation.isPending}
                    >
                      {next}
                    </Button>
                  ))}
                  {['draft', 'cancelled'].includes(job.status) ? (
                    <Button
                      size="small"
                      danger
                      onClick={() => confirmDelete(job)}
                      loading={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  ) : null}
                </Space>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
