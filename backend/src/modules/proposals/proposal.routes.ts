import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import * as proposalController from './proposal.controller';
import {
  createProposalSchema,
  jobIdParamSchema,
  proposalIdParamSchema,
  proposalListQuerySchema,
  updateProposalSchema,
} from './proposal.validation';

/** Nested under `/api/v1/jobs` */
const jobProposalsRouter = Router({ mergeParams: true });

jobProposalsRouter.post(
  '/',
  authenticate,
  authorize('freelancer'),
  validate(jobIdParamSchema, 'params'),
  validate(createProposalSchema),
  proposalController.submitProposal,
);

jobProposalsRouter.get(
  '/',
  authenticate,
  authorize('client'),
  validate(jobIdParamSchema, 'params'),
  validate(proposalListQuerySchema, 'query'),
  proposalController.listJobProposals,
);

jobProposalsRouter.get(
  '/mine',
  authenticate,
  authorize('freelancer'),
  validate(jobIdParamSchema, 'params'),
  proposalController.getMyProposalForJob,
);

/** Top-level `/api/v1/proposals` */
const proposalsRouter = Router();

proposalsRouter.get(
  '/:id',
  authenticate,
  validate(proposalIdParamSchema, 'params'),
  proposalController.getProposal,
);

proposalsRouter.patch(
  '/:id',
  authenticate,
  authorize('freelancer'),
  validate(proposalIdParamSchema, 'params'),
  validate(updateProposalSchema),
  proposalController.updateProposal,
);

proposalsRouter.post(
  '/:id/withdraw',
  authenticate,
  authorize('freelancer'),
  validate(proposalIdParamSchema, 'params'),
  proposalController.withdrawProposal,
);

proposalsRouter.post(
  '/:id/accept',
  authenticate,
  authorize('client'),
  validate(proposalIdParamSchema, 'params'),
  proposalController.acceptProposal,
);

proposalsRouter.post(
  '/:id/reject',
  authenticate,
  authorize('client'),
  validate(proposalIdParamSchema, 'params'),
  proposalController.rejectProposal,
);

export { jobProposalsRouter, proposalsRouter };
