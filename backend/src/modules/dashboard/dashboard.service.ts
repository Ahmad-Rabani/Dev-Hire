import mongoose from 'mongoose';
import { notFound } from '../../utils/AppError';
import { AuditLog } from '../audit/audit.model';
import { Contract } from '../contracts/contract.model';
import { Job } from '../jobs/job.model';
import { Proposal } from '../proposals/proposal.model';
import { Report } from '../reports/report.model';
import { Review } from '../reviews/review.model';
import { getProfileCompletion } from '../users/user.service';
import { toPublicUser } from '../users/user.mapper';
import { User } from '../users/user.model';
import type { AdminDashboard, ClientDashboard, FreelancerDashboard } from './dashboard.types';

function countsByKey(rows: Array<{ _id: string; count: number }>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    out[row._id] = row.count;
  }
  return out;
}

async function groupCount(
  model: mongoose.Model<unknown>,
  match: Record<string, unknown>,
  field: string,
): Promise<Record<string, number>> {
  const rows = await model.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  return countsByKey(rows.map((r) => ({ _id: String(r._id), count: r.count })));
}

export async function getClientDashboard(clientId: string): Promise<ClientDashboard> {
  const clientOid = new mongoose.Types.ObjectId(clientId);

  const [jobByStatus, clientJobs, contractsByStatus] = await Promise.all([
    groupCount(Job as mongoose.Model<unknown>, { client: clientOid }, 'status'),
    Job.find({ client: clientOid }).select('_id').lean(),
    groupCount(Contract as mongoose.Model<unknown>, { client: clientOid }, 'status'),
  ]);

  const jobIds = clientJobs.map((j) => j._id);
  const proposalMatch = jobIds.length ? { job: { $in: jobIds } } : { job: { $in: [] } };
  const proposalsByStatus = await groupCount(
    Proposal as mongoose.Model<unknown>,
    proposalMatch,
    'status',
  );

  const proposalsTotal = Object.values(proposalsByStatus).reduce((a, b) => a + b, 0);

  const [recentJobs, recentProposals, recentContracts] = await Promise.all([
    Job.find({ client: clientOid })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status createdAt')
      .lean(),
    jobIds.length
      ? Proposal.find({ job: { $in: jobIds } })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate({ path: 'job', select: 'title' })
          .populate({ path: 'freelancer', select: 'name' })
          .lean()
      : Promise.resolve([]),
    Contract.find({ client: clientOid })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate({ path: 'job', select: 'title' })
      .populate({ path: 'freelancer', select: 'name' })
      .lean(),
  ]);

  return {
    stats: {
      jobsTotal: Object.values(jobByStatus).reduce((a, b) => a + b, 0),
      jobsOpen: jobByStatus.open ?? 0,
      jobsInProgress: jobByStatus.in_progress ?? 0,
      jobsClosed: jobByStatus.closed ?? 0,
      jobsCancelled: jobByStatus.cancelled ?? 0,
      proposalsTotal,
      proposalsPending: proposalsByStatus.pending ?? 0,
      contractsActive: contractsByStatus.active ?? 0,
      contractsCompleted: contractsByStatus.completed ?? 0,
    },
    recentJobs: recentJobs.map((j) => ({
      id: j._id.toString(),
      title: j.title,
      status: j.status,
      createdAt: j.createdAt.toISOString(),
    })),
    recentProposals: (
      recentProposals as Array<{
        _id: mongoose.Types.ObjectId;
        job: { _id?: mongoose.Types.ObjectId; title?: string } | mongoose.Types.ObjectId;
        freelancer: { name?: string } | mongoose.Types.ObjectId;
        bidAmount: number;
        status: string;
        createdAt: Date;
      }>
    ).map((p) => {
      const job =
        typeof p.job === 'object' && p.job !== null && 'title' in p.job
          ? p.job
          : { title: 'Job', _id: p.job as mongoose.Types.ObjectId };
      const freelancer =
        typeof p.freelancer === 'object' && p.freelancer !== null && 'name' in p.freelancer
          ? p.freelancer
          : { name: 'Freelancer' };
      return {
        id: p._id.toString(),
        jobId: (job._id ?? p.job).toString(),
        jobTitle: job.title ?? 'Job',
        freelancerName: freelancer.name ?? 'Freelancer',
        bidAmount: p.bidAmount,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      };
    }),
    recentContracts: (
      recentContracts as Array<{
        _id: mongoose.Types.ObjectId;
        job: { title?: string } | mongoose.Types.ObjectId;
        freelancer: { name?: string } | mongoose.Types.ObjectId;
        status: string;
        amount: number;
        updatedAt: Date;
      }>
    ).map((c) => ({
      id: c._id.toString(),
      jobTitle:
        typeof c.job === 'object' && c.job !== null && 'title' in c.job
          ? (c.job.title ?? 'Job')
          : 'Job',
      freelancerName:
        typeof c.freelancer === 'object' && c.freelancer !== null && 'name' in c.freelancer
          ? (c.freelancer.name ?? 'Freelancer')
          : 'Freelancer',
      status: c.status,
      amount: c.amount,
      updatedAt: c.updatedAt.toISOString(),
    })),
  };
}

export async function getFreelancerDashboard(freelancerId: string): Promise<FreelancerDashboard> {
  const freelancerOid = new mongoose.Types.ObjectId(freelancerId);

  const [proposalsByStatus, contractsByStatus, user, reviewCount, recentReviews] =
    await Promise.all([
      groupCount(Proposal as mongoose.Model<unknown>, { freelancer: freelancerOid }, 'status'),
      groupCount(Contract as mongoose.Model<unknown>, { freelancer: freelancerOid }, 'status'),
      User.findById(freelancerId),
      Review.countDocuments({ reviewee: freelancerOid }),
      Review.find({ reviewee: freelancerOid })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({ path: 'reviewer', select: 'name' })
        .lean(),
    ]);

  if (!user) {
    throw notFound('User not found');
  }

  const [recentProposals, recentContracts] = await Promise.all([
    Proposal.find({ freelancer: freelancerOid })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate({ path: 'job', select: 'title' })
      .lean(),
    Contract.find({ freelancer: freelancerOid })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate({ path: 'job', select: 'title' })
      .populate({ path: 'client', select: 'name' })
      .lean(),
  ]);

  const publicUser = toPublicUser(user);

  return {
    stats: {
      proposalsTotal: Object.values(proposalsByStatus).reduce((a, b) => a + b, 0),
      proposalsPending: proposalsByStatus.pending ?? 0,
      proposalsAccepted: proposalsByStatus.accepted ?? 0,
      proposalsRejected: proposalsByStatus.rejected ?? 0,
      proposalsWithdrawn: proposalsByStatus.withdrawn ?? 0,
      contractsActive: contractsByStatus.active ?? 0,
      contractsCompleted: contractsByStatus.completed ?? 0,
      averageRating: user.averageRating ?? 0,
      reviewCount,
      profileCompletion: getProfileCompletion(publicUser),
    },
    recentProposals: (
      recentProposals as Array<{
        _id: mongoose.Types.ObjectId;
        job: { _id?: mongoose.Types.ObjectId; title?: string } | mongoose.Types.ObjectId;
        bidAmount: number;
        status: string;
        createdAt: Date;
        updatedAt: Date;
      }>
    ).map((p) => {
      const job =
        typeof p.job === 'object' && p.job !== null && 'title' in p.job
          ? p.job
          : { title: 'Job', _id: p.job as mongoose.Types.ObjectId };
      return {
        id: p._id.toString(),
        jobId: (job._id ?? p.job).toString(),
        jobTitle: job.title ?? 'Job',
        bidAmount: p.bidAmount,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    }),
    recentContracts: (
      recentContracts as Array<{
        _id: mongoose.Types.ObjectId;
        job: { title?: string } | mongoose.Types.ObjectId;
        client: { name?: string } | mongoose.Types.ObjectId;
        status: string;
        amount: number;
        updatedAt: Date;
      }>
    ).map((c) => ({
      id: c._id.toString(),
      jobTitle:
        typeof c.job === 'object' && c.job !== null && 'title' in c.job
          ? (c.job.title ?? 'Job')
          : 'Job',
      clientName:
        typeof c.client === 'object' && c.client !== null && 'name' in c.client
          ? (c.client.name ?? 'Client')
          : 'Client',
      status: c.status,
      amount: c.amount,
      updatedAt: c.updatedAt.toISOString(),
    })),
    recentReviews: (
      recentReviews as Array<{
        _id: mongoose.Types.ObjectId;
        rating: number;
        comment: string;
        reviewer: { name?: string } | mongoose.Types.ObjectId;
        createdAt: Date;
      }>
    ).map((r) => ({
      id: r._id.toString(),
      rating: r.rating,
      comment: r.comment,
      reviewerName:
        typeof r.reviewer === 'object' && r.reviewer !== null && 'name' in r.reviewer
          ? (r.reviewer.name ?? 'Client')
          : 'Client',
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    usersByRole,
    usersByStatus,
    usersRegisteredLast7Days,
    jobsByStatus,
    jobsByModeration,
    proposalsByStatus,
    contractsByStatus,
    reviewsTotal,
    reportsOpen,
  ] = await Promise.all([
    groupCount(User as mongoose.Model<unknown>, {}, 'role'),
    groupCount(User as mongoose.Model<unknown>, {}, 'status'),
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    groupCount(Job as mongoose.Model<unknown>, {}, 'status'),
    groupCount(Job as mongoose.Model<unknown>, {}, 'moderationStatus'),
    groupCount(Proposal as mongoose.Model<unknown>, {}, 'status'),
    groupCount(Contract as mongoose.Model<unknown>, {}, 'status'),
    Review.countDocuments({}),
    Report.countDocuments({ status: { $in: ['open', 'under_review'] } }),
  ]);

  // Recent activity from real records (audit preferred; otherwise entity timestamps).
  // Audit tracking begins when Phase 6 admin actions occur — older history is not backfilled.
  const [recentAudits, recentUsers, recentJobs, recentContracts] = await Promise.all([
    AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .populate({ path: 'actor', select: 'name' })
      .lean(),
    User.find({}).sort({ createdAt: -1 }).limit(5).select('name role createdAt').lean(),
    Job.find({}).sort({ createdAt: -1 }).limit(5).select('title status createdAt').lean(),
    Contract.find({ status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(5)
      .populate({ path: 'job', select: 'title' })
      .lean(),
  ]);

  type ActivityItem = { type: string; id: string; summary: string; createdAt: string; sortAt: number };
  const activity: ActivityItem[] = [];

  for (const a of recentAudits) {
    const actorName =
      typeof a.actor === 'object' && a.actor !== null && 'name' in a.actor
        ? String((a.actor as { name: string }).name)
        : 'Admin';
    activity.push({
      type: 'audit',
      id: a._id.toString(),
      summary: `${actorName}: ${a.action}${a.summary ? ` — ${a.summary}` : ''}`,
      createdAt: a.createdAt.toISOString(),
      sortAt: a.createdAt.getTime(),
    });
  }
  for (const u of recentUsers) {
    activity.push({
      type: 'user.registered',
      id: u._id.toString(),
      summary: `New ${u.role} registered: ${u.name}`,
      createdAt: u.createdAt.toISOString(),
      sortAt: u.createdAt.getTime(),
    });
  }
  for (const j of recentJobs) {
    activity.push({
      type: 'job.created',
      id: j._id.toString(),
      summary: `Job created: ${j.title} (${j.status})`,
      createdAt: j.createdAt.toISOString(),
      sortAt: j.createdAt.getTime(),
    });
  }
  for (const c of recentContracts) {
    const title =
      typeof c.job === 'object' && c.job !== null && 'title' in c.job
        ? String((c.job as { title: string }).title)
        : 'Contract';
    const when = c.completedAt ?? c.updatedAt;
    activity.push({
      type: 'contract.completed',
      id: c._id.toString(),
      summary: `Contract completed: ${title}`,
      createdAt: when.toISOString(),
      sortAt: when.getTime(),
    });
  }

  activity.sort((a, b) => b.sortAt - a.sortAt);

  return {
    stats: {
      usersTotal: Object.values(usersByRole).reduce((a, b) => a + b, 0),
      usersClients: usersByRole.client ?? 0,
      usersFreelancers: usersByRole.freelancer ?? 0,
      usersAdmins: usersByRole.admin ?? 0,
      usersActive: usersByStatus.active ?? 0,
      usersSuspended: usersByStatus.suspended ?? 0,
      usersRegisteredLast7Days,
      jobsTotal: Object.values(jobsByStatus).reduce((a, b) => a + b, 0),
      jobsDraft: jobsByStatus.draft ?? 0,
      jobsOpen: jobsByStatus.open ?? 0,
      jobsPaused: jobsByStatus.paused ?? 0,
      jobsInProgress: jobsByStatus.in_progress ?? 0,
      jobsClosed: jobsByStatus.closed ?? 0,
      jobsCancelled: jobsByStatus.cancelled ?? 0,
      jobsHidden: jobsByModeration.hidden ?? 0,
      jobsRemoved: jobsByModeration.removed ?? 0,
      proposalsTotal: Object.values(proposalsByStatus).reduce((a, b) => a + b, 0),
      proposalsPending: proposalsByStatus.pending ?? 0,
      proposalsAccepted: proposalsByStatus.accepted ?? 0,
      proposalsRejected: proposalsByStatus.rejected ?? 0,
      proposalsWithdrawn: proposalsByStatus.withdrawn ?? 0,
      contractsTotal: Object.values(contractsByStatus).reduce((a, b) => a + b, 0),
      contractsActive: contractsByStatus.active ?? 0,
      contractsCompleted: contractsByStatus.completed ?? 0,
      contractsCancelled: contractsByStatus.cancelled ?? 0,
      reviewsTotal,
      reportsOpen,
    },
    recentActivity: activity.slice(0, 15).map(({ type, id, summary, createdAt }) => ({
      type,
      id,
      summary,
      createdAt,
    })),
  };
}
