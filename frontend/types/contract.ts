import type { BudgetType } from './job';

export type ContractStatus = 'active' | 'completed' | 'cancelled';
export type MilestoneStatus = 'pending' | 'submitted' | 'revision_requested' | 'approved';

export type ContractParty = {
  id: string;
  name: string;
  avatarUrl?: string;
  professionalTitle?: string;
};

export type Milestone = {
  id: string;
  title: string;
  description: string;
  amount: number;
  dueDate: string;
  status: MilestoneStatus;
  submissionNotes?: string;
  deliverableUrl?: string;
  submittedAt?: string;
  revisionFeedback?: string;
  revisionRequestedAt?: string;
  approvedAt?: string;
};

export type ContractProgress = {
  totalMilestones: number;
  approvedMilestones: number;
  percentComplete: number;
  approvedAmount: number;
  plannedAmount: number;
};

export type ContractDetail = {
  id: string;
  job: {
    id: string;
    title: string;
    status: string;
  };
  client: ContractParty;
  freelancer: ContractParty;
  proposalId: string;
  amount: number;
  pricingType: BudgetType;
  status: ContractStatus;
  startDate: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  milestones: Milestone[];
  progress: ContractProgress;
  createdAt: string;
  updatedAt: string;
};

export type ContractListResult = {
  contracts: ContractDetail[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type CreateMilestoneInput = {
  title: string;
  description: string;
  amount: number;
  dueDate: string;
};

export type UpdateMilestoneInput = Partial<CreateMilestoneInput>;

export type SubmitMilestoneInput = {
  submissionNotes: string;
  deliverableUrl?: string;
};

export type RequestRevisionInput = {
  feedback: string;
};

export type CancelContractInput = {
  reason: string;
};

export type Review = {
  id: string;
  contractId: string;
  reviewer: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateReviewInput = {
  rating: number;
  comment: string;
};

export type FreelancerReviewsResult = {
  averageRating: number;
  reviewCount: number;
  reviews: Review[];
};
