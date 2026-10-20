'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Input, Select, Space, Spin, Table, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { listAdminReports, updateAdminReportStatus } from '@/services/dashboard.service';
import type { AdminReport } from '@/types/dashboard';

export function AdminReportsManager() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string | undefined>('open');
  const [targetType, setTargetType] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({ status, targetType, page, limit: 10 }),
    [status, targetType, page],
  );

  const query = useQuery({
    queryKey: ['admin', 'reports', params],
    queryFn: () => listAdminReports(params),
  });

  const mutation = useMutation({
    mutationFn: ({
      id,
      next,
      note,
    }: {
      id: string;
      next: 'under_review' | 'resolved' | 'dismissed';
      note: string;
    }) => updateAdminReportStatus(id, { status: next, resolutionNote: note }),
    onSuccess: async () => {
      message.success('Report updated');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] }),
      ]);
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  function confirmUpdate(report: AdminReport, next: 'under_review' | 'resolved' | 'dismissed') {
    let note = '';
    modal.confirm({
      title: `Mark report as ${next}?`,
      content: (
        <Input.TextArea
          rows={3}
          placeholder="Resolution note"
          onChange={(e) => {
            note = e.target.value;
          }}
        />
      ),
      onOk: () => {
        if (note.trim().length < 5) {
          message.error('Resolution note must be at least 5 characters');
          return Promise.reject();
        }
        return mutation.mutateAsync({ id: report.id, next, note: note.trim() });
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
        <Select
          allowClear
          placeholder="Status"
          className="w-40"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={['open', 'under_review', 'resolved', 'dismissed'].map((v) => ({
            value: v,
            label: v,
          }))}
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
          options={['job', 'user', 'review'].map((v) => ({ value: v, label: v }))}
        />
      </div>

      <Table<AdminReport>
        rowKey="id"
        dataSource={data.reports}
        expandable={{
          expandedRowRender: (row) => (
            <div className="space-y-1 text-sm text-slate-700">
              <p>
                <strong>Reporter:</strong> {row.reporter.name} ({row.reporter.email})
              </p>
              <p>
                <strong>Target:</strong> {row.targetType} / {row.targetId}
              </p>
              <p>
                <strong>Explanation:</strong> {row.explanation}
              </p>
              {row.resolutionNote ? (
                <p>
                  <strong>Resolution:</strong> {row.resolutionNote}
                </p>
              ) : null}
            </div>
          ),
        }}
        pagination={{
          current: data.pagination.page,
          pageSize: data.pagination.limit,
          total: data.pagination.totalItems,
          onChange: setPage,
        }}
        columns={[
          { title: 'Category', dataIndex: 'category' },
          { title: 'Target', dataIndex: 'targetType' },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (s: string) => <Tag>{s}</Tag>,
          },
          {
            title: 'Created',
            dataIndex: 'createdAt',
            render: (v: string) => new Date(v).toLocaleDateString(),
          },
          {
            title: 'Actions',
            render: (_, row) =>
              row.status === 'resolved' || row.status === 'dismissed' ? null : (
                <Space wrap>
                  {row.status === 'open' ? (
                    <Button size="small" onClick={() => confirmUpdate(row, 'under_review')}>
                      Review
                    </Button>
                  ) : null}
                  <Button size="small" type="primary" onClick={() => confirmUpdate(row, 'resolved')}>
                    Resolve
                  </Button>
                  <Button size="small" onClick={() => confirmUpdate(row, 'dismissed')}>
                    Dismiss
                  </Button>
                </Space>
              ),
          },
        ]}
      />
    </div>
  );
}
