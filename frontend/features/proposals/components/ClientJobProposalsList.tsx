'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Empty, Space, Spin, Table, Tag } from 'antd';
import Link from 'next/link';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  acceptProposal,
  listJobProposals,
  rejectProposal,
} from '@/services/proposals.service';
import type { Proposal, ProposalStatus } from '@/types/proposal';
import { formatDate } from '@/features/jobs/lib/format';

const STATUS_COLOR: Record<ProposalStatus, string> = {
  pending: 'processing',
  accepted: 'success',
  rejected: 'error',
  withdrawn: 'default',
};

type ClientJobProposalsListProps = {
  jobId: string;
};

export function ClientJobProposalsList({ jobId }: ClientJobProposalsListProps) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['proposals', 'job', jobId],
    queryFn: () => listJobProposals(jobId, { limit: 50 }),
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['proposals'] }),
      queryClient.invalidateQueries({ queryKey: ['jobs'] }),
      queryClient.invalidateQueries({ queryKey: ['contracts'] }),
    ]);
  };

  const acceptMutation = useMutation({
    mutationFn: acceptProposal,
    onSuccess: async (data) => {
      message.success({
        content: (
          <span>
            Proposal accepted —{' '}
            <Link href={`/contracts/${data.contract.id}`} className="underline">
              view contract
            </Link>
          </span>
        ),
        duration: 6,
      });
      await invalidate();
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const rejectMutation = useMutation({
    mutationFn: rejectProposal,
    onSuccess: async () => {
      message.success('Proposal rejected');
      await invalidate();
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
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

  if (!query.data?.proposals.length) {
    return <Empty description="No proposals yet for this job." />;
  }

  return (
    <Table
      rowKey="id"
      dataSource={query.data.proposals}
      expandable={{
        expandedRowRender: (row: Proposal) => (
          <p className="whitespace-pre-wrap text-slate-700">{row.coverLetter}</p>
        ),
      }}
      columns={[
        {
          title: 'Freelancer',
          render: (_: unknown, row: Proposal) => (
            <div>
              <Link
                href={`/freelancers/${row.freelancer.id}`}
                className="font-medium text-teal-800 hover:underline"
              >
                {row.freelancer.name}
              </Link>
              <p className="text-xs text-slate-500">
                {row.freelancer.professionalTitle || 'Freelancer'} · ★{' '}
                {row.freelancer.averageRating.toFixed(1)}
              </p>
            </div>
          ),
        },
        {
          title: 'Bid',
          dataIndex: 'bidAmount',
          render: (value: number) => `$${value}`,
        },
        {
          title: 'Delivery',
          dataIndex: 'deliveryDays',
          render: (value: number) => `${value} days`,
        },
        {
          title: 'Submitted',
          dataIndex: 'createdAt',
          render: (value: string) => formatDate(value),
        },
        {
          title: 'Status',
          dataIndex: 'status',
          render: (value: ProposalStatus) => <Tag color={STATUS_COLOR[value]}>{value}</Tag>,
        },
        {
          title: 'Actions',
          render: (_: unknown, row: Proposal) =>
            row.status === 'pending' ? (
              <Space>
                <Button
                  type="primary"
                  size="small"
                  loading={acceptMutation.isPending}
                  onClick={() =>
                    modal.confirm({
                      title: 'Accept this proposal?',
                      content:
                        'This creates a contract, marks the job in progress, and rejects other pending proposals.',
                      onOk: () => acceptMutation.mutateAsync(row.id),
                    })
                  }
                >
                  Accept
                </Button>
                <Button
                  size="small"
                  danger
                  loading={rejectMutation.isPending}
                  onClick={() =>
                    modal.confirm({
                      title: 'Reject this proposal?',
                      onOk: () => rejectMutation.mutateAsync(row.id),
                    })
                  }
                >
                  Reject
                </Button>
              </Space>
            ) : null,
        },
      ]}
    />
  );
}
