import { sendSuccess } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import { getValidatedParams, getValidatedQuery } from '../../middleware/validate';
import * as jobService from './job.service';
import type {
  ChangeJobStatusInput,
  CreateJobInput,
  JobListQuery,
  UpdateJobInput,
} from './job.validation';

export const createJob = asyncHandler(async (req, res) => {
  const body = req.body as CreateJobInput;
  const job = await jobService.createJob(req.user!.id, body);
  sendSuccess(res, { job }, { statusCode: 201, message: 'Job created' });
});

export const listPublicJobs = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<JobListQuery>(req);
  const data = await jobService.listPublicJobs(query);
  sendSuccess(res, data);
});

export const listMyJobs = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<JobListQuery>(req);
  const data = await jobService.listMyJobs(req.user!.id, query);
  sendSuccess(res, data);
});

export const getJob = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const job = await jobService.getJobById(id, req.user);
  sendSuccess(res, { job });
});

export const updateJob = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const body = req.body as UpdateJobInput;
  const job = await jobService.updateJob(id, req.user!.id, body);
  sendSuccess(res, { job }, { message: 'Job updated' });
});

export const changeJobStatus = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  const body = req.body as ChangeJobStatusInput;
  const job = await jobService.changeJobStatus(id, req.user!.id, body);
  sendSuccess(res, { job }, { message: 'Job status updated' });
});

export const deleteJob = asyncHandler(async (req, res) => {
  const { id } = getValidatedParams<{ id: string }>(req);
  await jobService.deleteJob(id, req.user!.id);
  sendSuccess(res, null, { message: 'Job deleted' });
});
