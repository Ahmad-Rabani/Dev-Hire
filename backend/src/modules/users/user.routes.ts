import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import * as userController from './user.controller';
import {
  freelancerListQuerySchema,
  mongoIdParamSchema,
  updateMeSchema,
} from './user.validation';

const usersRouter = Router();

usersRouter.get('/me', authenticate, userController.getMe);
usersRouter.patch('/me', authenticate, validate(updateMeSchema), userController.updateMe);

const freelancersRouter = Router();

freelancersRouter.get(
  '/',
  validate(freelancerListQuerySchema, 'query'),
  userController.listFreelancers,
);

freelancersRouter.get(
  '/:id',
  validate(mongoIdParamSchema, 'params'),
  userController.getFreelancer,
);

export { usersRouter, freelancersRouter };
