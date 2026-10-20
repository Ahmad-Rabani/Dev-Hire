import { buildFrontendUrl } from '../../utils/email';

/** Escape user-controlled text for HTML email bodies. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(title: string, bodyHtml: string, bodyText: string) {
  return {
    subject: title,
    text: bodyText,
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#0f172a;line-height:1.5">
      <h1 style="color:#0f766e;font-size:20px">${escapeHtml(title)}</h1>
      ${bodyHtml}
      <p style="color:#64748b;font-size:12px;margin-top:24px">— DevHire</p>
    </body></html>`,
  };
}

export function proposalSubmittedEmail(input: {
  clientName: string;
  jobTitle: string;
  jobId: string;
}) {
  const link = buildFrontendUrl(`/client/jobs/${input.jobId}/proposals`);
  return layout(
    'New proposal received',
    `<p>Hi ${escapeHtml(input.clientName)},</p>
     <p>You received a new proposal on <strong>${escapeHtml(input.jobTitle)}</strong>.</p>
     <p><a href="${link}">Review proposals</a></p>`,
    `Hi ${input.clientName},\n\nYou received a new proposal on "${input.jobTitle}".\nReview: ${link}`,
  );
}

export function proposalAcceptedEmail(input: {
  freelancerName: string;
  jobTitle: string;
  contractId: string;
}) {
  const link = buildFrontendUrl(`/contracts/${input.contractId}`);
  return layout(
    'Your proposal was accepted',
    `<p>Hi ${escapeHtml(input.freelancerName)},</p>
     <p>Your proposal for <strong>${escapeHtml(input.jobTitle)}</strong> was accepted. A contract is ready.</p>
     <p><a href="${link}">Open contract</a></p>`,
    `Hi ${input.freelancerName},\n\nYour proposal for "${input.jobTitle}" was accepted.\nContract: ${link}`,
  );
}

export function proposalRejectedEmail(input: {
  freelancerName: string;
  jobTitle: string;
}) {
  const link = buildFrontendUrl('/freelancer/proposals');
  return layout(
    'Proposal update',
    `<p>Hi ${escapeHtml(input.freelancerName)},</p>
     <p>Your proposal for <strong>${escapeHtml(input.jobTitle)}</strong> was not selected.</p>
     <p><a href="${link}">View your proposals</a></p>`,
    `Hi ${input.freelancerName},\n\nYour proposal for "${input.jobTitle}" was not selected.\n${link}`,
  );
}

export function milestoneSubmittedEmail(input: {
  clientName: string;
  milestoneTitle: string;
  contractId: string;
}) {
  const link = buildFrontendUrl(`/contracts/${input.contractId}`);
  return layout(
    'Milestone submitted for review',
    `<p>Hi ${escapeHtml(input.clientName)},</p>
     <p>Milestone <strong>${escapeHtml(input.milestoneTitle)}</strong> was submitted for your review.</p>
     <p><a href="${link}">Open contract</a></p>`,
    `Hi ${input.clientName},\n\nMilestone "${input.milestoneTitle}" was submitted.\n${link}`,
  );
}

export function milestoneApprovedEmail(input: {
  freelancerName: string;
  milestoneTitle: string;
  contractId: string;
}) {
  const link = buildFrontendUrl(`/contracts/${input.contractId}`);
  return layout(
    'Milestone approved',
    `<p>Hi ${escapeHtml(input.freelancerName)},</p>
     <p>Milestone <strong>${escapeHtml(input.milestoneTitle)}</strong> was approved (work accepted in DevHire — not a payment).</p>
     <p><a href="${link}">Open contract</a></p>`,
    `Hi ${input.freelancerName},\n\nMilestone "${input.milestoneTitle}" was approved.\n${link}`,
  );
}

export function milestoneRevisionEmail(input: {
  freelancerName: string;
  milestoneTitle: string;
  contractId: string;
}) {
  const link = buildFrontendUrl(`/contracts/${input.contractId}`);
  return layout(
    'Revision requested',
    `<p>Hi ${escapeHtml(input.freelancerName)},</p>
     <p>The client requested revisions on <strong>${escapeHtml(input.milestoneTitle)}</strong>.</p>
     <p><a href="${link}">Open contract</a></p>`,
    `Hi ${input.freelancerName},\n\nRevision requested on "${input.milestoneTitle}".\n${link}`,
  );
}

export function contractCompletedEmail(input: {
  name: string;
  jobTitle: string;
  contractId: string;
}) {
  const link = buildFrontendUrl(`/contracts/${input.contractId}`);
  return layout(
    'Contract completed',
    `<p>Hi ${escapeHtml(input.name)},</p>
     <p>The contract for <strong>${escapeHtml(input.jobTitle)}</strong> is marked completed. You can leave a review.</p>
     <p><a href="${link}">Open contract</a></p>`,
    `Hi ${input.name},\n\nContract for "${input.jobTitle}" is completed.\n${link}`,
  );
}

export function contractCancelledEmail(input: {
  name: string;
  jobTitle: string;
  contractId: string;
}) {
  const link = buildFrontendUrl(`/contracts/${input.contractId}`);
  return layout(
    'Contract cancelled',
    `<p>Hi ${escapeHtml(input.name)},</p>
     <p>The contract for <strong>${escapeHtml(input.jobTitle)}</strong> was cancelled.</p>
     <p><a href="${link}">Open contract</a></p>`,
    `Hi ${input.name},\n\nContract for "${input.jobTitle}" was cancelled.\n${link}`,
  );
}

export function reviewReceivedEmail(input: {
  name: string;
  rating: number;
  contractId: string;
}) {
  const link = buildFrontendUrl(`/contracts/${input.contractId}`);
  return layout(
    'You received a review',
    `<p>Hi ${escapeHtml(input.name)},</p>
     <p>You received a ${input.rating}-star review on a completed contract.</p>
     <p><a href="${link}">View contract</a></p>`,
    `Hi ${input.name},\n\nYou received a ${input.rating}-star review.\n${link}`,
  );
}
