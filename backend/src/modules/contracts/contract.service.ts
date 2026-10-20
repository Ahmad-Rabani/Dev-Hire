import mongoose from 'mongoose';
import { badRequest, conflict, forbidden, notFound } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import type { AuthUser } from '../../types/express';
import { Job } from '../jobs/job.model';
import {
  notifyContractCancelled,
  notifyContractCompleted,
  notifyMilestoneApproved,
  notifyMilestoneRevision,
  notifyMilestoneSubmitted,
} from '../notifications/notification.events';
import { Upload } from '../uploads/upload.model';
import { User } from '../users/user.model';
import { calculateProgress, toPublicContractDetail } from './contract.mapper';
import { Contract, type IContractDocument } from './contract.model';
import type { PublicContractDetail } from './contract.types';
import type {
  CancelContractInput,
  ContractListQuery,
  CreateMilestoneInput,
  RequestRevisionInput,
  SubmitMilestoneInput,
  UpdateMilestoneInput,
} from './contract.validation';

const JOB_POPULATE = { path: 'job', select: 'title status budgetType currency' };
const CLIENT_POPULATE = { path: 'client', select: 'name avatarUrl professionalTitle' };
const FREELANCER_POPULATE = {
  path: 'freelancer',
  select: 'name avatarUrl professionalTitle',
};

function paginationMeta(page: number, limit: number, totalItems: number) {
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}

function isTransactionUnsupported(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Transaction numbers are only allowed') ||
    message.includes('replica set') ||
    message.includes('transactions are not supported')
  );
}

function assertParticipant(contract: IContractDocument, userId: string): void {
  const isClient = contract.client.toString() === userId;
  const isFreelancer = contract.freelancer.toString() === userId;
  if (!isClient && !isFreelancer) {
    throw forbidden('You do not have access to this contract');
  }
}

function assertClient(contract: IContractDocument, userId: string): void {
  if (contract.client.toString() !== userId) {
    throw forbidden('Only the client on this contract can perform this action');
  }
}

function assertFreelancer(contract: IContractDocument, userId: string): void {
  if (contract.freelancer.toString() !== userId) {
    throw forbidden('Only the freelancer on this contract can perform this action');
  }
}

function assertActive(contract: IContractDocument): void {
  if (contract.status !== 'active') {
    throw badRequest(`Contract is ${contract.status} and cannot be modified`);
  }
}

function findMilestone(contract: IContractDocument, milestoneId: string) {
  const milestone = contract.milestones.id(milestoneId);
  if (!milestone) {
    throw notFound('Milestone not found on this contract');
  }
  return milestone;
}

/**
 * Fixed-price: planned milestone amounts must not exceed the contract total.
 * Hourly: milestone amounts are planning/tracking only — no sum check against amount.
 */
function assertMilestoneBudget(
  contract: IContractDocument,
  nextPlannedTotal: number,
): void {
  if (contract.pricingType !== 'fixed') {
    return;
  }
  // Allow 1 cent floating tolerance
  if (nextPlannedTotal > contract.amount + 0.01) {
    throw badRequest(
      `Milestone amounts ($${nextPlannedTotal.toFixed(2)}) exceed the fixed contract total ($${contract.amount.toFixed(2)})`,
    );
  }
}

async function loadContract(id: string): Promise<IContractDocument> {
  const contract = await Contract.findById(id)
    .populate(JOB_POPULATE)
    .populate(CLIENT_POPULATE)
    .populate(FREELANCER_POPULATE);
  if (!contract) {
    throw notFound('Contract not found');
  }
  return contract;
}

async function reloadDetail(id: string): Promise<PublicContractDetail> {
  const contract = await loadContract(id);
  return toPublicContractDetail(contract);
}

export async function listMyContracts(
  user: AuthUser,
  query: ContractListQuery,
): Promise<{
  contracts: PublicContractDetail[];
  pagination: ReturnType<typeof paginationMeta>;
}> {
  const filter: Record<string, unknown> = {};
  if (user.role === 'client') {
    filter.client = user.id;
  } else if (user.role === 'freelancer') {
    filter.freelancer = user.id;
  } else {
    throw forbidden('Only clients and freelancers have contracts');
  }
  if (query.status) {
    filter.status = query.status;
  }

  const skip = (query.page - 1) * query.limit;
  const [docs, totalItems] = await Promise.all([
    Contract.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate(JOB_POPULATE)
      .populate(CLIENT_POPULATE)
      .populate(FREELANCER_POPULATE),
    Contract.countDocuments(filter),
  ]);

  return {
    contracts: docs.map(toPublicContractDetail),
    pagination: paginationMeta(query.page, query.limit, totalItems),
  };
}

export async function getContractById(
  contractId: string,
  user: AuthUser,
): Promise<PublicContractDetail> {
  const contract = await loadContract(contractId);
  assertParticipant(contract, user.id);
  return toPublicContractDetail(contract);
}

export async function addMilestone(
  contractId: string,
  userId: string,
  input: CreateMilestoneInput,
): Promise<PublicContractDetail> {
  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw notFound('Contract not found');
  }
  assertClient(contract, userId);
  assertActive(contract);

  const planned =
    contract.milestones.reduce((sum, m) => sum + m.amount, 0) + input.amount;
  assertMilestoneBudget(contract, planned);

  contract.milestones.push({
    title: input.title,
    description: input.description,
    amount: input.amount,
    dueDate: new Date(input.dueDate),
    status: 'pending',
  });

  await contract.save();
  return reloadDetail(contractId);
}

export async function updateMilestone(
  contractId: string,
  milestoneId: string,
  userId: string,
  input: UpdateMilestoneInput,
): Promise<PublicContractDetail> {
  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw notFound('Contract not found');
  }
  assertClient(contract, userId);
  assertActive(contract);

  const milestone = findMilestone(contract, milestoneId);
  if (milestone.status !== 'pending') {
    throw badRequest('Only pending milestones can be edited');
  }

  if (input.title !== undefined) milestone.title = input.title;
  if (input.description !== undefined) milestone.description = input.description;
  if (input.dueDate !== undefined) milestone.dueDate = new Date(input.dueDate);
  if (input.amount !== undefined) {
    const planned =
      contract.milestones.reduce(
        (sum, m) => sum + (m._id.toString() === milestoneId ? 0 : m.amount),
        0,
      ) + input.amount;
    assertMilestoneBudget(contract, planned);
    milestone.amount = input.amount;
  }

  await contract.save();
  return reloadDetail(contractId);
}

export async function deleteMilestone(
  contractId: string,
  milestoneId: string,
  userId: string,
): Promise<PublicContractDetail> {
  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw notFound('Contract not found');
  }
  assertClient(contract, userId);
  assertActive(contract);

  const milestone = findMilestone(contract, milestoneId);
  if (milestone.status !== 'pending') {
    throw badRequest('Only pending milestones can be deleted');
  }

  contract.milestones.pull(milestoneId);
  await contract.save();
  return reloadDetail(contractId);
}

export async function submitMilestone(
  contractId: string,
  milestoneId: string,
  userId: string,
  input: SubmitMilestoneInput,
): Promise<PublicContractDetail> {
  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw notFound('Contract not found');
  }
  assertFreelancer(contract, userId);
  assertActive(contract);

  const milestone = findMilestone(contract, milestoneId);
  if (milestone.status !== 'pending' && milestone.status !== 'revision_requested') {
    throw badRequest('Milestone cannot be submitted in its current state');
  }

  if (input.deliverableUploadIds?.length) {
    const uploads = await Upload.find({
      _id: { $in: input.deliverableUploadIds },
      owner: userId,
      purpose: 'milestone_deliverable',
    });
    if (uploads.length !== input.deliverableUploadIds.length) {
      throw badRequest('One or more deliverable uploads are invalid or not owned by you');
    }
    milestone.deliverableUploadIds = uploads.map((u) => u._id);
    await Upload.updateMany(
      { _id: { $in: uploads.map((u) => u._id) } },
      { $set: { resourceType: 'contract', resourceId: contract._id } },
    );
  }

  milestone.status = 'submitted';
  milestone.submissionNotes = input.submissionNotes;
  milestone.deliverableUrl = input.deliverableUrl || undefined;
  milestone.submittedAt = new Date();
  // Keep prior revisionFeedback visible until next approval for history context.

  await contract.save();
  await notifyMilestoneSubmitted({
    clientId: contract.client.toString(),
    freelancerId: userId,
    contractId: contract._id.toString(),
    milestoneId: milestone._id.toString(),
    milestoneTitle: milestone.title,
    submittedAt: milestone.submittedAt,
  });
  return reloadDetail(contractId);
}

export async function approveMilestone(
  contractId: string,
  milestoneId: string,
  userId: string,
): Promise<PublicContractDetail> {
  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw notFound('Contract not found');
  }
  assertClient(contract, userId);
  assertActive(contract);

  const milestone = findMilestone(contract, milestoneId);
  if (milestone.status !== 'submitted') {
    throw badRequest('Only submitted milestones can be approved');
  }

  milestone.status = 'approved';
  milestone.approvedAt = new Date();
  await contract.save();
  await notifyMilestoneApproved({
    freelancerId: contract.freelancer.toString(),
    clientId: userId,
    contractId: contract._id.toString(),
    milestoneId: milestone._id.toString(),
    milestoneTitle: milestone.title,
  });
  return reloadDetail(contractId);
}

export async function requestMilestoneRevision(
  contractId: string,
  milestoneId: string,
  userId: string,
  input: RequestRevisionInput,
): Promise<PublicContractDetail> {
  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw notFound('Contract not found');
  }
  assertClient(contract, userId);
  assertActive(contract);

  const milestone = findMilestone(contract, milestoneId);
  if (milestone.status !== 'submitted') {
    throw badRequest('Only submitted milestones can receive revision requests');
  }

  milestone.status = 'revision_requested';
  milestone.revisionFeedback = input.feedback;
  milestone.revisionRequestedAt = new Date();
  await contract.save();
  await notifyMilestoneRevision({
    freelancerId: contract.freelancer.toString(),
    clientId: userId,
    contractId: contract._id.toString(),
    milestoneId: milestone._id.toString(),
    milestoneTitle: milestone.title,
    revisionRequestedAt: milestone.revisionRequestedAt,
  });
  return reloadDetail(contractId);
}

async function completeContractCore(
  contractId: string,
  clientId: string,
  session?: mongoose.ClientSession,
): Promise<IContractDocument> {
  const contract = await Contract.findById(contractId).session(session ?? null);
  if (!contract) {
    throw notFound('Contract not found');
  }
  assertClient(contract, clientId);

  if (contract.status === 'completed') {
    return contract;
  }
  if (contract.status !== 'active') {
    throw badRequest(`Cannot complete a ${contract.status} contract`);
  }

  if (contract.milestones.length === 0) {
    throw badRequest('Add and approve at least one milestone before completing the contract');
  }

  const incomplete = contract.milestones.filter((m) => m.status !== 'approved');
  if (incomplete.length > 0) {
    throw badRequest('All milestones must be approved before completing the contract');
  }

  if (contract.pricingType === 'fixed') {
    const planned = contract.milestones.reduce((sum, m) => sum + m.amount, 0);
    if (Math.abs(planned - contract.amount) > 0.01) {
      throw badRequest(
        `Fixed-price milestone amounts ($${planned.toFixed(2)}) must equal the contract total ($${contract.amount.toFixed(2)}) before completion`,
      );
    }
  }

  const completed = await Contract.findOneAndUpdate(
    { _id: contract._id, status: 'active' },
    {
      $set: {
        status: 'completed',
        completedAt: new Date(),
      },
    },
    { returnDocument: 'after', session },
  );
  if (!completed) {
    throw conflict('Contract is no longer active');
  }

  await Job.findOneAndUpdate(
    { _id: completed.job, status: 'in_progress' },
    { $set: { status: 'closed' } },
    { session },
  );

  await User.updateOne(
    { _id: completed.client },
    { $inc: { completedContracts: 1 } },
    { session },
  );
  await User.updateOne(
    { _id: completed.freelancer },
    { $inc: { completedContracts: 1 } },
    { session },
  );

  return completed;
}

export async function completeContract(
  contractId: string,
  clientId: string,
): Promise<PublicContractDetail> {
  // Validate eligibility without a session first so bad requests never open a transaction.
  const existing = await Contract.findById(contractId);
  if (!existing) {
    throw notFound('Contract not found');
  }
  assertClient(existing, clientId);
  if (existing.status === 'completed') {
    return reloadDetail(contractId);
  }
  if (existing.status !== 'active') {
    throw badRequest(`Cannot complete a ${existing.status} contract`);
  }
  if (existing.milestones.length === 0) {
    throw badRequest('Add and approve at least one milestone before completing the contract');
  }
  if (existing.milestones.some((m) => m.status !== 'approved')) {
    throw badRequest('All milestones must be approved before completing the contract');
  }
  if (existing.pricingType === 'fixed') {
    const planned = existing.milestones.reduce((sum, m) => sum + m.amount, 0);
    if (Math.abs(planned - existing.amount) > 0.01) {
      throw badRequest(
        `Fixed-price milestone amounts ($${planned.toFixed(2)}) must equal the contract total ($${existing.amount.toFixed(2)}) before completion`,
      );
    }
  }

  const session = await mongoose.startSession();
  try {
    let completedId = contractId;
    await session.withTransaction(async () => {
      const doc = await completeContractCore(contractId, clientId, session);
      completedId = doc._id.toString();
    });
    const detail = await reloadDetail(completedId);
    await notifyContractCompleted({
      clientId: detail.client.id,
      freelancerId: detail.freelancer.id,
      contractId: detail.id,
      jobTitle: detail.job.title,
      actorId: clientId,
    });
    return detail;
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      logger.warn('MongoDB transactions unavailable — completing contract without session');
      await completeContractCore(contractId, clientId);
      const detail = await reloadDetail(contractId);
      await notifyContractCompleted({
        clientId: detail.client.id,
        freelancerId: detail.freelancer.id,
        contractId: detail.id,
        jobTitle: detail.job.title,
        actorId: clientId,
      });
      return detail;
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function cancelContract(
  contractId: string,
  userId: string,
  input: CancelContractInput,
): Promise<PublicContractDetail> {
  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw notFound('Contract not found');
  }
  assertParticipant(contract, userId);

  if (contract.status === 'cancelled') {
    return reloadDetail(contractId);
  }
  if (contract.status !== 'active') {
    throw badRequest('Only active contracts can be cancelled');
  }

  const hasAdvancedWork = contract.milestones.some(
    (m) => m.status === 'approved' || m.status === 'submitted' || m.status === 'revision_requested',
  );
  if (hasAdvancedWork) {
    throw badRequest(
      'Cannot cancel while milestones are submitted, in revision, or approved. Complete or resolve work first.',
    );
  }

  const cancelled = await Contract.findOneAndUpdate(
    { _id: contract._id, status: 'active' },
    {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: input.reason,
      },
    },
    { returnDocument: 'after' },
  );
  if (!cancelled) {
    throw conflict('Contract is no longer active');
  }

  // Job returns to closed (work abandoned) without inventing a refund flow.
  await Job.findOneAndUpdate(
    { _id: cancelled.job, status: 'in_progress' },
    { $set: { status: 'closed' } },
  );

  const detail = await reloadDetail(contractId);
  const otherPartyId =
    detail.client.id === userId ? detail.freelancer.id : detail.client.id;
  await notifyContractCancelled({
    otherPartyId,
    actorId: userId,
    contractId: detail.id,
    jobTitle: detail.job.title,
  });
  return detail;
}

export function getContractProgress(contract: IContractDocument) {
  return calculateProgress(contract.milestones ?? []);
}
