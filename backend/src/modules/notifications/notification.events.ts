import { Types } from 'mongoose';
import { User } from '../users/user.model';
import { queueEmail } from '../email/email-outbox.service';
import * as templates from '../email/email.templates';
import { logger } from '../../utils/logger';
import { createNotification } from './notification.service';

/** Accept ObjectId, populated doc, or string — never pass a populated toString() blob. */
function asUserId(value: unknown): string | null {
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) return value;
  if (value instanceof Types.ObjectId) return value.toString();
  if (
    typeof value === 'object' &&
    value !== null &&
    '_id' in value &&
    (value as { _id: unknown })._id != null
  ) {
    return asUserId((value as { _id: unknown })._id);
  }
  return null;
}

async function loadUser(id: unknown) {
  const userId = asUserId(id);
  if (!userId) return null;
  return User.findById(userId).select('name email');
}

async function safeNotify(label: string, work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch (error) {
    logger.error('Notification/email side-effect failed (business op already succeeded)', {
      label,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function notifyProposalSubmitted(input: {
  clientId: string;
  freelancerId: string;
  jobId: string;
  jobTitle: string;
  proposalId: string;
}): Promise<void> {
  await safeNotify('proposal.submitted', async () => {
    const clientId = asUserId(input.clientId);
    const freelancerId = asUserId(input.freelancerId);
    if (!clientId || !freelancerId) return;

    await createNotification({
      recipientId: clientId,
      actorId: freelancerId,
      type: 'proposal.submitted',
      title: 'New proposal',
      message: `A freelancer submitted a proposal on “${input.jobTitle}”.`,
      resourceType: 'job',
      resourceId: input.jobId,
      dedupeKey: `proposal.submitted:${input.proposalId}`,
    });

    const client = await loadUser(clientId);
    if (client?.email) {
      const mail = templates.proposalSubmittedEmail({
        clientName: client.name,
        jobTitle: input.jobTitle,
        jobId: input.jobId,
      });
      await queueEmail({
        to: client.email,
        ...mail,
        dedupeKey: `email:proposal.submitted:${input.proposalId}`,
      });
    }
  });
}

export async function notifyProposalAccepted(input: {
  freelancerId: string;
  clientId: string;
  jobTitle: string;
  proposalId: string;
  contractId: string;
}): Promise<void> {
  await safeNotify('proposal.accepted', async () => {
    const freelancerId = asUserId(input.freelancerId);
    const clientId = asUserId(input.clientId);
    if (!freelancerId || !clientId) return;

    await createNotification({
      recipientId: freelancerId,
      actorId: clientId,
      type: 'proposal.accepted',
      title: 'Proposal accepted',
      message: `Your proposal for “${input.jobTitle}” was accepted. A contract is ready.`,
      resourceType: 'contract',
      resourceId: input.contractId,
      dedupeKey: `proposal.accepted:${input.proposalId}`,
    });

    const freelancer = await loadUser(freelancerId);
    if (freelancer?.email) {
      const mail = templates.proposalAcceptedEmail({
        freelancerName: freelancer.name,
        jobTitle: input.jobTitle,
        contractId: input.contractId,
      });
      await queueEmail({
        to: freelancer.email,
        ...mail,
        dedupeKey: `email:proposal.accepted:${input.proposalId}`,
      });
    }
  });
}

export async function notifyProposalRejected(input: {
  freelancerId: string;
  clientId: string;
  jobTitle: string;
  proposalId: string;
}): Promise<void> {
  await safeNotify('proposal.rejected', async () => {
    const freelancerId = asUserId(input.freelancerId);
    const clientId = asUserId(input.clientId);
    if (!freelancerId || !clientId) return;

    await createNotification({
      recipientId: freelancerId,
      actorId: clientId,
      type: 'proposal.rejected',
      title: 'Proposal not selected',
      message: `Your proposal for “${input.jobTitle}” was not selected.`,
      resourceType: 'proposal',
      resourceId: input.proposalId,
      dedupeKey: `proposal.rejected:${input.proposalId}`,
    });

    const freelancer = await loadUser(freelancerId);
    if (freelancer?.email) {
      const mail = templates.proposalRejectedEmail({
        freelancerName: freelancer.name,
        jobTitle: input.jobTitle,
      });
      await queueEmail({
        to: freelancer.email,
        ...mail,
        dedupeKey: `email:proposal.rejected:${input.proposalId}`,
      });
    }
  });
}

export async function notifyMilestoneSubmitted(input: {
  clientId: string;
  freelancerId: string;
  contractId: string;
  milestoneId: string;
  milestoneTitle: string;
  submittedAt: Date;
}): Promise<void> {
  await safeNotify('milestone.submitted', async () => {
    const clientId = asUserId(input.clientId);
    const freelancerId = asUserId(input.freelancerId);
    if (!clientId || !freelancerId) return;
    const stamp = input.submittedAt.toISOString();

    await createNotification({
      recipientId: clientId,
      actorId: freelancerId,
      type: 'milestone.submitted',
      title: 'Milestone submitted',
      message: `“${input.milestoneTitle}” is ready for your review.`,
      resourceType: 'contract',
      resourceId: input.contractId,
      dedupeKey: `milestone.submitted:${input.milestoneId}:${stamp}`,
    });

    const client = await loadUser(clientId);
    if (client?.email) {
      const mail = templates.milestoneSubmittedEmail({
        clientName: client.name,
        milestoneTitle: input.milestoneTitle,
        contractId: input.contractId,
      });
      await queueEmail({
        to: client.email,
        ...mail,
        dedupeKey: `email:milestone.submitted:${input.milestoneId}:${stamp}`,
      });
    }
  });
}

export async function notifyMilestoneApproved(input: {
  freelancerId: string;
  clientId: string;
  contractId: string;
  milestoneId: string;
  milestoneTitle: string;
}): Promise<void> {
  await safeNotify('milestone.approved', async () => {
    const freelancerId = asUserId(input.freelancerId);
    const clientId = asUserId(input.clientId);
    if (!freelancerId || !clientId) return;

    await createNotification({
      recipientId: freelancerId,
      actorId: clientId,
      type: 'milestone.approved',
      title: 'Milestone approved',
      message: `“${input.milestoneTitle}” was approved (work accepted — not a payment).`,
      resourceType: 'contract',
      resourceId: input.contractId,
      dedupeKey: `milestone.approved:${input.milestoneId}`,
    });

    const freelancer = await loadUser(freelancerId);
    if (freelancer?.email) {
      const mail = templates.milestoneApprovedEmail({
        freelancerName: freelancer.name,
        milestoneTitle: input.milestoneTitle,
        contractId: input.contractId,
      });
      await queueEmail({
        to: freelancer.email,
        ...mail,
        dedupeKey: `email:milestone.approved:${input.milestoneId}`,
      });
    }
  });
}

export async function notifyMilestoneRevision(input: {
  freelancerId: string;
  clientId: string;
  contractId: string;
  milestoneId: string;
  milestoneTitle: string;
  revisionRequestedAt: Date;
}): Promise<void> {
  await safeNotify('milestone.revision', async () => {
    const freelancerId = asUserId(input.freelancerId);
    const clientId = asUserId(input.clientId);
    if (!freelancerId || !clientId) return;
    const stamp = input.revisionRequestedAt.toISOString();

    await createNotification({
      recipientId: freelancerId,
      actorId: clientId,
      type: 'milestone.revision_requested',
      title: 'Revision requested',
      message: `The client requested revisions on “${input.milestoneTitle}”.`,
      resourceType: 'contract',
      resourceId: input.contractId,
      dedupeKey: `milestone.revision:${input.milestoneId}:${stamp}`,
    });

    const freelancer = await loadUser(freelancerId);
    if (freelancer?.email) {
      const mail = templates.milestoneRevisionEmail({
        freelancerName: freelancer.name,
        milestoneTitle: input.milestoneTitle,
        contractId: input.contractId,
      });
      await queueEmail({
        to: freelancer.email,
        ...mail,
        dedupeKey: `email:milestone.revision:${input.milestoneId}:${stamp}`,
      });
    }
  });
}

export async function notifyContractCompleted(input: {
  clientId: string;
  freelancerId: string;
  contractId: string;
  jobTitle: string;
  actorId: string;
}): Promise<void> {
  await safeNotify('contract.completed', async () => {
    const recipients = [asUserId(input.clientId), asUserId(input.freelancerId)].filter(
      (id): id is string => Boolean(id),
    );
    const actorId = asUserId(input.actorId) ?? undefined;

    for (const recipientId of recipients) {
      await createNotification({
        recipientId,
        actorId,
        type: 'contract.completed',
        title: 'Contract completed',
        message: `The contract for “${input.jobTitle}” is completed. You can leave a review.`,
        resourceType: 'contract',
        resourceId: input.contractId,
        dedupeKey: `contract.completed:${input.contractId}:${recipientId}`,
      });

      const user = await loadUser(recipientId);
      if (user?.email) {
        const mail = templates.contractCompletedEmail({
          name: user.name,
          jobTitle: input.jobTitle,
          contractId: input.contractId,
        });
        await queueEmail({
          to: user.email,
          ...mail,
          dedupeKey: `email:contract.completed:${input.contractId}:${recipientId}`,
        });
      }
    }
  });
}

export async function notifyContractCancelled(input: {
  otherPartyId: string;
  actorId: string;
  contractId: string;
  jobTitle: string;
}): Promise<void> {
  await safeNotify('contract.cancelled', async () => {
    const otherPartyId = asUserId(input.otherPartyId);
    const actorId = asUserId(input.actorId);
    if (!otherPartyId) return;

    await createNotification({
      recipientId: otherPartyId,
      actorId: actorId ?? undefined,
      type: 'contract.cancelled',
      title: 'Contract cancelled',
      message: `The contract for “${input.jobTitle}” was cancelled.`,
      resourceType: 'contract',
      resourceId: input.contractId,
      dedupeKey: `contract.cancelled:${input.contractId}`,
    });

    const user = await loadUser(otherPartyId);
    if (user?.email) {
      const mail = templates.contractCancelledEmail({
        name: user.name,
        jobTitle: input.jobTitle,
        contractId: input.contractId,
      });
      await queueEmail({
        to: user.email,
        ...mail,
        dedupeKey: `email:contract.cancelled:${input.contractId}`,
      });
    }
  });
}

export async function notifyReviewReceived(input: {
  revieweeId: string;
  reviewerId: string;
  contractId: string;
  rating: number;
  reviewId: string;
}): Promise<void> {
  await safeNotify('review.received', async () => {
    const revieweeId = asUserId(input.revieweeId);
    const reviewerId = asUserId(input.reviewerId);
    if (!revieweeId) return;

    await createNotification({
      recipientId: revieweeId,
      actorId: reviewerId ?? undefined,
      type: 'review.received',
      title: 'New review',
      message: `You received a ${input.rating}-star review.`,
      resourceType: 'review',
      resourceId: input.reviewId,
      dedupeKey: `review.received:${input.reviewId}`,
    });

    const user = await loadUser(revieweeId);
    if (user?.email) {
      const mail = templates.reviewReceivedEmail({
        name: user.name,
        rating: input.rating,
        contractId: input.contractId,
      });
      await queueEmail({
        to: user.email,
        ...mail,
        dedupeKey: `email:review.received:${input.reviewId}`,
      });
    }
  });
}
