'use client';

import { Card, Tag } from 'antd';
import Link from 'next/link';
import type { Job } from '@/types/job';
import { formatBudget, formatDate, JOB_STATUS_COLORS } from '../lib/format';

type JobCardProps = {
  job: Job;
  href?: string;
};

export function JobCard({ job, href }: JobCardProps) {
  const content = (
    <Card hoverable={Boolean(href)} className="h-full" title={job.title}>
      <p className="line-clamp-3 text-sm text-slate-600">{job.description}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {job.skills.slice(0, 5).map((skill) => (
          <Tag key={skill}>{skill}</Tag>
        ))}
      </div>
      <div className="mt-4 space-y-1 text-sm text-slate-500">
        <p>
          <span className="font-medium text-slate-700">Budget:</span> {formatBudget(job)}
        </p>
        <p>
          <span className="font-medium text-slate-700">Client:</span> {job.client.name}
        </p>
        <p>
          <span className="font-medium text-slate-700">Deadline:</span> {formatDate(job.deadline)}
        </p>
        <p>
          <Tag color={JOB_STATUS_COLORS[job.status]}>{job.status}</Tag>
          <span className="ml-2">Posted {formatDate(job.createdAt)}</span>
        </p>
      </div>
    </Card>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}
