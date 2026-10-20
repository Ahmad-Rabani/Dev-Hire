import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { env } from '../../config/env';
import { authenticate } from '../../middleware/authenticate';
import { optionalAuth } from '../../middleware/optionalAuth';
import { validate } from '../../middleware/validate';
import { badRequest } from '../../utils/AppError';
import * as uploadController from './upload.controller';
import { uploadIdParamSchema, uploadMetaSchema } from './upload.validation';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});

function singleFile(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      next(badRequest(err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message));
      return;
    }
    if (err) {
      next(err as Error);
      return;
    }
    next();
  });
}

const uploadsRouter = Router();

uploadsRouter.post('/', authenticate, singleFile, validate(uploadMetaSchema), uploadController.createUpload);

uploadsRouter.get(
  '/:id',
  authenticate,
  validate(uploadIdParamSchema, 'params'),
  uploadController.getUpload,
);

uploadsRouter.get(
  '/:id/content',
  optionalAuth,
  validate(uploadIdParamSchema, 'params'),
  uploadController.getUploadContent,
);

export { uploadsRouter };
