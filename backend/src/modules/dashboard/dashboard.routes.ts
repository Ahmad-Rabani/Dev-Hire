import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import * as dashboardController from './dashboard.controller';

const clientDashboardRouter = Router();
clientDashboardRouter.get(
  '/dashboard',
  authenticate,
  authorize('client'),
  dashboardController.getClientDashboard,
);

const freelancerDashboardRouter = Router();
freelancerDashboardRouter.get(
  '/dashboard',
  authenticate,
  authorize('freelancer'),
  dashboardController.getFreelancerDashboard,
);

export { clientDashboardRouter, freelancerDashboardRouter };
