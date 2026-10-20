'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Empty, Spin, Table, Tag } from 'antd';
import Link from 'next/link';
import { getApiErrorMessage } from '@/lib/api-client';
import { listMyProposals, withdrawProposal } from '@/services/proposals.service';
import type { Proposal, ProposalStatus } from '@/types/proposal';
import { formatDate } from '@/features/jobs/lib/format';

const STATUS_COLOR: Record<ProposalStatus, string> = {
  pending: 'processing',
  accepted: 'success',
  rejected: 'error',
  withdrawn: 'default',
};

export function FreelancerProposalsList() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['proposals', 'mine'],
    queryFn: () => listMyProposals({ limit: 20 }),
  });

  const withdrawMutation = useMutation({
    mutationFn: withdrawProposal,
    onSuccess: async () => {
      message.success('Proposal withdrawn');
      await queryClient.invalidateQueries({ queryKey: ['proposals'] });
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
    return (
      <Empty description="You have not submitted any proposals yet.">
        <Link href="/jobs">
          <Button type="primary">Browse jobs</Button>
        </Link>
      </Empty>
    );
  }

  return (
    <Table
      rowKey="id"
      dataSource={query.data.proposals}
      pagination={false}
      columns={[
        {
          title: 'Job',
          render: (_: unknown, row: Proposal) => (
            <Link href={`/jobs/${row.job.id}`} className="text-teal-800 hover:underline">
              {row.job.title}
            </Link>
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
              <Button
                size="small"
                danger
                loading={withdrawMutation.isPending}
                onClick={() =>
                  modal.confirm({
                    title: 'Withdraw this proposal?',
                    content: 'You cannot re-apply to the same job after withdrawing.',
                    onOk: () => withdrawMutation.mutateAsync(row.id),
                  })
                }
              >
                Withdraw
              </Button>
            ) : null,
        },
      ]}
    />
  );
}
