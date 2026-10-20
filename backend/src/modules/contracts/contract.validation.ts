import { z } from 'zod';
import { CONTRACT_STATUSES } from './contract.types';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const contractIdParamSchema = z.object({
  id: objectId,
});

export const contractMilestoneParamsSchema = z.object({
  contractId: objectId,
  milestoneId: objectId,
});

export const contractIdOnlyParamSchema = z.object({
  contractId: objectId,
});

export const contractListQuerySchema = z.object({
  status: z.enum(CONTRACT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const createMilestoneSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(10).max(5000),
    amount: z.number().finite().min(0).max(1_000_000),
    dueDate: z.string().datetime({ message: 'dueDate must be an ISO datetime' }),
  })
  .strict()
  .superRefine((data, ctx) => {
    const due = new Date(data.dueDate);
    if (Number.isNaN(due.getTime())) {
      ctx.addIssue({ code: 'custom', path: ['dueDate'], message: 'Invalid due date' });
      return;
    }
    // Allow same-day; reject clearly past dates (more than 1 day ago).
    const yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);
    if (due < yesterday) {
      ctx.addIssue({
        code: 'custom',
        path: ['dueDate'],
        message: 'Due date cannot be in the past',
      });
    }
  });

export const updateMilestoneSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().min(10).max(5000).optional(),
    amount: z.number().finite().min(0).max(1_000_000).optional(),
    dueDate: z.string().datetime({ message: 'dueDate must be an ISO datetime' }).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export const submitMilestoneSchema = z
  .object({
    submissionNotes: z.string().trim().min(10).max(5000),
    deliverableUrl: z
      .union([
        z.literal(''),
        z.string().trim().url('deliverableUrl must be a valid URL').max(500),
      ])
      .optional(),
  })
  .strict();

export const requestRevisionSchema = z
  .object({
    feedback: z.string().trim().min(10).max(2000),
  })
  .strict();

export const cancelContractSchema = z
  .object({
    reason: z.string().trim().min(10).max(1000),
  })
  .strict();

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
export type SubmitMilestoneInput = z.infer<typeof submitMilestoneSchema>;
export type RequestRevisionInput = z.infer<typeof requestRevisionSchema>;
export type CancelContractInput = z.infer<typeof cancelContractSchema>;
export type ContractListQuery = z.infer<typeof contractListQuerySchema>;
