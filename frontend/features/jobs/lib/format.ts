import type { Job, JobStatus } from '@/types/job';

export function formatBudget(job: Pick<Job, 'budgetType' | 'budgetMin' | 'budgetMax' | 'currency'>) {
  const range = `${job.currency} ${job.budgetMin}–${job.budgetMax}`;
  return job.budgetType === 'hourly' ? `${range}/hr` : range;
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export const JOB_STATUS_COLORS: Record<
  JobStatus,
  'default' | 'success' | 'warning' | 'error' | 'processing'
> = {
  draft: 'default',
  open: 'success',
  paused: 'warning',
  in_progress: 'processing',
  closed: 'processing',
  cancelled: 'error',
};
