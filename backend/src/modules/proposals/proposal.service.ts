import mongoose from 'mongoose';
import { badRequest, conflict, forbidden, notFound } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import { toPublicContract } from '../contracts/contract.mapper';
import { Contract } from '../contracts/contract.model';
import type { PublicContract } from '../contracts/contract.types';
import { Job } from '../jobs/job.model';
import { JOB_ACCEPTING_PROPOSALS } from '../jobs/job.types';
import { toPublicProposal } from './proposal.mapper';
import { Proposal } from './proposal.model';
import type { PublicProposal } from './proposal.types';
import type {
  CreateProposalInput,
  ProposalListQuery,
  UpdateProposalInput,
} from './proposal.validation';

const JOB_POPULATE = {
  path: 'job',
  select: 'title status budgetType budgetMin budgetMax currency client',
};
const FREELANCER_POPULATE = {
  path: 'freelancer',
  select: 'name professionalTitle skills avatarUrl averageRating',
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

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

async function loadProposal(id: string) {
  const proposal = await Proposal.findById(id)
    .populate(JOB_POPULATE)
    .populate(FREELANCER_POPULATE);
  if (!proposal) {
    throw notFound('Proposal not found');
  }
  return proposal;
}

function jobOwnerId(job: { client: unknown }): string {
  const client = job.client as { _id?: { toString(): string }; toString(): string };
  if (client && typeof client === 'object' && '_id' in client && client._id) {
    return client._id.toString();
  }
  return String(job.client);
}

export async function submitProposal(
  jobId: string,
  freelancerId: string,
  input: CreateProposalInput,
): Promise<PublicProposal> {
  const job = await Job.findById(jobId);
  if (!job) {
    throw notFound('Job not found');
  }
  if (!JOB_ACCEPTING_PROPOSALS.includes(job.status)) {
    throw badRequest('This job is not accepting proposals');
  }
  if (job.client.toString() === freelancerId) {
    throw forbidden('You cannot apply to your own job');
  }

  try {
    const proposal = await Proposal.create({
      job: jobId,
      freelancer: freelancerId,
      coverLetter: input.coverLetter,
      bidAmount: input.bidAmount,
      deliveryDays: input.deliveryDays,
      status: 'pending',
    });
    await proposal.populate([JOB_POPULATE, FREELANCER_POPULATE]);
    return toPublicProposal(proposal);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw conflict('You have already submitted a proposal for this job');
    }
    throw error;
  }
}

export async function listProposalsForJob(
  jobId: string,
  clientId: string,
  query: ProposalListQuery,
): Promise<{ proposals: PublicProposal[]; pagination: ReturnType<typeof paginationMeta> }> {
  const job = await Job.findById(jobId);
  if (!job) {
    throw notFound('Job not found');
  }
  if (job.client.toString() !== clientId) {
    throw forbidden('You can only view proposals for your own jobs');
  }

  const filter: Record<string, unknown> = { job: jobId };
  if (query.status) filter.status = query.status;

  const skip = (query.page - 1) * query.limit;
  const [docs, totalItems] = await Promise.all([
    Proposal.find(filter)
      .populate(JOB_POPULATE)
      .populate(FREELANCER_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    Proposal.countDocuments(filter),
  ]);

  return {
    proposals: docs.map(toPublicProposal),
    pagination: paginationMeta(query.page, query.limit, totalItems),
  };
}

export async function listMyProposals(
  freelancerId: string,
  query: ProposalListQuery,
): Promise<{ proposals: PublicProposal[]; pagination: ReturnType<typeof paginationMeta> }> {
  const filter: Record<string, unknown> = { freelancer: freelancerId };
  if (query.status) filter.status = query.status;

  const skip = (query.page - 1) * query.limit;
  const [docs, totalItems] = await Promise.all([
    Proposal.find(filter)
      .populate(JOB_POPULATE)
      .populate(FREELANCER_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    Proposal.countDocuments(filter),
  ]);

  return {
    proposals: docs.map(toPublicProposal),
    pagination: paginationMeta(query.page, query.limit, totalItems),
  };
}

export async function getProposalById(
  proposalId: string,
  viewer: { id: string; role: string },
): Promise<PublicProposal> {
  const proposal = await loadProposal(proposalId);
  const job = proposal.job as unknown as { client: unknown; _id: { toString(): string } };
  const freelancerId =
    typeof proposal.freelancer === 'object' &&
    proposal.freelancer !== null &&
    '_id' in proposal.freelancer
      ? (proposal.freelancer as { _id: { toString(): string } })._id.toString()
      : String(proposal.freelancer);

  const isFreelancer = viewer.id === freelancerId;
  const isOwner = viewer.id === jobOwnerId(job);
  const isAdmin = viewer.role === 'admin';

  if (!isFreelancer && !isOwner && !isAdmin) {
    throw forbidden('You do not have access to this proposal');
  }

  return toPublicProposal(proposal);
}

export async function updateProposal(
  proposalId: string,
  freelancerId: string,
  input: UpdateProposalInput,
): Promise<PublicProposal> {
  const proposal = await Proposal.findById(proposalId).populate(JOB_POPULATE);
  if (!proposal) {
    throw notFound('Proposal not found');
  }
  if (proposal.freelancer.toString() !== freelancerId) {
    throw forbidden('You can only edit your own proposals');
  }
  if (proposal.status !== 'pending') {
    throw badRequest('Only pending proposals can be edited');
  }

  const job = await Job.findById(proposal.job);
  if (!job || !JOB_ACCEPTING_PROPOSALS.includes(job.status)) {
    throw badRequest('This job is no longer accepting proposal updates');
  }

  if (input.coverLetter !== undefined) proposal.coverLetter = input.coverLetter;
  if (input.bidAmount !== undefined) proposal.bidAmount = input.bidAmount;
  if (input.deliveryDays !== undefined) proposal.deliveryDays = input.deliveryDays;

  await proposal.save();
  await proposal.populate([JOB_POPULATE, FREELANCER_POPULATE]);
  return toPublicProposal(proposal);
}

export async function withdrawProposal(
  proposalId: string,
  freelancerId: string,
): Promise<PublicProposal> {
  const proposal = await Proposal.findById(proposalId);
  if (!proposal) {
    throw notFound('Proposal not found');
  }
  if (proposal.freelancer.toString() !== freelancerId) {
    throw forbidden('You can only withdraw your own proposals');
  }
  if (proposal.status !== 'pending') {
    throw badRequest('Only pending proposals can be withdrawn');
  }

  proposal.status = 'withdrawn';
  await proposal.save();
  await proposal.populate([JOB_POPULATE, FREELANCER_POPULATE]);
  return toPublicProposal(proposal);
}

export async function rejectProposal(
  proposalId: string,
  clientId: string,
): Promise<PublicProposal> {
  const proposal = await Proposal.findById(proposalId).populate(JOB_POPULATE);
  if (!proposal) {
    throw notFound('Proposal not found');
  }

  const job = await Job.findById(
    typeof proposal.job === 'object' && proposal.job !== null && '_id' in proposal.job
      ? (proposal.job as { _id: { toString(): string } })._id
      : proposal.job,
  );
  if (!job) {
    throw notFound('Job not found');
  }
  if (job.client.toString() !== clientId) {
    throw forbidden('You can only reject proposals for your own jobs');
  }
  if (proposal.status !== 'pending') {
    throw badRequest('Only pending proposals can be rejected');
  }

  proposal.status = 'rejected';
  await proposal.save();
  await proposal.populate([JOB_POPULATE, FREELANCER_POPULATE]);
  return toPublicProposal(proposal);
}

/**
 * Accept a pending proposal and create the initial contract.
 * Uses a MongoDB transaction when the deployment supports it (replica set / Atlas).
 * Unique indexes on accepted proposal + contract.job provide a second safety net.
 */
export async function acceptProposal(
  proposalId: string,
  clientId: string,
): Promise<{ proposal: PublicProposal; contract: PublicContract }> {
  const existingAccepted = await Proposal.findById(proposalId);
  if (!existingAccepted) {
    throw notFound('Proposal not found');
  }

  // Idempotent: already accepted by this client for this proposal.
  if (existingAccepted.status === 'accepted') {
    const job = await Job.findById(existingAccepted.job);
    if (!job || job.client.toString() !== clientId) {
      throw forbidden('You can only accept proposals for your own jobs');
    }
    const contract = await Contract.findOne({ proposal: existingAccepted._id });
    if (!contract) {
      throw conflict('Proposal is accepted but contract is missing — contact support');
    }
    const proposal = await loadProposal(proposalId);
    return { proposal: toPublicProposal(proposal), contract: toPublicContract(contract) };
  }

  if (existingAccepted.status !== 'pending') {
    throw badRequest('Only pending proposals can be accepted');
  }

  const session = await mongoose.startSession();
  try {
    let result: { proposal: PublicProposal; contract: PublicContract } | undefined;

    await session.withTransaction(async () => {
      const proposal = await Proposal.findById(proposalId).session(session);
      if (!proposal) {
        throw notFound('Proposal not found');
      }
      if (proposal.status !== 'pending') {
        throw badRequest('Only pending proposals can be accepted');
      }

      const job = await Job.findById(proposal.job).session(session);
      if (!job) {
        throw notFound('Job not found');
      }
      if (job.client.toString() !== clientId) {
        throw forbidden('You can only accept proposals for your own jobs');
      }
      if (!JOB_ACCEPTING_PROPOSALS.includes(job.status)) {
        throw badRequest('This job is no longer accepting applications');
      }

      const existingContract = await Contract.findOne({ job: job._id }).session(session);
      if (existingContract) {
        throw conflict('A contract already exists for this job');
      }

      // Conditional updates reduce race windows even inside a transaction.
      const accepted = await Proposal.findOneAndUpdate(
        { _id: proposal._id, status: 'pending' },
        { $set: { status: 'accepted' } },
        { returnDocument: 'after', session },
      );
      if (!accepted) {
        throw conflict('This proposal is no longer pending');
      }

      const hiredJob = await Job.findOneAndUpdate(
        { _id: job._id, status: 'open' },
        { $set: { status: 'in_progress' } },
        { returnDocument: 'after', session },
      );
      if (!hiredJob) {
        throw conflict('Job is no longer open for hiring');
      }

      await Proposal.updateMany(
        { job: job._id, status: 'pending', _id: { $ne: accepted._id } },
        { $set: { status: 'rejected' } },
        { session },
      );

      const [contract] = await Contract.create(
        [
          {
            job: job._id,
            client: job.client,
            freelancer: accepted.freelancer,
            proposal: accepted._id,
            amount: accepted.bidAmount,
            pricingType: job.budgetType,
            status: 'active',
            startDate: new Date(),
            milestones: [],
          },
        ],
        { session },
      );

      await accepted.populate([JOB_POPULATE, FREELANCER_POPULATE]);
      result = {
        proposal: toPublicProposal(accepted),
        contract: toPublicContract(contract),
      };
    });

    if (!result) {
      throw conflict('Acceptance did not complete');
    }
    return result;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw conflict('Another proposal was already accepted for this job');
    }
    // Standalone MongoDB (no replica set) cannot run multi-doc transactions.
    if (isTransactionUnsupported(error)) {
      logger.warn(
        'MongoDB transactions unavailable — using atomic fallback for proposal acceptance',
      );
      return acceptProposalWithoutTransaction(proposalId, clientId);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

function isTransactionUnsupported(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Transaction numbers are only allowed') ||
    message.includes('replica set') ||
    message.includes('transactions are not supported')
  );
}

/** Fallback when local MongoDB is standalone (no replica set). Still uses conditional updates + unique indexes. */
async function acceptProposalWithoutTransaction(
  proposalId: string,
  clientId: string,
): Promise<{ proposal: PublicProposal; contract: PublicContract }> {
  const proposal = await Proposal.findById(proposalId);
  if (!proposal) {
    throw notFound('Proposal not found');
  }
  if (proposal.status !== 'pending') {
    throw badRequest('Only pending proposals can be accepted');
  }

  const job = await Job.findById(proposal.job);
  if (!job) {
    throw notFound('Job not found');
  }
  if (job.client.toString() !== clientId) {
    throw forbidden('You can only accept proposals for your own jobs');
  }
  if (!JOB_ACCEPTING_PROPOSALS.includes(job.status)) {
    throw badRequest('This job is no longer accepting applications');
  }

  const hiredJob = await Job.findOneAndUpdate(
    { _id: job._id, status: 'open' },
    { $set: { status: 'in_progress' } },
    { returnDocument: 'after' },
  );
  if (!hiredJob) {
    throw conflict('Job is no longer open for hiring');
  }

  const accepted = await Proposal.findOneAndUpdate(
    { _id: proposal._id, status: 'pending' },
    { $set: { status: 'accepted' } },
    { returnDocument: 'after' },
  );
  if (!accepted) {
    // Roll job back if we lost the proposal race.
    await Job.findOneAndUpdate(
      { _id: job._id, status: 'in_progress' },
      { $set: { status: 'open' } },
    );
    throw conflict('This proposal is no longer pending');
  }

  await Proposal.updateMany(
    { job: job._id, status: 'pending', _id: { $ne: accepted._id } },
    { $set: { status: 'rejected' } },
  );

  try {
    const contract = await Contract.create({
      job: job._id,
      client: job.client,
      freelancer: accepted.freelancer,
      proposal: accepted._id,
      amount: accepted.bidAmount,
      pricingType: job.budgetType,
      status: 'active',
      startDate: new Date(),
      milestones: [],
    });
    await accepted.populate([JOB_POPULATE, FREELANCER_POPULATE]);
    return {
      proposal: toPublicProposal(accepted),
      contract: toPublicContract(contract),
    };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw conflict('A contract already exists for this job');
    }
    throw error;
  }
}

export async function getMyProposalForJob(
  jobId: string,
  freelancerId: string,
): Promise<PublicProposal | null> {
  const proposal = await Proposal.findOne({ job: jobId, freelancer: freelancerId })
    .populate(JOB_POPULATE)
    .populate(FREELANCER_POPULATE);
  return proposal ? toPublicProposal(proposal) : null;
}
