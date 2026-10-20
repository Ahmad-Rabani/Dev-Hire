export const BUDGET_TYPES = ['fixed', 'hourly'] as const;
export type BudgetType = (typeof BUDGET_TYPES)[number];

export const JOB_STATUSES = [
  'draft',
  'open',
  'paused',
  'in_progress',
  'closed',
  'cancelled',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/**
 * Moderation is separate from business lifecycle (`status`).
 * An open+hidden job stays `open` for the owner but is excluded from public discovery.
 */
export const JOB_MODERATION_STATUSES = ['visible', 'hidden', 'removed'] as const;
export type JobModerationStatus = (typeof JOB_MODERATION_STATUSES)[number];

/** Public browsing only surfaces open + visible jobs. */
export const PUBLIC_JOB_STATUSES: JobStatus[] = ['open'];
export const PUBLIC_JOB_MODERATION: JobModerationStatus[] = ['visible'];

/**
 * Allowed status transitions (owner-driven via PATCH status).
 * `in_progress` is set by proposal acceptance (Phase 4), not manually.
 */
export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: ['open', 'cancelled'],
  open: ['paused', 'closed', 'cancelled'],
  paused: ['open', 'closed', 'cancelled'],
  in_progress: [],
  closed: [],
  cancelled: [],
};

/** Soft-editable content while in these states. */
export const EDITABLE_JOB_STATUSES: JobStatus[] = ['draft', 'open', 'paused'];

/** Hard delete only when no marketplace activity is expected. */
export const DELETABLE_JOB_STATUSES: JobStatus[] = ['draft', 'cancelled'];

/** Jobs that still accept freelancer proposals. */
export const JOB_ACCEPTING_PROPOSALS: JobStatus[] = ['open'];

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
  moderationStatus: JobModerationStatus;
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
