'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Select, Spin, Table } from 'antd';
import { useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { listAuditLogs } from '@/services/dashboard.service';
import type { AuditLogEntry } from '@/types/dashboard';

export function AdminAuditLogs() {
  const [action, setAction] = useState<string | undefined>();
  const [targetType, setTargetType] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({ action, targetType, page, limit: 20 }),
    [action, targetType, page],
  );

  const query = useQuery({
    queryKey: ['admin', 'audit-logs', params],
    queryFn: () => listAuditLogs(params),
  });

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
        <Select
          allowClear
          placeholder="Action"
          className="min-w-[200px]"
          value={action}
          onChange={(v) => {
            setAction(v);
            setPage(1);
          }}
          options={[
            'user.suspended',
            'user.reactivated',
            'job.hidden',
            'job.removed',
            'job.restored',
            'report.status_changed',
            'report.resolved',
            'report.dismissed',
          ].map((v) => ({ value: v, label: v }))}
        />
        <Select
          allowClear
          placeholder="Target type"
          className="w-40"
          value={targetType}
          onChange={(v) => {
            setTargetType(v);
            setPage(1);
          }}
          options={['user', 'job', 'report'].map((v) => ({ value: v, label: v }))}
        />
      </div>

      <Table<AuditLogEntry>
        rowKey="id"
        dataSource={data.logs}
        pagination={{
          current: data.pagination.page,
          pageSize: data.pagination.limit,
          total: data.pagination.totalItems,
          onChange: setPage,
        }}
        columns={[
          {
            title: 'When',
            dataIndex: 'createdAt',
            render: (v: string) => new Date(v).toLocaleString(),
          },
          {
            title: 'Actor',
            render: (_, row) => row.actor.name,
          },
          { title: 'Action', dataIndex: 'action' },
          {
            title: 'Target',
            render: (_, row) => `${row.targetType}:${row.targetId.slice(-6)}`,
          },
          { title: 'Summary', dataIndex: 'summary' },
        ]}
      />
    </div>
  );
}
