export const AUDIT_ACTIONS = [
  'user.suspended',
  'user.reactivated',
  'job.hidden',
  'job.removed',
  'job.restored',
  'report.status_changed',
  'report.resolved',
  'report.dismissed',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_TARGET_TYPES = ['user', 'job', 'report'] as const;
export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

export type PublicAuditLog = {
  id: string;
  actor: {
    id: string;
    name: string;
    email?: string;
  };
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  reason?: string;
  summary?: string;
  createdAt: string;
};
