import { z } from 'zod';
import { PROPOSAL_STATUSES } from './proposal.types';

export const createProposalSchema = z
  .object({
    coverLetter: z.string().trim().min(30, 'Cover letter must be at least 30 characters').max(5000),
    bidAmount: z.number().finite().min(1).max(1_000_000),
    deliveryDays: z.number().int().min(1).max(365),
  })
  .strict();

export const updateProposalSchema = z
  .object({
    coverLetter: z.string().trim().min(30).max(5000).optional(),
    bidAmount: z.number().finite().min(1).max(1_000_000).optional(),
    deliveryDays: z.number().int().min(1).max(365).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export const proposalIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid proposal id'),
});

export const jobIdParamSchema = z.object({
  jobId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid job id'),
});

export const proposalListQuerySchema = z.object({
  status: z.enum(PROPOSAL_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;
export type ProposalListQuery = z.infer<typeof proposalListQuerySchema>;
