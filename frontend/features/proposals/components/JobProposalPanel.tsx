'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Spin, Tag } from 'antd';
import Link from 'next/link';
import { getApiErrorMessage } from '@/lib/api-client';
import { getMyProposalForJob } from '@/services/proposals.service';
import { useAuthStore } from '@/stores/auth-store';
import type { Job } from '@/types/job';
import { ProposalForm } from './ProposalForm';

type JobProposalPanelProps = {
  job: Job;
};

export function JobProposalPanel({ job }: JobProposalPanelProps) {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const isOwner = user?.id === job.client.id;

  const mineQuery = useQuery({
    queryKey: ['proposals', 'mine-for-job', job.id],
    queryFn: () => getMyProposalForJob(job.id),
    enabled: status === 'authenticated' && user?.role === 'freelancer' && !isOwner,
  });

  if (isOwner) {
    return (
      <Alert
        type="info"
        showIcon
        message="You own this job"
        description={
          <span>
            Review applications on the{' '}
            <Link href={`/client/jobs/${job.id}/proposals`} className="text-teal-700 underline">
              proposals page
            </Link>
            .
          </span>
        }
      />
    );
  }

  if (status !== 'authenticated') {
    return (
      <Alert
        type="info"
        showIcon
        message="Sign in to apply"
        action={
          <Link href={`/login?returnTo=${encodeURIComponent(`/jobs/${job.id}`)}`}>
            <Button type="primary">Log in</Button>
          </Link>
        }
      />
    );
  }

  if (user?.role !== 'freelancer') {
    return (
      <Alert
        type="info"
        showIcon
        message="Only freelancers can submit proposals"
        description="Switch to a freelancer account to apply for jobs."
      />
    );
  }

  if (job.status !== 'open') {
    return (
      <Alert
        type="warning"
        showIcon
        message="This job is not accepting proposals"
        description={`Current status: ${job.status}`}
      />
    );
  }

  if (mineQuery.isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spin />
      </div>
    );
  }

  if (mineQuery.isError) {
    return <Alert type="error" showIcon message={getApiErrorMessage(mineQuery.error)} />;
  }

  if (mineQuery.data) {
    return (
      <Alert
        type="success"
        showIcon
        message="You already applied"
        description={
          <div className="space-y-2">
            <p>
              Status: <Tag>{mineQuery.data.status}</Tag> · Bid ${mineQuery.data.bidAmount} ·{' '}
              {mineQuery.data.deliveryDays} days
            </p>
            <Link href="/freelancer/proposals">
              <Button>View my proposals</Button>
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-lg font-medium">Submit a proposal</h2>
      <ProposalForm jobId={job.id} />
    </section>
  );
}
