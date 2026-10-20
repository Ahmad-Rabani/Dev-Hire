export const REPORT_TARGET_TYPES = ['job', 'user', 'review'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_CATEGORIES = [
  'spam',
  'harassment',
  'inappropriate',
  'scam',
  'other',
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const REPORT_STATUSES = ['open', 'under_review', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export type PublicReport = {
  id: string;
  reporter: {
    id: string;
    name: string;
    email?: string;
  };
  targetType: ReportTargetType;
  targetId: string;
  category: ReportCategory;
  explanation: string;
  status: ReportStatus;
  resolutionNote?: string;
  resolvedBy?: {
    id: string;
    name: string;
  };
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
};
