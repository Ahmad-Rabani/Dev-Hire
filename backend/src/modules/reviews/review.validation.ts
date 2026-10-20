import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const reviewContractParamSchema = z.object({
  contractId: objectId,
});

export const freelancerIdParamSchema = z.object({
  id: objectId,
});

export const createReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(10).max(2000),
  })
  .strict();

export const freelancerReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type FreelancerReviewsQuery = z.infer<typeof freelancerReviewsQuerySchema>;
