import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { createReviewSchema, reviewContractParamSchema } from '../reviews/review.validation';
import * as contractController from './contract.controller';
import {
  cancelContractSchema,
  contractIdOnlyParamSchema,
  contractIdParamSchema,
  contractListQuerySchema,
  contractMilestoneParamsSchema,
  createMilestoneSchema,
  requestRevisionSchema,
  submitMilestoneSchema,
  updateMilestoneSchema,
} from './contract.validation';

const contractsRouter = Router();

contractsRouter.get(
  '/',
  authenticate,
  authorize('client', 'freelancer'),
  validate(contractListQuerySchema, 'query'),
  contractController.listMyContracts,
);

contractsRouter.get(
  '/:id',
  authenticate,
  authorize('client', 'freelancer'),
  validate(contractIdParamSchema, 'params'),
  contractController.getContract,
);

contractsRouter.patch(
  '/:id/complete',
  authenticate,
  authorize('client'),
  validate(contractIdParamSchema, 'params'),
  contractController.completeContract,
);

contractsRouter.post(
  '/:id/cancel',
  authenticate,
  authorize('client', 'freelancer'),
  validate(contractIdParamSchema, 'params'),
  validate(cancelContractSchema),
  contractController.cancelContract,
);

contractsRouter.post(
  '/:contractId/milestones',
  authenticate,
  authorize('client'),
  validate(contractIdOnlyParamSchema, 'params'),
  validate(createMilestoneSchema),
  contractController.addMilestone,
);

contractsRouter.patch(
  '/:contractId/milestones/:milestoneId',
  authenticate,
  authorize('client'),
  validate(contractMilestoneParamsSchema, 'params'),
  validate(updateMilestoneSchema),
  contractController.updateMilestone,
);

contractsRouter.delete(
  '/:contractId/milestones/:milestoneId',
  authenticate,
  authorize('client'),
  validate(contractMilestoneParamsSchema, 'params'),
  contractController.deleteMilestone,
);

contractsRouter.post(
  '/:contractId/milestones/:milestoneId/submit',
  authenticate,
  authorize('freelancer'),
  validate(contractMilestoneParamsSchema, 'params'),
  validate(submitMilestoneSchema),
  contractController.submitMilestone,
);

contractsRouter.post(
  '/:contractId/milestones/:milestoneId/approve',
  authenticate,
  authorize('client'),
  validate(contractMilestoneParamsSchema, 'params'),
  contractController.approveMilestone,
);

contractsRouter.post(
  '/:contractId/milestones/:milestoneId/request-revision',
  authenticate,
  authorize('client'),
  validate(contractMilestoneParamsSchema, 'params'),
  validate(requestRevisionSchema),
  contractController.requestRevision,
);

contractsRouter.post(
  '/:contractId/reviews',
  authenticate,
  authorize('client', 'freelancer'),
  validate(reviewContractParamSchema, 'params'),
  validate(createReviewSchema),
  contractController.createReview,
);

contractsRouter.get(
  '/:contractId/reviews',
  authenticate,
  authorize('client', 'freelancer'),
  validate(reviewContractParamSchema, 'params'),
  contractController.listContractReviews,
);

export { contractsRouter };
