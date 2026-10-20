import { sendSuccess } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as adminService from '../admin/admin.service';
import type { CreateReportInput } from '../admin/admin.validation';

export const createReport = asyncHandler(async (req, res) => {
  const body = req.body as CreateReportInput;
  const report = await adminService.createReport(req.user!.id, body);
  sendSuccess(res, { report }, { statusCode: 201, message: 'Report submitted' });
});
