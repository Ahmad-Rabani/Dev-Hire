import { z } from 'zod';
import { AVAILABILITY_STATUSES } from './user.types';

const portfolioItemSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  url: z.string().trim().url().max(500).optional().or(z.literal('')),
  imageUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
});

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    bio: z.string().trim().max(500).optional(),
    avatarUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
    professionalTitle: z.string().trim().max(120).optional(),
    about: z.string().trim().max(5000).optional(),
    skills: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
    hourlyRate: z.number().min(0).max(10000).optional().nullable(),
    availability: z.enum(AVAILABILITY_STATUSES).optional(),
    portfolio: z.array(portfolioItemSchema).max(20).optional(),
  })
  .strict();

export const freelancerListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  skill: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const mongoIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id'),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type FreelancerListQuery = z.infer<typeof freelancerListQuerySchema>;
