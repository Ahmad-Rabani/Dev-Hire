import mongoose from 'mongoose';
import { badRequest, conflict, forbidden, notFound } from '../../utils/AppError';
import { toPublicAuditLog, writeAuditLog } from '../audit/audit.service';
import { AuditLog } from '../audit/audit.model';
import type { PublicAuditLog } from '../audit/audit.types';
import { RefreshSession } from '../auth/refresh-session.model';
import { Contract } from '../contracts/contract.model';
import { toPublicJob } from '../jobs/job.mapper';
import { Job } from '../jobs/job.model';
import type { JobModerationStatus, PublicJob } from '../jobs/job.types';
import { Proposal } from '../proposals/proposal.model';
import { Review } from '../reviews/review.model';
import { Report } from '../reports/report.model';
import type { PublicReport, ReportStatus } from '../reports/report.types';
import { User } from '../users/user.model';
import type { AccountStatus, UserRole } from '../users/user.types';
import type {
  AdminAuditListQuery,
  AdminJobListQuery,
  AdminJobModerationInput,
  AdminReportListQuery,
  AdminReportStatusInput,
  AdminUserListQuery,
  AdminUserStatusInput,
  CreateReportInput,
} from './admin.validation';

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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

export type AdminUserSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  createdAt: string;
  completedContracts: number;
  averageRating: number;
};

export type AdminUserDetail = AdminUserSummary & {
  bio?: string;
  professionalTitle?: string;
  counts: {
    jobs: number;
    proposals: number;
    contractsAsClient: number;
    contractsAsFreelancer: number;
    reviewsReceived: number;
  };
};

function toAdminUserSummary(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  createdAt: Date;
  completedContracts: number;
  averageRating: number;
}): AdminUserSummary {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    completedContracts: user.completedContracts,
    averageRating: user.averageRating,
  };
}

export async function listUsers(query: AdminUserListQuery): Promise<{
  users: AdminUserSummary[];
  pagination: ReturnType<typeof paginationMeta>;
}> {
  const filter: Record<string, unknown> = {};
  if (query.role) filter.role = query.role;
  if (query.status) filter.status = query.status;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const skip = (query.page - 1) * query.limit;
  const sortDir = query.sortOrder === 'asc' ? 1 : -1;
  const sort: Record<string, 1 | -1> = { [query.sortBy]: sortDir, _id: sortDir };

  const [docs, totalItems] = await Promise.all([
    User.find(filter)
      .select('name email role status emailVerified createdAt completedContracts averageRating')
      .sort(sort)
      .skip(skip)
      .limit(query.limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users: docs.map(toAdminUserSummary),
    pagination: paginationMeta(query.page, query.limit, totalItems),
  };
}

export async function getUserDetail(userId: string): Promise<AdminUserDetail> {
  const user = await User.findById(userId).select(
    'name email role status emailVerified createdAt completedContracts averageRating bio professionalTitle',
  );
  if (!user) {
    throw notFound('User not found');
  }

  const [jobs, proposals, contractsAsClient, contractsAsFreelancer, reviewsReceived] =
    await Promise.all([
      Job.countDocuments({ client: userId }),
      Proposal.countDocuments({ freelancer: userId }),
      Contract.countDocuments({ client: userId }),
      Contract.countDocuments({ freelancer: userId }),
      Review.countDocuments({ reviewee: userId }),
    ]);

  return {
    ...toAdminUserSummary(user),
    bio: user.bio,
    professionalTitle: user.professionalTitle,
    counts: {
      jobs,
      proposals,
      contractsAsClient,
      contractsAsFreelancer,
      reviewsReceived,
    },
  };
}

export async function updateUserStatus(
  actorId: string,
  targetUserId: string,
  input: AdminUserStatusInput,
): Promise<AdminUserSummary> {
  if (actorId === targetUserId) {
    throw forbidden('You cannot change your own account status');
  }

  const target = await User.findById(targetUserId);
  if (!target) {
    throw notFound('User not found');
  }

  if (target.status === input.status) {
    return toAdminUserSummary(target);
  }

  if (input.status === 'suspended' && target.role === 'admin') {
    const otherActiveAdmins = await User.countDocuments({
      role: 'admin',
      status: 'active',
      _id: { $ne: target._id },
    });
    if (otherActiveAdmins < 1) {
      throw badRequest('Cannot suspend the last active administrator');
    }
  }

  const updated = await User.findOneAndUpdate(
    { _id: target._id, status: target.status },
    { $set: { status: input.status } },
    { returnDocument: 'after' },
  );
  if (!updated) {
    throw conflict('Account status changed concurrently — retry');
  }

  if (input.status === 'suspended') {
    await RefreshSession.updateMany(
      { user: updated._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    await writeAuditLog({
      actorId,
      action: 'user.suspended',
      targetType: 'user',
      targetId: updated._id,
      reason: input.reason,
      summary: `Suspended ${updated.email}`,
    });
  } else {
    await writeAuditLog({
      actorId,
      action: 'user.reactivated',
      targetType: 'user',
      targetId: updated._id,
      reason: input.reason,
      summary: `Reactivated ${updated.email}`,
    });
  }

  return toAdminUserSummary(updated);
}

export type AdminJobDetail = PublicJob & {
  moderationReason?: string;
  moderatedAt?: string;
};

export async function listJobsForAdmin(query: AdminJobListQuery): Promise<{
  jobs: AdminJobDetail[];
  pagination: ReturnType<typeof paginationMeta>;
}> {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.moderationStatus) filter.moderationStatus = query.moderationStatus;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
    filter.$or = [{ title: regex }, { description: regex }];
  }

  const skip = (query.page - 1) * query.limit;
  const [docs, totalItems] = await Promise.all([
    Job.find(filter)
      .populate({ path: 'client', select: 'name avatarUrl' })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(query.limit),
    Job.countDocuments(filter),
  ]);

  return {
    jobs: docs.map((job) => ({
      ...toPublicJob(job),
      moderationReason: job.moderationReason,
      moderatedAt: job.moderatedAt?.toISOString(),
    })),
    pagination: paginationMeta(query.page, query.limit, totalItems),
  };
}

export async function getJobForAdmin(jobId: string): Promise<AdminJobDetail> {
  const job = await Job.findById(jobId).populate({ path: 'client', select: 'name avatarUrl' });
  if (!job) {
    throw notFound('Job not found');
  }
  return {
    ...toPublicJob(job),
    moderationReason: job.moderationReason,
    moderatedAt: job.moderatedAt?.toISOString(),
  };
}

export async function moderateJob(
  actorId: string,
  jobId: string,
  input: AdminJobModerationInput,
): Promise<AdminJobDetail> {
  const job = await Job.findById(jobId);
  if (!job) {
    throw notFound('Job not found');
  }

  const previous = job.moderationStatus ?? 'visible';
  if (previous === input.moderationStatus) {
    await job.populate({ path: 'client', select: 'name avatarUrl' });
    return {
      ...toPublicJob(job),
      moderationReason: job.moderationReason,
      moderatedAt: job.moderatedAt?.toISOString(),
    };
  }

  job.moderationStatus = input.moderationStatus;
  job.moderationReason = input.reason;
  job.moderatedAt = new Date();
  job.moderatedBy = new mongoose.Types.ObjectId(actorId);
  await job.save();
  await job.populate({ path: 'client', select: 'name avatarUrl' });

  const actionMap: Record<JobModerationStatus, 'job.hidden' | 'job.removed' | 'job.restored'> = {
    visible: 'job.restored',
    hidden: 'job.hidden',
    removed: 'job.removed',
  };

  await writeAuditLog({
    actorId,
    action: actionMap[input.moderationStatus],
    targetType: 'job',
    targetId: job._id,
    reason: input.reason,
    summary: `Job "${job.title}" → ${input.moderationStatus}`,
  });

  return {
    ...toPublicJob(job),
    moderationReason: job.moderationReason,
    moderatedAt: job.moderatedAt?.toISOString(),
  };
}

function toPublicReport(doc: {
  _id: { toString(): string };
  reporter: unknown;
  targetType: PublicReport['targetType'];
  targetId: { toString(): string };
  category: PublicReport['category'];
  explanation: string;
  status: ReportStatus;
  resolutionNote?: string;
  resolvedBy?: unknown;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PublicReport {
  const reporter =
    typeof doc.reporter === 'object' &&
    doc.reporter !== null &&
    '_id' in doc.reporter &&
    'name' in doc.reporter
      ? {
          id: String((doc.reporter as { _id: { toString(): string } })._id),
          name: String((doc.reporter as { name: string }).name),
          email:
            'email' in doc.reporter
              ? String((doc.reporter as { email?: string }).email ?? '')
              : undefined,
        }
      : { id: String(doc.reporter), name: 'User' };

  const resolvedBy =
    typeof doc.resolvedBy === 'object' &&
    doc.resolvedBy !== null &&
    '_id' in doc.resolvedBy &&
    'name' in doc.resolvedBy
      ? {
          id: String((doc.resolvedBy as { _id: { toString(): string } })._id),
          name: String((doc.resolvedBy as { name: string }).name),
        }
      : undefined;

  return {
    id: doc._id.toString(),
    reporter,
    targetType: doc.targetType,
    targetId: doc.targetId.toString(),
    category: doc.category,
    explanation: doc.explanation,
    status: doc.status,
    resolutionNote: doc.resolutionNote,
    resolvedBy,
    resolvedAt: doc.resolvedAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function assertReportTargetExists(
  targetType: CreateReportInput['targetType'],
  targetId: string,
): Promise<void> {
  if (targetType === 'job') {
    const job = await Job.findById(targetId).select('_id');
    if (!job) throw notFound('Reported job not found');
    return;
  }
  if (targetType === 'user') {
    const user = await User.findById(targetId).select('_id');
    if (!user) throw notFound('Reported user not found');
    return;
  }
  const review = await Review.findById(targetId).select('_id');
  if (!review) throw notFound('Reported review not found');
}

export async function createReport(
  reporterId: string,
  input: CreateReportInput,
): Promise<PublicReport> {
  if (input.targetType === 'user' && input.targetId === reporterId) {
    throw badRequest('You cannot report yourself');
  }

  await assertReportTargetExists(input.targetType, input.targetId);

  try {
    const report = await Report.create({
      reporter: reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      category: input.category,
      explanation: input.explanation,
      status: 'open',
    });
    await report.populate({ path: 'reporter', select: 'name email' });
    return toPublicReport(report);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw conflict('You already have an open report for this target');
    }
    throw error;
  }
}

export async function listReports(query: AdminReportListQuery): Promise<{
  reports: PublicReport[];
  pagination: ReturnType<typeof paginationMeta>;
}> {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.targetType) filter.targetType = query.targetType;

  const skip = (query.page - 1) * query.limit;
  const [docs, totalItems] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate({ path: 'reporter', select: 'name email' })
      .populate({ path: 'resolvedBy', select: 'name' }),
    Report.countDocuments(filter),
  ]);

  return {
    reports: docs.map(toPublicReport),
    pagination: paginationMeta(query.page, query.limit, totalItems),
  };
}

export async function getReport(reportId: string): Promise<PublicReport> {
  const report = await Report.findById(reportId)
    .populate({ path: 'reporter', select: 'name email' })
    .populate({ path: 'resolvedBy', select: 'name' });
  if (!report) {
    throw notFound('Report not found');
  }
  return toPublicReport(report);
}

export async function updateReportStatus(
  actorId: string,
  reportId: string,
  input: AdminReportStatusInput,
): Promise<PublicReport> {
  const report = await Report.findById(reportId);
  if (!report) {
    throw notFound('Report not found');
  }

  const terminal: ReportStatus[] = ['resolved', 'dismissed'];
  if (terminal.includes(report.status) && report.status === input.status) {
    await report.populate([
      { path: 'reporter', select: 'name email' },
      { path: 'resolvedBy', select: 'name' },
    ]);
    return toPublicReport(report);
  }
  if (terminal.includes(report.status)) {
    throw badRequest(`Report is already ${report.status}`);
  }

  report.status = input.status;
  report.resolutionNote = input.resolutionNote;
  if (input.status === 'resolved' || input.status === 'dismissed') {
    report.resolvedBy = new mongoose.Types.ObjectId(actorId);
    report.resolvedAt = new Date();
  }
  await report.save();
  await report.populate([
    { path: 'reporter', select: 'name email' },
    { path: 'resolvedBy', select: 'name' },
  ]);

  const action =
    input.status === 'resolved'
      ? 'report.resolved'
      : input.status === 'dismissed'
        ? 'report.dismissed'
        : 'report.status_changed';

  await writeAuditLog({
    actorId,
    action,
    targetType: 'report',
    targetId: report._id,
    reason: input.resolutionNote,
    summary: `Report ${report._id.toString()} → ${input.status}`,
  });

  return toPublicReport(report);
}

export async function listAuditLogs(query: AdminAuditListQuery): Promise<{
  logs: PublicAuditLog[];
  pagination: ReturnType<typeof paginationMeta>;
}> {
  const filter: Record<string, unknown> = {};
  if (query.action) filter.action = query.action;
  if (query.targetType) filter.targetType = query.targetType;

  const skip = (query.page - 1) * query.limit;
  const [docs, totalItems] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate({ path: 'actor', select: 'name email' }),
    AuditLog.countDocuments(filter),
  ]);

  return {
    logs: docs.map(toPublicAuditLog),
    pagination: paginationMeta(query.page, query.limit, totalItems),
  };
}
