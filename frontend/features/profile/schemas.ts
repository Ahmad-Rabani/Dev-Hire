import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z.string().trim().url().optional().or(z.literal('')),
  professionalTitle: z.string().trim().max(120).optional(),
  about: z.string().trim().max(5000).optional(),
  skillsText: z.string().optional(),
  hourlyRate: z.coerce.number().min(0).max(10000).optional().or(z.nan()).optional(),
  availability: z.enum(['available', 'busy', 'unavailable']).optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
