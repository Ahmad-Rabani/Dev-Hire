import { getValidatedParams, getValidatedQuery } from '../../middleware/validate';
import { sendSuccess } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as adminService from './admin.service';
import type {
  AdminAuditListQuery,
  AdminJobListQuery,
  AdminJobModerationInput,
  AdminReportListQuery,
  AdminReportStatusInput,
  AdminUserListQuery,
  AdminUserStatusInput,
} from './admin.validation';

export const listUsers = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<AdminUserListQuery>(req);
  const data = await adminService.listUsers(query);
  sendSuccess(res, data);
});

export const getUser = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const user = await adminService.getUserDetail(id);
  sendSuccess(res, { user });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const body = req.body as AdminUserStatusInput;
  const user = await adminService.updateUserStatus(req.user!.id, id, body);
  sendSuccess(res, { user }, { message: `User ${body.status}` });
});

export const listJobs = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<AdminJobListQuery>(req);
  const data = await adminService.listJobsForAdmin(query);
  sendSuccess(res, data);
});

export const getJob = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const job = await adminService.getJobForAdmin(id);
  sendSuccess(res, { job });
});

export const moderateJob = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const body = req.body as AdminJobModerationInput;
  const job = await adminService.moderateJob(req.user!.id, id, body);
  sendSuccess(res, { job }, { message: `Job moderation set to ${body.moderationStatus}` });
});

export const listReports = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<AdminReportListQuery>(req);
  const data = await adminService.listReports(query);
  sendSuccess(res, data);
});

export const getReport = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const report = await adminService.getReport(id);
  sendSuccess(res, { report });
});

export const updateReportStatus = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const body = req.body as AdminReportStatusInput;
  const report = await adminService.updateReportStatus(req.user!.id, id, body);
  sendSuccess(res, { report }, { message: `Report ${body.status}` });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<AdminAuditListQuery>(req);
  const data = await adminService.listAuditLogs(query);
  sendSuccess(res, data);
});
