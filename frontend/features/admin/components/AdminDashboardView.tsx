'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Spin, Table } from 'antd';
import { getApiErrorMessage } from '@/lib/api-client';
import { getAdminDashboard } from '@/services/dashboard.service';
import { StatCard } from '@/features/dashboard/components/StatCard';

export function AdminDashboardView() {
  const query = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: getAdminDashboard,
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

  const { stats, recentActivity } = query.data;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={stats.usersTotal} href="/admin/users" />
        <StatCard label="Active users" value={stats.usersActive} href="/admin/users" />
        <StatCard label="Suspended" value={stats.usersSuspended} href="/admin/users" />
        <StatCard label="New (7 days)" value={stats.usersRegisteredLast7Days} />
        <StatCard label="Clients" value={stats.usersClients} />
        <StatCard label="Freelancers" value={stats.usersFreelancers} />
        <StatCard label="Open jobs" value={stats.jobsOpen} href="/admin/jobs" />
        <StatCard label="Hidden jobs" value={stats.jobsHidden} href="/admin/jobs" />
        <StatCard label="Proposals pending" value={stats.proposalsPending} />
        <StatCard label="Active contracts" value={stats.contractsActive} />
        <StatCard label="Completed contracts" value={stats.contractsCompleted} />
        <StatCard label="Open reports" value={stats.reportsOpen} href="/admin/reports" />
        <StatCard label="Reviews" value={stats.reviewsTotal} />
        <StatCard label="Removed jobs" value={stats.jobsRemoved} href="/admin/jobs" />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium text-slate-900">Recent platform activity</h2>
        <p className="mb-3 text-xs text-slate-500">
          Audit events begin when admin actions are recorded (Phase 6). Earlier history is not
          backfilled.
        </p>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-slate-500">No recent activity.</p>
        ) : (
          <Table
            rowKey={(row) => `${row.type}-${row.id}-${row.createdAt}`}
            size="small"
            pagination={false}
            dataSource={recentActivity}
            columns={[
              { title: 'Type', dataIndex: 'type', width: 160 },
              { title: 'Summary', dataIndex: 'summary' },
              {
                title: 'When',
                dataIndex: 'createdAt',
                width: 140,
                render: (v: string) => new Date(v).toLocaleString(),
              },
            ]}
          />
        )}
      </section>
    </div>
  );
}
