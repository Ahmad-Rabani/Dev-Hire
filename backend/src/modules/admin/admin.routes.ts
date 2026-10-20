import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import * as dashboardController from '../dashboard/dashboard.controller';
import * as adminController from './admin.controller';
import {
  adminAuditListQuerySchema,
  adminJobIdParamSchema,
  adminJobListQuerySchema,
  adminJobModerationSchema,
  adminReportIdParamSchema,
  adminReportListQuerySchema,
  adminReportStatusSchema,
  adminUserIdParamSchema,
  adminUserListQuerySchema,
  adminUserStatusSchema,
} from './admin.validation';

const adminRouter = Router();

adminRouter.use(authenticate, authorize('admin'));

adminRouter.get('/dashboard', dashboardController.getAdminDashboard);

adminRouter.get('/users', validate(adminUserListQuerySchema, 'query'), adminController.listUsers);
adminRouter.get(
  '/users/:id',
  validate(adminUserIdParamSchema, 'params'),
  adminController.getUser,
);
adminRouter.patch(
  '/users/:id/status',
  validate(adminUserIdParamSchema, 'params'),
  validate(adminUserStatusSchema),
  adminController.updateUserStatus,
);

adminRouter.get('/jobs', validate(adminJobListQuerySchema, 'query'), adminController.listJobs);
adminRouter.get('/jobs/:id', validate(adminJobIdParamSchema, 'params'), adminController.getJob);
adminRouter.patch(
  '/jobs/:id/moderation',
  validate(adminJobIdParamSchema, 'params'),
  validate(adminJobModerationSchema),
  adminController.moderateJob,
);

adminRouter.get(
  '/reports',
  validate(adminReportListQuerySchema, 'query'),
  adminController.listReports,
);
adminRouter.get(
  '/reports/:id',
  validate(adminReportIdParamSchema, 'params'),
  adminController.getReport,
);
adminRouter.patch(
  '/reports/:id/status',
  validate(adminReportIdParamSchema, 'params'),
  validate(adminReportStatusSchema),
  adminController.updateReportStatus,
);

adminRouter.get(
  '/audit-logs',
  validate(adminAuditListQuerySchema, 'query'),
  adminController.listAuditLogs,
);

export { adminRouter };
