import { apiClient } from '@/lib/api-client';
import type { ApiSuccessResponse } from '@/types/api';
import type { AvailabilityStatus, PortfolioItem, PublicFreelancer, User } from '@/types/user';

export type UpdateProfileInput = {
  name?: string;
  bio?: string;
  avatarUrl?: string;
  professionalTitle?: string;
  about?: string;
  skills?: string[];
  hourlyRate?: number | null;
  availability?: AvailabilityStatus;
  portfolio?: Omit<PortfolioItem, '_id'>[];
};

export type FreelancerListResult = {
  items: PublicFreelancer[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export async function fetchMyProfile(): Promise<{ user: User; profileCompletion: number }> {
  const { data } = await apiClient.get<
    ApiSuccessResponse<{ user: User; profileCompletion: number }>
  >('/users/me');
  return data.data;
}

export async function updateMyProfile(
  input: UpdateProfileInput,
): Promise<{ user: User; profileCompletion: number }> {
  const { data } = await apiClient.patch<
    ApiSuccessResponse<{ user: User; profileCompletion: number }>
  >('/users/me', input);
  return data.data;
}

export async function listFreelancers(params?: {
  q?: string;
  skill?: string;
  page?: number;
  limit?: number;
}): Promise<FreelancerListResult> {
  const { data } = await apiClient.get<ApiSuccessResponse<FreelancerListResult>>(
    '/freelancers',
    { params },
  );
  return data.data;
}

export async function getFreelancer(id: string): Promise<PublicFreelancer> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ freelancer: PublicFreelancer }>>(
    `/freelancers/${id}`,
  );
  return data.data.freelancer;
}
