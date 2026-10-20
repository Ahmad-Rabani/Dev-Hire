import { getValidatedParams } from '../../middleware/validate';
import { sendSuccess } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { badRequest } from '../../utils/AppError';
import * as uploadService from './upload.service';
import type { UploadMetaInput } from './upload.validation';
import type { UploadPurpose } from './upload.types';

export const createUpload = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    throw badRequest('A file is required');
  }

  const meta = req.body as UploadMetaInput;
  const upload = await uploadService.createUpload({
    ownerId: req.user!.id,
    purpose: meta.purpose as UploadPurpose,
    originalName: file.originalname || 'upload',
    buffer: file.buffer,
    resourceType: meta.resourceType,
    resourceId: meta.resourceId,
  });

  sendSuccess(res, { upload }, { statusCode: 201, message: 'File uploaded' });
});

export const getUpload = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const upload = await uploadService.getUploadMeta(id);
  sendSuccess(res, { upload });
});

export const getUploadContent = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const file = await uploadService.authorizeAndReadUpload(id, req.user);

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prefer download for private docs; allow inline for images.
  const disposition = file.mimeType.startsWith('image/')
    ? 'inline'
    : `attachment; filename="${encodeURIComponent(file.originalName)}"`;
  res.setHeader('Content-Disposition', disposition);
  res.setHeader('Cache-Control', file.visibility === 'public' ? 'public, max-age=3600' : 'private, no-store');
  res.status(200).send(file.buffer);
});
