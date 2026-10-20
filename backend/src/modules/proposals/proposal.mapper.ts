import type { IJobDocument } from '../jobs/job.model';
import type { IUserDocument } from '../users/user.model';
import type { IProposalDocument } from './proposal.model';
import type { PublicProposal } from './proposal.types';

function asJob(value: unknown): Pick<
  IJobDocument,
  '_id' | 'title' | 'status' | 'budgetType' | 'budgetMin' | 'budgetMax' | 'currency'
> | null {
  if (typeof value === 'object' && value !== null && 'title' in value && '_id' in value) {
    return value as IJobDocument;
  }
  return null;
}

function asFreelancer(value: unknown): Pick<
  IUserDocument,
  '_id' | 'name' | 'professionalTitle' | 'skills' | 'avatarUrl' | 'averageRating'
> | null {
  if (typeof value === 'object' && value !== null && 'name' in value && '_id' in value) {
    return value as IUserDocument;
  }
  return null;
}

export function toPublicProposal(proposal: IProposalDocument): PublicProposal {
  const job = asJob(proposal.job);
  const freelancer = asFreelancer(proposal.freelancer);

  return {
    id: proposal._id.toString(),
    job: job
      ? {
          id: job._id.toString(),
          title: job.title,
          status: job.status,
          budgetType: job.budgetType,
          budgetMin: job.budgetMin,
          budgetMax: job.budgetMax,
          currency: job.currency,
        }
      : {
          id: String(proposal.job),
          title: 'Job',
          status: 'unknown',
          budgetType: 'fixed',
          budgetMin: 0,
          budgetMax: 0,
          currency: 'USD',
        },
    freelancer: freelancer
      ? {
          id: freelancer._id.toString(),
          name: freelancer.name,
          professionalTitle: freelancer.professionalTitle,
          skills: freelancer.skills ?? [],
          avatarUrl: freelancer.avatarUrl,
          averageRating: freelancer.averageRating ?? 0,
        }
      : {
          id: String(proposal.freelancer),
          name: 'Freelancer',
          skills: [],
          averageRating: 0,
        },
    coverLetter: proposal.coverLetter,
    bidAmount: proposal.bidAmount,
    deliveryDays: proposal.deliveryDays,
    status: proposal.status,
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString(),
  };
}
