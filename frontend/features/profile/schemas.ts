import { z } from 'zod';

const mediaUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) =>
      value === '' ||
      /^https?:\/\//i.test(value) ||
      /^\/api\/v1\/uploads\/[a-f\d]{24}\/content$/i.test(value),
    { message: 'Must be a valid URL or upload path' },
  );

export const portfolioItemSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  url: z.union([z.literal(''), z.string().trim().url()]).optional(),
  imageUrl: mediaUrl.optional().or(z.literal('')),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: mediaUrl.optional().or(z.literal('')),
  professionalTitle: z.string().trim().max(120).optional(),
  about: z.string().trim().max(5000).optional(),
  skillsText: z.string().optional(),
  hourlyRate: z.coerce.number().min(0).max(10000).optional().or(z.nan()).optional(),
  availability: z.enum(['available', 'busy', 'unavailable']).optional(),
  portfolio: z.array(portfolioItemSchema).max(20).optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type PortfolioItemFormValues = z.infer<typeof portfolioItemSchema>;
