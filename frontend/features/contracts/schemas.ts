import { z } from 'zod';

export const milestoneFormSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(5000),
  amount: z.coerce.number().finite().min(0).max(1_000_000),
  dueDate: z.string().min(1, 'Due date is required'),
});

export const submitMilestoneSchema = z.object({
  submissionNotes: z.string().trim().min(10).max(5000),
  deliverableUrl: z.union([z.literal(''), z.string().trim().url('Must be a valid URL').max(500)]),
  deliverableUploadIds: z.array(z.string()).max(5).optional(),
});

export const revisionSchema = z.object({
  feedback: z.string().trim().min(10).max(2000),
});

export const cancelSchema = z.object({
  reason: z.string().trim().min(10).max(1000),
});

export const reviewFormSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(2000),
});

export type MilestoneFormValues = z.infer<typeof milestoneFormSchema>;
export type SubmitMilestoneValues = z.infer<typeof submitMilestoneSchema>;
export type RevisionValues = z.infer<typeof revisionSchema>;
export type CancelValues = z.infer<typeof cancelSchema>;
export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
