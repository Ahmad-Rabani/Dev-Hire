'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Input, Select, Spin, Table, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { listAdminUsers, updateAdminUserStatus } from '@/services/dashboard.service';
import type { AdminUser } from '@/types/dashboard';

export function AdminUsersManager() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({ search: search || undefined, role, status, page, limit: 10 }),
    [search, role, status, page],
  );

  const query = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => listAdminUsers(params),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      next,
      reason,
    }: {
      id: string;
      next: 'active' | 'suspended';
      reason?: string;
    }) => updateAdminUserStatus(id, { status: next, reason }),
    onSuccess: async () => {
      message.success('User status updated');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] }),
      ]);
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  function confirmStatus(user: AdminUser, next: 'active' | 'suspended') {
    if (next === 'suspended') {
      let reason = '';
      modal.confirm({
        title: `Suspend ${user.name}?`,
        content: (
          <Input.TextArea
            rows={3}
            placeholder="Reason (required, min 10 characters)"
            onChange={(e) => {
              reason = e.target.value;
            }}
          />
        ),
        okButtonProps: { danger: true },
        onOk: () => {
          if (reason.trim().length < 10) {
            message.error('Provide a suspension reason (at least 10 characters)');
            return Promise.reject();
          }
          return statusMutation.mutateAsync({ id: user.id, next, reason: reason.trim() });
        },
      });
      return;
    }

    modal.confirm({
      title: `Reactivate ${user.name}?`,
      onOk: () => statusMutation.mutateAsync({ id: user.id, next }),
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
          placeholder="Search name or email"
          allowClear
          className="max-w-xs"
          onSearch={(value) => {
            setSearch(value.trim());
            setPage(1);
          }}
        />
        <Select
          allowClear
          placeholder="Role"
          className="w-36"
          value={role}
          onChange={(v) => {
            setRole(v);
            setPage(1);
          }}
          options={[
            { value: 'client', label: 'Client' },
            { value: 'freelancer', label: 'Freelancer' },
            { value: 'admin', label: 'Admin' },
          ]}
        />
        <Select
          allowClear
          placeholder="Status"
          className="w-36"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'suspended', label: 'Suspended' },
          ]}
        />
      </div>

      <Table<AdminUser>
        rowKey="id"
        dataSource={data.users}
        pagination={{
          current: data.pagination.page,
          pageSize: data.pagination.limit,
          total: data.pagination.totalItems,
          onChange: setPage,
        }}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Role', dataIndex: 'role' },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (s: string) => (
              <Tag color={s === 'active' ? 'green' : 'red'}>{s}</Tag>
            ),
          },
          {
            title: 'Verified',
            dataIndex: 'emailVerified',
            render: (v: boolean) => (v ? 'Yes' : 'No'),
          },
          {
            title: 'Joined',
            dataIndex: 'createdAt',
            render: (v: string) => new Date(v).toLocaleDateString(),
          },
          {
            title: 'Actions',
            render: (_, row) =>
              row.status === 'active' ? (
                <Button size="small" danger onClick={() => confirmStatus(row, 'suspended')}>
                  Suspend
                </Button>
              ) : (
                <Button size="small" type="primary" onClick={() => confirmStatus(row, 'active')}>
                  Reactivate
                </Button>
              ),
          },
        ]}
      />
    </div>
  );
}
