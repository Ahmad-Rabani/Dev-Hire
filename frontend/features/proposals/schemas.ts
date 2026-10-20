import { z } from 'zod';

export const proposalFormSchema = z.object({
  coverLetter: z
    .string()
    .trim()
    .min(30, 'Cover letter must be at least 30 characters')
    .max(5000),
  bidAmount: z.coerce.number().min(1, 'Bid must be at least 1').max(1_000_000),
  deliveryDays: z.coerce.number().int().min(1).max(365),
});

export type ProposalFormValues = z.infer<typeof proposalFormSchema>;
