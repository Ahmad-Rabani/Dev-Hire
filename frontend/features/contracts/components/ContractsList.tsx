'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Empty, Progress, Select, Spin, Table, Tag } from 'antd';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { listContracts } from '@/services/contracts.service';
import type { ContractDetail, ContractStatus } from '@/types/contract';
import { CONTRACT_STATUS_COLORS, formatDate, formatMoney } from '../lib/format';

type Role = 'client' | 'freelancer';

type Props = {
  role: Role;
};

export function ContractsList({ role }: Props) {
  const [status, setStatus] = useState<ContractStatus | undefined>();
  const [page, setPage] = useState(1);

  const params = useMemo(() => ({ status, page, limit: 10 }), [status, page]);

  const query = useQuery({
    queryKey: ['contracts', 'list', role, params],
    queryFn: () => listContracts(params),
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

  if (data.contracts.length === 0) {
    return (
      <div className="space-y-4">
        <Select
          allowClear
          placeholder="Filter by status"
          className="w-48"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <Empty description="No contracts yet" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Select
        allowClear
        placeholder="Filter by status"
        className="w-48"
        value={status}
        onChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' },
        ]}
      />

      <Table<ContractDetail>
        rowKey="id"
        dataSource={data.contracts}
        pagination={{
          current: data.pagination.page,
          pageSize: data.pagination.limit,
          total: data.pagination.totalItems,
          onChange: setPage,
        }}
        columns={[
          {
            title: 'Job',
            dataIndex: ['job', 'title'],
            render: (title: string, row) => (
              <Link href={`/contracts/${row.id}`} className="font-medium text-teal-800 hover:underline">
                {title}
              </Link>
            ),
          },
          {
            title: role === 'client' ? 'Freelancer' : 'Client',
            render: (_, row) => (role === 'client' ? row.freelancer.name : row.client.name),
          },
          {
            title: 'Amount',
            render: (_, row) => (
              <span>
                {formatMoney(row.amount)}
                <span className="ml-1 text-xs text-slate-500">({row.pricingType})</span>
              </span>
            ),
          },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (value: ContractStatus) => (
              <Tag color={CONTRACT_STATUS_COLORS[value]}>{value}</Tag>
            ),
          },
          {
            title: 'Progress',
            render: (_, row) => (
              <div className="min-w-[120px]">
                <Progress
                  percent={row.progress.percentComplete}
                  size="small"
                  format={() =>
                    `${row.progress.approvedMilestones}/${row.progress.totalMilestones}`
                  }
                />
              </div>
            ),
          },
          {
            title: 'Started',
            dataIndex: 'startDate',
            render: (value: string) => formatDate(value),
          },
        ]}
      />
    </div>
  );
}
