import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { createReportSchema } from '../admin/admin.validation';
import * as reportController from './report.controller';

const reportsRouter = Router();

reportsRouter.post(
  '/',
  authenticate,
  validate(createReportSchema),
  reportController.createReport,
);

export { reportsRouter };
