'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Spin, Tag } from 'antd';
import Link from 'next/link';
import { getApiErrorMessage } from '@/lib/api-client';
import { getJob } from '@/services/jobs.service';
import { useAuthStore } from '@/stores/auth-store';
import { JobProposalPanel } from '@/features/proposals/components/JobProposalPanel';
import { formatBudget, formatDate, JOB_STATUS_COLORS } from '../lib/format';

type JobDetailViewProps = {
  id: string;
};

export function JobDetailView({ id }: JobDetailViewProps) {
  const user = useAuthStore((s) => s.user);
  const query = useQuery({
    queryKey: ['jobs', id],
    queryFn: () => getJob(id),
  });

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Alert
        type="error"
        showIcon
        message="Job unavailable"
        description={getApiErrorMessage(query.error, 'This job may be private or does not exist.')}
        action={
          <Link href="/jobs">
            <Button>Back to jobs</Button>
          </Link>
        }
      />
    );
  }

  const job = query.data;
  const isOwner = user?.id === job.client.id;

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Tag color={JOB_STATUS_COLORS[job.status]}>{job.status}</Tag>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">{job.title}</h1>
          <p className="mt-2 text-slate-600">
            Posted by {job.client.name} · {formatDate(job.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/jobs">
            <Button>All jobs</Button>
          </Link>
          {isOwner ? (
            <>
              <Link href="/client/jobs">
                <Button>My jobs</Button>
              </Link>
              <Link href={`/client/jobs/${job.id}/proposals`}>
                <Button type="primary">Proposals</Button>
              </Link>
              {['draft', 'open', 'paused'].includes(job.status) ? (
                <Link href={`/client/jobs/${job.id}/edit`}>
                  <Button>Edit</Button>
                </Link>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-medium">Overview</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Budget</dt>
            <dd className="font-medium text-slate-800">{formatBudget(job)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Deadline</dt>
            <dd className="font-medium text-slate-800">{formatDate(job.deadline)}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {job.skills.map((skill) => (
            <Tag key={skill}>{skill}</Tag>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-medium">Description</h2>
        <p className="mt-3 whitespace-pre-wrap text-slate-700">{job.description}</p>
      </section>

      <JobProposalPanel job={job} />
    </article>
  );
}
