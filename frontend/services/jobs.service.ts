import { apiClient } from '@/lib/api-client';
import type { ApiSuccessResponse } from '@/types/api';
import type {
  CreateJobInput,
  Job,
  JobListParams,
  JobListResult,
  JobStatus,
  UpdateJobInput,
} from '@/types/job';

export async function listJobs(params?: JobListParams): Promise<JobListResult> {
  const { data } = await apiClient.get<ApiSuccessResponse<JobListResult>>('/jobs', { params });
  return data.data;
}

export async function listMyJobs(params?: JobListParams): Promise<JobListResult> {
  const { data } = await apiClient.get<ApiSuccessResponse<JobListResult>>('/jobs/mine', {
    params,
  });
  return data.data;
}

export async function getJob(id: string): Promise<Job> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ job: Job }>>(`/jobs/${id}`);
  return data.data.job;
}

export async function createJob(input: CreateJobInput): Promise<Job> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ job: Job }>>('/jobs', input);
  return data.data.job;
}

export async function updateJob(id: string, input: UpdateJobInput): Promise<Job> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ job: Job }>>(`/jobs/${id}`, input);
  return data.data.job;
}

export async function changeJobStatus(id: string, status: JobStatus): Promise<Job> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ job: Job }>>(`/jobs/${id}/status`, {
    status,
  });
  return data.data.job;
}

export async function deleteJob(id: string): Promise<void> {
  await apiClient.delete(`/jobs/${id}`);
}
