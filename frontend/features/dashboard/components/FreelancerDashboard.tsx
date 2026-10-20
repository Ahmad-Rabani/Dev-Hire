'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Progress, Rate, Spin, Table, Tag } from 'antd';
import Link from 'next/link';
import { getApiErrorMessage } from '@/lib/api-client';
import { getFreelancerDashboard } from '@/services/dashboard.service';
import { StatCard } from './StatCard';

export function FreelancerDashboard() {
  const query = useQuery({
    queryKey: ['dashboard', 'freelancer'],
    queryFn: getFreelancerDashboard,
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

  const { stats, recentProposals, recentContracts, recentReviews } = query.data;

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Profile completeness</p>
        <Progress percent={stats.profileCompletion} className="mt-2 max-w-md" />
        <Link href="/freelancer/profile" className="text-sm text-teal-700 hover:underline">
          Edit profile
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Proposals" value={stats.proposalsTotal} href="/freelancer/proposals" />
        <StatCard label="Pending" value={stats.proposalsPending} href="/freelancer/proposals" />
        <StatCard label="Accepted" value={stats.proposalsAccepted} href="/freelancer/proposals" />
        <StatCard
          label="Rejected / withdrawn"
          value={stats.proposalsRejected + stats.proposalsWithdrawn}
          href="/freelancer/proposals"
        />
        <StatCard label="Active contracts" value={stats.contractsActive} href="/freelancer/contracts" />
        <StatCard
          label="Completed contracts"
          value={stats.contractsCompleted}
          href="/freelancer/contracts"
        />
        <StatCard
          label="Avg rating"
          value={stats.averageRating.toFixed(1)}
          hint={`${stats.reviewCount} reviews`}
        />
        <StatCard label="Browse jobs" value="→" href="/jobs" hint="Find new work" />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium text-slate-900">Recent proposals</h2>
        {recentProposals.length === 0 ? (
          <p className="text-sm text-slate-500">
            No proposals yet.{' '}
            <Link href="/jobs" className="text-teal-700 hover:underline">
              Browse jobs
            </Link>
          </p>
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
                  <Link href={`/jobs/${row.jobId}`} className="text-teal-800 hover:underline">
                    {title}
                  </Link>
                ),
              },
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
              { title: 'Client', dataIndex: 'clientName' },
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
        <h2 className="mb-3 text-lg font-medium text-slate-900">Recent reviews</h2>
        {recentReviews.length === 0 ? (
          <p className="text-sm text-slate-500">No reviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {recentReviews.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.reviewerName}</span>
                  <Rate disabled value={r.rating} />
                </div>
                <p className="mt-1 text-sm text-slate-600">{r.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
