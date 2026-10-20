import { badRequest, forbidden, notFound } from '../../utils/AppError';
import { toPublicJob } from './job.mapper';
import { Job } from './job.model';
import {
  DELETABLE_JOB_STATUSES,
  EDITABLE_JOB_STATUSES,
  JOB_STATUS_TRANSITIONS,
  PUBLIC_JOB_MODERATION,
  PUBLIC_JOB_STATUSES,
  type JobSortField,
  type PaginationMeta,
  type PublicJob,
} from './job.types';
import type {
  ChangeJobStatusInput,
  CreateJobInput,
  JobListQuery,
  UpdateJobInput,
} from './job.validation';

const CLIENT_POPULATE = { path: 'client', select: 'name avatarUrl' };

type JobFilter = Record<string, unknown>;

function buildPagination(page: number, limit: number, totalItems: number): PaginationMeta {
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

function sortSpec(sortBy: JobSortField, sortOrder: 'asc' | 'desc'): Record<string, 1 | -1> {
  const direction = sortOrder === 'asc' ? 1 : -1;
  // Stable secondary sort prevents shuffle when primary values tie.
  return { [sortBy]: direction, _id: direction };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildListFilter(
  query: JobListQuery,
  options: { clientId?: string; publicOnly: boolean },
): JobFilter {
  const filter: JobFilter = {};

  if (options.clientId) {
    filter.client = options.clientId;
  }

  if (options.publicOnly) {
    filter.status = { $in: PUBLIC_JOB_STATUSES };
    filter.moderationStatus = { $in: PUBLIC_JOB_MODERATION };
  } else if (query.status) {
    filter.status = query.status;
  }

  if (query.budgetType) {
    filter.budgetType = query.budgetType;
  }

  // Overlap: job budget range intersects requested [minBudget, maxBudget]
  if (query.minBudget !== undefined) {
    filter.budgetMax = { $gte: query.minBudget };
  }
  if (query.maxBudget !== undefined) {
    filter.budgetMin = { $lte: query.maxBudget };
  }

  if (query.skills?.length) {
    // Match ANY selected skill (OR). Documented in API docs.
    filter.skills = { $in: query.skills };
  }

  if (query.search) {
    const term = query.search.trim();
    if (term) {
      // Case-insensitive regex on title/description/skills.
      // Text index on title+description remains for future Atlas Search upgrades;
      // $text cannot be safely combined inside $or with other predicates.
      const regex = new RegExp(escapeRegex(term), 'i');
      filter.$or = [{ title: regex }, { description: regex }, { skills: regex }];
    }
  }

  return filter;
}

async function listJobs(
  query: JobListQuery,
  options: { clientId?: string; publicOnly: boolean },
): Promise<{ jobs: PublicJob[]; pagination: PaginationMeta }> {
  const filter = buildListFilter(query, options);
  const skip = (query.page - 1) * query.limit;
  const sort = sortSpec(query.sortBy, query.sortOrder);

  const [docs, totalItems] = await Promise.all([
    Job.find(filter).populate(CLIENT_POPULATE).sort(sort).skip(skip).limit(query.limit),
    Job.countDocuments(filter),
  ]);

  return {
    jobs: docs.map(toPublicJob),
    pagination: buildPagination(query.page, query.limit, totalItems),
  };
}

export async function createJob(clientId: string, input: CreateJobInput): Promise<PublicJob> {
  const job = await Job.create({
    title: input.title,
    description: input.description,
    skills: input.skills,
    budgetType: input.budgetType,
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax,
    currency: input.currency,
    deadline: input.deadline,
    status: input.status,
    client: clientId,
  });

  await job.populate(CLIENT_POPULATE);
  return toPublicJob(job);
}

export async function listPublicJobs(query: JobListQuery) {
  // Force public visibility — ignore any status filter from the client.
  return listJobs({ ...query, status: undefined }, { publicOnly: true });
}

export async function listMyJobs(clientId: string, query: JobListQuery) {
  return listJobs(query, { clientId, publicOnly: false });
}

export async function getJobById(
  jobId: string,
  viewer?: { id: string; role: string },
): Promise<PublicJob> {
  const job = await Job.findById(jobId).populate(CLIENT_POPULATE);
  if (!job) {
    throw notFound('Job not found');
  }

  const ownerId =
    typeof job.client === 'object' && job.client !== null && '_id' in job.client
      ? (job.client as { _id: { toString(): string } })._id.toString()
      : String(job.client);
  const isOwner = Boolean(viewer?.id && viewer.id === ownerId);
  const isAdmin = viewer?.role === 'admin';
  const isPublicLifecycle = PUBLIC_JOB_STATUSES.includes(job.status);
  const isPubliclyVisible =
    isPublicLifecycle && PUBLIC_JOB_MODERATION.includes(job.moderationStatus ?? 'visible');

  if (!isPubliclyVisible && !isOwner && !isAdmin) {
    throw notFound('Job not found');
  }

  return toPublicJob(job);
}

export async function updateJob(
  jobId: string,
  clientId: string,
  input: UpdateJobInput,
): Promise<PublicJob> {
  const job = await Job.findById(jobId);
  if (!job) {
    throw notFound('Job not found');
  }
  if (job.client.toString() !== clientId) {
    throw forbidden('You can only edit your own jobs');
  }
  if (!EDITABLE_JOB_STATUSES.includes(job.status)) {
    throw badRequest(`Jobs in "${job.status}" status cannot be edited`);
  }

  if (input.title !== undefined) job.title = input.title;
  if (input.description !== undefined) job.description = input.description;
  if (input.skills !== undefined) job.skills = input.skills;
  if (input.budgetType !== undefined) job.budgetType = input.budgetType;
  if (input.budgetMin !== undefined) job.budgetMin = input.budgetMin;
  if (input.budgetMax !== undefined) job.budgetMax = input.budgetMax;
  if (input.currency !== undefined) job.currency = input.currency;
  if (input.deadline !== undefined) job.deadline = input.deadline;

  if (job.budgetMin > job.budgetMax) {
    throw badRequest('Minimum budget cannot exceed maximum budget');
  }

  await job.save();
  await job.populate(CLIENT_POPULATE);
  return toPublicJob(job);
}

export async function changeJobStatus(
  jobId: string,
  clientId: string,
  input: ChangeJobStatusInput,
): Promise<PublicJob> {
  const job = await Job.findById(jobId);
  if (!job) {
    throw notFound('Job not found');
  }
  if (job.client.toString() !== clientId) {
    throw forbidden('You can only change status on your own jobs');
  }

  const allowed = JOB_STATUS_TRANSITIONS[job.status];
  if (!allowed.includes(input.status)) {
    throw badRequest(`Cannot transition from "${job.status}" to "${input.status}"`);
  }

  job.status = input.status;
  await job.save();
  await job.populate(CLIENT_POPULATE);
  return toPublicJob(job);
}

export async function deleteJob(jobId: string, clientId: string): Promise<void> {
  const job = await Job.findById(jobId);
  if (!job) {
    throw notFound('Job not found');
  }
  if (job.client.toString() !== clientId) {
    throw forbidden('You can only delete your own jobs');
  }
  if (!DELETABLE_JOB_STATUSES.includes(job.status)) {
    throw badRequest(
      `Only draft or cancelled jobs can be deleted. Current status: "${job.status}"`,
    );
  }

  await job.deleteOne();
}
