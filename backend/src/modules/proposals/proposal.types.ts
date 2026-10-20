export const PROPOSAL_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export type ProposalFreelancerSummary = {
  id: string;
  name: string;
  professionalTitle?: string;
  skills: string[];
  avatarUrl?: string;
  averageRating: number;
};

export type ProposalJobSummary = {
  id: string;
  title: string;
  status: string;
  budgetType: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
};

export type PublicProposal = {
  id: string;
  job: ProposalJobSummary;
  freelancer: ProposalFreelancerSummary;
  coverLetter: string;
  bidAmount: number;
  deliveryDays: number;
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
};
