import { apiClient } from '@/lib/api-client';
import type { ApiSuccessResponse } from '@/types/api';
import type {
  AdminDashboard,
  AdminReport,
  AdminUser,
  AdminUserDetail,
  AuditLogEntry,
  ClientDashboard,
  FreelancerDashboard,
  PaginationMeta,
} from '@/types/dashboard';
import type { Job, JobModerationStatus, JobStatus } from '@/types/job';

export async function getClientDashboard(): Promise<ClientDashboard> {
  const { data } = await apiClient.get<ApiSuccessResponse<ClientDashboard>>('/client/dashboard');
  return data.data;
}

export async function getFreelancerDashboard(): Promise<FreelancerDashboard> {
  const { data } = await apiClient.get<ApiSuccessResponse<FreelancerDashboard>>(
    '/freelancer/dashboard',
  );
  return data.data;
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const { data } = await apiClient.get<ApiSuccessResponse<AdminDashboard>>('/admin/dashboard');
  return data.data;
}

export async function listAdminUsers(params?: {
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}): Promise<{ users: AdminUser[]; pagination: PaginationMeta }> {
  const { data } = await apiClient.get<
    ApiSuccessResponse<{ users: AdminUser[]; pagination: PaginationMeta }>
  >('/admin/users', { params });
  return data.data;
}

export async function getAdminUser(id: string): Promise<AdminUserDetail> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ user: AdminUserDetail }>>(
    `/admin/users/${id}`,
  );
  return data.data.user;
}

export async function updateAdminUserStatus(
  id: string,
  input: { status: 'active' | 'suspended'; reason?: string },
): Promise<AdminUser> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ user: AdminUser }>>(
    `/admin/users/${id}/status`,
    input,
  );
  return data.data.user;
}

export async function listAdminJobs(params?: {
  search?: string;
  status?: JobStatus;
  moderationStatus?: JobModerationStatus;
  page?: number;
  limit?: number;
}): Promise<{
  jobs: Array<Job & { moderationReason?: string; moderatedAt?: string }>;
  pagination: PaginationMeta;
}> {
  const { data } = await apiClient.get<
    ApiSuccessResponse<{
      jobs: Array<Job & { moderationReason?: string; moderatedAt?: string }>;
      pagination: PaginationMeta;
    }>
  >('/admin/jobs', { params });
  return data.data;
}

export async function moderateAdminJob(
  id: string,
  input: { moderationStatus: JobModerationStatus; reason: string },
): Promise<Job> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ job: Job }>>(
    `/admin/jobs/${id}/moderation`,
    input,
  );
  return data.data.job;
}

export async function listAdminReports(params?: {
  status?: string;
  targetType?: string;
  page?: number;
  limit?: number;
}): Promise<{ reports: AdminReport[]; pagination: PaginationMeta }> {
  const { data } = await apiClient.get<
    ApiSuccessResponse<{ reports: AdminReport[]; pagination: PaginationMeta }>
  >('/admin/reports', { params });
  return data.data;
}

export async function updateAdminReportStatus(
  id: string,
  input: { status: 'under_review' | 'resolved' | 'dismissed'; resolutionNote: string },
): Promise<AdminReport> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ report: AdminReport }>>(
    `/admin/reports/${id}/status`,
    input,
  );
  return data.data.report;
}

export async function listAuditLogs(params?: {
  action?: string;
  targetType?: string;
  page?: number;
  limit?: number;
}): Promise<{ logs: AuditLogEntry[]; pagination: PaginationMeta }> {
  const { data } = await apiClient.get<
    ApiSuccessResponse<{ logs: AuditLogEntry[]; pagination: PaginationMeta }>
  >('/admin/audit-logs', { params });
  return data.data;
}

export async function createReport(input: {
  targetType: 'job' | 'user' | 'review';
  targetId: string;
  category: 'spam' | 'harassment' | 'inappropriate' | 'scam' | 'other';
  explanation: string;
}): Promise<AdminReport> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ report: AdminReport }>>(
    '/reports',
    input,
  );
  return data.data.report;
}
