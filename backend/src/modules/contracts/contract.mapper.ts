import type { Types } from 'mongoose';
import type { BudgetType } from '../jobs/job.types';
import type { IContractDocument, IMilestone } from './contract.model';
import type {
  ContractProgress,
  PublicContract,
  PublicContractDetail,
  PublicContractParty,
  PublicMilestone,
} from './contract.types';

type PopulatedUser = {
  _id: Types.ObjectId;
  name: string;
  avatarUrl?: string;
  professionalTitle?: string;
};

type PopulatedJob = {
  _id: Types.ObjectId;
  title: string;
  status: string;
};

function isPopulatedUser(value: unknown): value is PopulatedUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_id' in value &&
    'name' in value &&
    typeof (value as PopulatedUser).name === 'string'
  );
}

function isPopulatedJob(value: unknown): value is PopulatedJob {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_id' in value &&
    'title' in value &&
    typeof (value as PopulatedJob).title === 'string'
  );
}

function toParty(value: unknown): PublicContractParty {
  if (isPopulatedUser(value)) {
    return {
      id: value._id.toString(),
      name: value.name,
      avatarUrl: value.avatarUrl,
      professionalTitle: value.professionalTitle,
    };
  }
  return {
    id: String(value),
    name: 'Unknown',
  };
}

export function toPublicMilestone(m: IMilestone): PublicMilestone {
  return {
    id: m._id.toString(),
    title: m.title,
    description: m.description,
    amount: m.amount,
    dueDate: m.dueDate.toISOString(),
    status: m.status,
    submissionNotes: m.submissionNotes,
    deliverableUrl: m.deliverableUrl,
    deliverableUploadIds: (m.deliverableUploadIds ?? []).map((id) => id.toString()),
    submittedAt: m.submittedAt?.toISOString(),
    revisionFeedback: m.revisionFeedback,
    revisionRequestedAt: m.revisionRequestedAt?.toISOString(),
    approvedAt: m.approvedAt?.toISOString(),
  };
}

/**
 * Progress = approved milestone count / total milestones.
 * Zero milestones → 0% (never divide by zero; never auto-complete).
 */
export function calculateProgress(milestones: IMilestone[]): ContractProgress {
  const totalMilestones = milestones.length;
  const approvedMilestones = milestones.filter((m) => m.status === 'approved').length;
  const plannedAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
  const approvedAmount = milestones
    .filter((m) => m.status === 'approved')
    .reduce((sum, m) => sum + m.amount, 0);
  const percentComplete =
    totalMilestones === 0 ? 0 : Math.round((approvedMilestones / totalMilestones) * 100);

  return {
    totalMilestones,
    approvedMilestones,
    percentComplete,
    approvedAmount,
    plannedAmount,
  };
}

export function toPublicContract(doc: IContractDocument): PublicContract {
  return {
    id: doc._id.toString(),
    jobId: doc.job.toString(),
    clientId: doc.client.toString(),
    freelancerId: doc.freelancer.toString(),
    proposalId: doc.proposal.toString(),
    amount: doc.amount,
    pricingType: doc.pricingType,
    status: doc.status,
    startDate: doc.startDate.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function toPublicContractDetail(doc: IContractDocument): PublicContractDetail {
  const job = isPopulatedJob(doc.job)
    ? {
        id: doc.job._id.toString(),
        title: doc.job.title,
        status: doc.job.status,
      }
    : {
        id: String(doc.job),
        title: 'Job',
        status: 'unknown',
      };

  return {
    id: doc._id.toString(),
    job,
    client: toParty(doc.client),
    freelancer: toParty(doc.freelancer),
    proposalId: doc.proposal.toString(),
    amount: doc.amount,
    pricingType: (doc.pricingType ?? 'fixed') as BudgetType,
    status: doc.status,
    startDate: doc.startDate.toISOString(),
    completedAt: doc.completedAt?.toISOString(),
    cancelledAt: doc.cancelledAt?.toISOString(),
    cancelReason: doc.cancelReason,
    milestones: (doc.milestones ?? []).map(toPublicMilestone),
    progress: calculateProgress(doc.milestones ?? []),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
