import { z } from 'zod';
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from '../audit/audit.types';
import { JOB_MODERATION_STATUSES, JOB_STATUSES } from '../jobs/job.types';
import { REPORT_CATEGORIES, REPORT_STATUSES, REPORT_TARGET_TYPES } from '../reports/report.types';
import { ACCOUNT_STATUSES, USER_ROLES } from '../users/user.types';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const adminUserListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(ACCOUNT_STATUSES).optional(),
  sortBy: z.enum(['createdAt', 'name', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const adminUserIdParamSchema = z.object({
  id: objectId,
});

export const adminUserStatusSchema = z
  .object({
    status: z.enum(['active', 'suspended']),
    reason: z.string().trim().min(10).max(1000).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.status === 'suspended' && !data.reason) {
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'A reason is required when suspending an account',
      });
    }
  });

export const adminJobListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(JOB_STATUSES).optional(),
  moderationStatus: z.enum(JOB_MODERATION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const adminJobIdParamSchema = z.object({
  id: objectId,
});

export const adminJobModerationSchema = z
  .object({
    moderationStatus: z.enum(JOB_MODERATION_STATUSES),
    reason: z.string().trim().min(10).max(1000),
  })
  .strict();

export const createReportSchema = z
  .object({
    targetType: z.enum(REPORT_TARGET_TYPES),
    targetId: objectId,
    category: z.enum(REPORT_CATEGORIES),
    explanation: z.string().trim().min(10).max(2000),
  })
  .strict();

export const adminReportListQuerySchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  targetType: z.enum(REPORT_TARGET_TYPES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const adminReportIdParamSchema = z.object({
  id: objectId,
});

export const adminReportStatusSchema = z
  .object({
    status: z.enum(['under_review', 'resolved', 'dismissed']),
    resolutionNote: z.string().trim().min(5).max(2000),
  })
  .strict();

export const adminAuditListQuerySchema = z.object({
  action: z.enum(AUDIT_ACTIONS).optional(),
  targetType: z.enum(AUDIT_TARGET_TYPES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminUserStatusInput = z.infer<typeof adminUserStatusSchema>;
export type AdminJobListQuery = z.infer<typeof adminJobListQuerySchema>;
export type AdminJobModerationInput = z.infer<typeof adminJobModerationSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type AdminReportListQuery = z.infer<typeof adminReportListQuerySchema>;
export type AdminReportStatusInput = z.infer<typeof adminReportStatusSchema>;
export type AdminAuditListQuery = z.infer<typeof adminAuditListQuerySchema>;
