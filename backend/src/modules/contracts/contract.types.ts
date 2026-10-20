import type { BudgetType } from '../jobs/job.types';

export const CONTRACT_STATUSES = ['active', 'completed', 'cancelled'] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const MILESTONE_STATUSES = [
  'pending',
  'submitted',
  'revision_requested',
  'approved',
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export type PublicMilestone = {
  id: string;
  title: string;
  description: string;
  amount: number;
  dueDate: string;
  status: MilestoneStatus;
  submissionNotes?: string;
  deliverableUrl?: string;
  deliverableUploadIds?: string[];
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

export type PublicContractParty = {
  id: string;
  name: string;
  avatarUrl?: string;
  professionalTitle?: string;
};

export type PublicContractDetail = {
  id: string;
  job: {
    id: string;
    title: string;
    status: string;
  };
  client: PublicContractParty;
  freelancer: PublicContractParty;
  proposalId: string;
  amount: number;
  pricingType: BudgetType;
  status: ContractStatus;
  startDate: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  milestones: PublicMilestone[];
  progress: ContractProgress;
  createdAt: string;
  updatedAt: string;
};

/** Compact shape used by Phase 4 accept response and list cards. */
export type PublicContract = {
  id: string;
  jobId: string;
  clientId: string;
  freelancerId: string;
  proposalId: string;
  amount: number;
  pricingType?: BudgetType;
  status: ContractStatus;
  startDate: string;
  createdAt: string;
  updatedAt: string;
};
