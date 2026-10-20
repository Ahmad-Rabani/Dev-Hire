import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import { optionalAuth } from '../../middleware/optionalAuth';
import { validate } from '../../middleware/validate';
import { jobProposalsRouter } from '../proposals/proposal.routes';
import * as jobController from './job.controller';
import {
  changeJobStatusSchema,
  createJobSchema,
  jobListQuerySchema,
  mongoIdParamSchema,
  updateJobSchema,
} from './job.validation';

const jobsRouter = Router();

jobsRouter.get('/', validate(jobListQuerySchema, 'query'), jobController.listPublicJobs);

// Nested proposals: /api/v1/jobs/:jobId/proposals
jobsRouter.use('/:jobId/proposals', jobProposalsRouter);

jobsRouter.get(
  '/mine',
  authenticate,
  authorize('client'),
  validate(jobListQuerySchema, 'query'),
  jobController.listMyJobs,
);

jobsRouter.post(
  '/',
  authenticate,
  authorize('client'),
  validate(createJobSchema),
  jobController.createJob,
);

jobsRouter.get(
  '/:id',
  validate(mongoIdParamSchema, 'params'),
  optionalAuth,
  jobController.getJob,
);

jobsRouter.patch(
  '/:id',
  authenticate,
  authorize('client'),
  validate(mongoIdParamSchema, 'params'),
  validate(updateJobSchema),
  jobController.updateJob,
);

jobsRouter.post(
  '/:id/status',
  authenticate,
  authorize('client'),
  validate(mongoIdParamSchema, 'params'),
  validate(changeJobStatusSchema),
  jobController.changeJobStatus,
);

jobsRouter.delete(
  '/:id',
  authenticate,
  authorize('client'),
  validate(mongoIdParamSchema, 'params'),
  jobController.deleteJob,
);

export { jobsRouter };
