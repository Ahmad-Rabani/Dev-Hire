import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import * as proposalController from '../proposals/proposal.controller';
import { proposalListQuerySchema } from '../proposals/proposal.validation';
import {
  freelancerIdParamSchema,
  freelancerReviewsQuerySchema,
} from '../reviews/review.validation';
import * as userController from './user.controller';
import {
  freelancerListQuerySchema,
  mongoIdParamSchema,
  updateMeSchema,
} from './user.validation';

const usersRouter = Router();

usersRouter.get('/me', authenticate, userController.getMe);
usersRouter.patch('/me', authenticate, validate(updateMeSchema), userController.updateMe);

usersRouter.get(
  '/me/proposals',
  authenticate,
  authorize('freelancer'),
  validate(proposalListQuerySchema, 'query'),
  proposalController.listMyProposals,
);

const freelancersRouter = Router();

freelancersRouter.get(
  '/',
  validate(freelancerListQuerySchema, 'query'),
  userController.listFreelancers,
);

freelancersRouter.get(
  '/:id/reviews',
  validate(freelancerIdParamSchema, 'params'),
  validate(freelancerReviewsQuerySchema, 'query'),
  userController.listFreelancerReviews,
);

freelancersRouter.get(
  '/:id',
  validate(mongoIdParamSchema, 'params'),
  userController.getFreelancer,
);

export { usersRouter, freelancersRouter };
