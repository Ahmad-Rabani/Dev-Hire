import { z } from 'zod';
import { BUDGET_TYPES, JOB_SORT_FIELDS, JOB_STATUSES } from './job.types';

const skillSchema = z.string().trim().min(1).max(40);

function normalizeSkills(skills: string[]): string[] {
  const unique = new Set(skills.map((s) => s.trim()).filter(Boolean));
  return [...unique];
}

const budgetFields = {
  budgetType: z.enum(BUDGET_TYPES),
  budgetMin: z.number().finite().min(0).max(1_000_000),
  budgetMax: z.number().finite().min(0).max(1_000_000),
  currency: z.string().trim().length(3).toUpperCase().default('USD'),
};

function withBudgetOrder<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const data = value as { budgetMin?: number; budgetMax?: number };
    if (
      typeof data.budgetMin === 'number' &&
      typeof data.budgetMax === 'number' &&
      data.budgetMin > data.budgetMax
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['budgetMin'],
        message: 'Minimum budget cannot exceed maximum budget',
      });
    }
  });
}

const deadlineSchema = z.coerce.date().refine((date) => !Number.isNaN(date.getTime()), {
  message: 'Invalid deadline',
});

export const createJobSchema = withBudgetOrder(
  z.object({
    title: z.string().trim().min(5).max(120),
    description: z.string().trim().min(20).max(10000),
    skills: z
      .array(skillSchema)
      .min(1)
      .max(20)
      .transform(normalizeSkills),
    ...budgetFields,
    deadline: deadlineSchema.refine((date) => date.getTime() > Date.now(), {
      message: 'Deadline must be in the future',
    }),
    status: z.enum(['draft', 'open']).default('draft'),
  }),
);

export const updateJobSchema = withBudgetOrder(
  z
    .object({
      title: z.string().trim().min(5).max(120).optional(),
      description: z.string().trim().min(20).max(10000).optional(),
      skills: z.array(skillSchema).min(1).max(20).transform(normalizeSkills).optional(),
      budgetType: z.enum(BUDGET_TYPES).optional(),
      budgetMin: z.number().finite().min(0).max(1_000_000).optional(),
      budgetMax: z.number().finite().min(0).max(1_000_000).optional(),
      currency: z.string().trim().length(3).toUpperCase().optional(),
      deadline: deadlineSchema
        .refine((date) => date.getTime() > Date.now(), {
          message: 'Deadline must be in the future',
        })
        .optional(),
    })
    .strict(),
);

export const changeJobStatusSchema = z.object({
  status: z.enum(JOB_STATUSES),
});

export const mongoIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid job id'),
});

const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

export const jobListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  budgetType: z.enum(BUDGET_TYPES).optional(),
  minBudget: z.coerce.number().finite().min(0).max(1_000_000).optional(),
  maxBudget: z.coerce.number().finite().min(0).max(1_000_000).optional(),
  skills: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) =>
      value
        ? value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 10)
        : undefined,
    ),
  /** Owner listings only — ignored / forced for public browse. */
  status: z.enum(JOB_STATUSES).optional(),
  sortBy: z.enum(JOB_SORT_FIELDS).default('createdAt'),
  sortOrder: sortOrderSchema,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type ChangeJobStatusInput = z.infer<typeof changeJobStatusSchema>;
export type JobListQuery = z.infer<typeof jobListQuerySchema>;
