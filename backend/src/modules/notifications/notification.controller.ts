import { getValidatedParams, getValidatedQuery } from '../../middleware/validate';
import { sendSuccess } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as notificationService from './notification.service';
import type { NotificationListQuery } from './notification.validation';

export const listNotifications = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<NotificationListQuery>(req);
  const data = await notificationService.listMyNotifications(req.user!.id, {
    unreadOnly: query.unreadOnly,
    page: query.page,
    limit: query.limit,
  });
  sendSuccess(res, data);
});

export const unreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user!.id);
  sendSuccess(res, { count });
});

export const markRead = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const notification = await notificationService.markAsRead(req.user!.id, id);
  sendSuccess(res, { notification }, { message: 'Notification marked as read' });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user!.id);
  sendSuccess(res, result, { message: 'All notifications marked as read' });
});
