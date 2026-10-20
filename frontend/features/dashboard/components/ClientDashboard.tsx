'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Spin, Table, Tag } from 'antd';
import Link from 'next/link';
import { getApiErrorMessage } from '@/lib/api-client';
import { getClientDashboard } from '@/services/dashboard.service';
import { StatCard } from './StatCard';

export function ClientDashboard() {
  const query = useQuery({
    queryKey: ['dashboard', 'client'],
    queryFn: getClientDashboard,
  });

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return <Alert type="error" showIcon message={getApiErrorMessage(query.error)} />;
  }

  const { stats, recentJobs, recentProposals, recentContracts } = query.data;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total jobs" value={stats.jobsTotal} href="/client/jobs" />
        <StatCard label="Open jobs" value={stats.jobsOpen} href="/client/jobs" />
        <StatCard label="In progress" value={stats.jobsInProgress} href="/client/jobs" />
        <StatCard label="Pending proposals" value={stats.proposalsPending} href="/client/jobs" />
        <StatCard label="Active contracts" value={stats.contractsActive} href="/client/contracts" />
        <StatCard
          label="Completed contracts"
          value={stats.contractsCompleted}
          href="/client/contracts"
        />
        <StatCard label="Closed jobs" value={stats.jobsClosed} href="/client/jobs" />
        <StatCard label="Cancelled jobs" value={stats.jobsCancelled} href="/client/jobs" />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium text-slate-900">Recent jobs</h2>
        {recentJobs.length === 0 ? (
          <p className="text-sm text-slate-500">
            No jobs yet.{' '}
            <Link href="/client/jobs/new" className="text-teal-700 hover:underline">
              Post a job
            </Link>
          </p>
        ) : (
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={recentJobs}
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
                title: 'Status',
                dataIndex: 'status',
                render: (s: string) => <Tag>{s}</Tag>,
              },
              {
                title: 'Created',
                dataIndex: 'createdAt',
                render: (v: string) => new Date(v).toLocaleDateString(),
              },
            ]}
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-slate-900">Recent proposals</h2>
        {recentProposals.length === 0 ? (
          <p className="text-sm text-slate-500">No proposals on your jobs yet.</p>
        ) : (
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={recentProposals}
            columns={[
              {
                title: 'Job',
                dataIndex: 'jobTitle',
                render: (title: string, row) => (
                  <Link
                    href={`/client/jobs/${row.jobId}/proposals`}
                    className="text-teal-800 hover:underline"
                  >
                    {title}
                  </Link>
                ),
              },
              { title: 'Freelancer', dataIndex: 'freelancerName' },
              {
                title: 'Bid',
                dataIndex: 'bidAmount',
                render: (v: number) => `$${v}`,
              },
              {
                title: 'Status',
                dataIndex: 'status',
                render: (s: string) => <Tag>{s}</Tag>,
              },
            ]}
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-slate-900">Recent contracts</h2>
        {recentContracts.length === 0 ? (
          <p className="text-sm text-slate-500">No contracts yet.</p>
        ) : (
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={recentContracts}
            columns={[
              {
                title: 'Job',
                dataIndex: 'jobTitle',
                render: (title: string, row) => (
                  <Link href={`/contracts/${row.id}`} className="text-teal-800 hover:underline">
                    {title}
                  </Link>
                ),
              },
              { title: 'Freelancer', dataIndex: 'freelancerName' },
              {
                title: 'Status',
                dataIndex: 'status',
                render: (s: string) => <Tag>{s}</Tag>,
              },
              {
                title: 'Amount',
                dataIndex: 'amount',
                render: (v: number) => `$${v}`,
              },
            ]}
          />
        )}
      </section>
    </div>
  );
}
