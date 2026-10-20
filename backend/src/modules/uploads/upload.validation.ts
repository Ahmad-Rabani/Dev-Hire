import { z } from 'zod';
import { UPLOAD_PURPOSES } from './upload.types';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const uploadMetaSchema = z
  .object({
    purpose: z.enum(UPLOAD_PURPOSES),
    resourceType: z.enum(['job', 'contract', 'portfolio']).optional(),
    resourceId: objectId.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if ((data.resourceType && !data.resourceId) || (!data.resourceType && data.resourceId)) {
      ctx.addIssue({
        code: 'custom',
        message: 'resourceType and resourceId must be provided together',
      });
    }
  });

export const uploadIdParamSchema = z.object({
  id: objectId,
});

export type UploadMetaInput = z.infer<typeof uploadMetaSchema>;
