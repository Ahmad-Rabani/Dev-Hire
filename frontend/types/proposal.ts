import type { BudgetType, JobStatus } from './job';

export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export type ProposalFreelancer = {
  id: string;
  name: string;
  professionalTitle?: string;
  skills: string[];
  avatarUrl?: string;
  averageRating: number;
};

export type ProposalJob = {
  id: string;
  title: string;
  status: JobStatus | string;
  budgetType: BudgetType | string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
};

export type Proposal = {
  id: string;
  job: ProposalJob;
  freelancer: ProposalFreelancer;
  coverLetter: string;
  bidAmount: number;
  deliveryDays: number;
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
};

export type ContractSummary = {
  id: string;
  jobId: string;
  clientId: string;
  freelancerId: string;
  proposalId: string;
  amount: number;
  pricingType?: BudgetType;
  status: 'active' | 'completed' | 'cancelled';
  startDate: string;
  createdAt: string;
  updatedAt: string;
};

export type ProposalListResult = {
  proposals: Proposal[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type CreateProposalInput = {
  coverLetter: string;
  bidAmount: number;
  deliveryDays: number;
};

export type UpdateProposalInput = Partial<CreateProposalInput>;
