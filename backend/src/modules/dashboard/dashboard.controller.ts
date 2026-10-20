import { sendSuccess } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as dashboardService from './dashboard.service';

export const getClientDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getClientDashboard(req.user!.id);
  sendSuccess(res, data);
});

export const getFreelancerDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getFreelancerDashboard(req.user!.id);
  sendSuccess(res, data);
});

export const getAdminDashboard = asyncHandler(async (_req, res) => {
  const data = await dashboardService.getAdminDashboard();
  sendSuccess(res, data);
});
