export const BUDGET_TYPES = ['fixed', 'hourly'] as const;
export type BudgetType = (typeof BUDGET_TYPES)[number];

export const JOB_STATUSES = ['draft', 'open', 'paused', 'closed', 'cancelled'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** Public browsing only surfaces open jobs. */
export const PUBLIC_JOB_STATUSES: JobStatus[] = ['open'];

/**
 * Allowed status transitions (owner-driven).
 * Hiring / completion belong to later proposal & contract phases.
 */
export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: ['open', 'cancelled'],
  open: ['paused', 'closed', 'cancelled'],
  paused: ['open', 'closed', 'cancelled'],
  closed: [],
  cancelled: [],
};

/** Soft-editable content while in these states. */
export const EDITABLE_JOB_STATUSES: JobStatus[] = ['draft', 'open', 'paused'];

/** Hard delete only when no marketplace activity is expected. */
export const DELETABLE_JOB_STATUSES: JobStatus[] = ['draft', 'cancelled'];

export const JOB_SORT_FIELDS = ['createdAt', 'deadline', 'budgetMin', 'title'] as const;
export type JobSortField = (typeof JOB_SORT_FIELDS)[number];

export type JobClientSummary = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export type PublicJob = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  budgetType: BudgetType;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  deadline: string;
  status: JobStatus;
  client: JobClientSummary;
  createdAt: string;
  updatedAt: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};
