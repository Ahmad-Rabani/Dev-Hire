import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import * as notificationController from './notification.controller';
import {
  notificationIdParamSchema,
  notificationListQuerySchema,
} from './notification.validation';

const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get(
  '/',
  validate(notificationListQuerySchema, 'query'),
  notificationController.listNotifications,
);

notificationsRouter.get('/unread-count', notificationController.unreadCount);

notificationsRouter.patch(
  '/:id/read',
  validate(notificationIdParamSchema, 'params'),
  notificationController.markRead,
);

notificationsRouter.post('/read-all', notificationController.markAllRead);

export { notificationsRouter };
