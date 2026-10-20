import { z } from 'zod';

export const jobFormSchema = z
  .object({
    title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
    description: z
      .string()
      .trim()
      .min(20, 'Description must be at least 20 characters')
      .max(10000),
    skillsText: z.string().trim().min(1, 'Add at least one skill'),
    budgetType: z.enum(['fixed', 'hourly']),
    budgetMin: z.coerce.number().min(0).max(1_000_000),
    budgetMax: z.coerce.number().min(0).max(1_000_000),
    currency: z.string().trim().length(3),
    deadline: z.string().min(1, 'Deadline is required'),
    status: z.enum(['draft', 'open']),
  })
  .refine((data) => data.budgetMin <= data.budgetMax, {
    message: 'Minimum budget cannot exceed maximum budget',
    path: ['budgetMin'],
  })
  .refine((data) => new Date(data.deadline).getTime() > Date.now(), {
    message: 'Deadline must be in the future',
    path: ['deadline'],
  });

export type JobFormValues = z.infer<typeof jobFormSchema>;

export function skillsFromText(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ].slice(0, 20);
}
