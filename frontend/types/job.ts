export type BudgetType = 'fixed' | 'hourly';
export type JobStatus = 'draft' | 'open' | 'paused' | 'closed' | 'cancelled';
export type JobSortField = 'createdAt' | 'deadline' | 'budgetMin' | 'title';

export type JobClientSummary = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export type Job = {
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

export type JobListResult = {
  jobs: Job[];
  pagination: PaginationMeta;
};

export type JobListParams = {
  search?: string;
  budgetType?: BudgetType;
  minBudget?: number;
  maxBudget?: number;
  skills?: string;
  status?: JobStatus;
  sortBy?: JobSortField;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

export type CreateJobInput = {
  title: string;
  description: string;
  skills: string[];
  budgetType: BudgetType;
  budgetMin: number;
  budgetMax: number;
  currency?: string;
  deadline: string;
  status?: 'draft' | 'open';
};

export type UpdateJobInput = Partial<
  Omit<CreateJobInput, 'status' | 'currency'> & { currency?: string }
>;
