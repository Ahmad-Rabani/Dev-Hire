import { apiClient } from '@/lib/api-client';
import type { ApiSuccessResponse } from '@/types/api';
import type {
  CancelContractInput,
  ContractDetail,
  ContractListResult,
  ContractStatus,
  CreateMilestoneInput,
  CreateReviewInput,
  FreelancerReviewsResult,
  RequestRevisionInput,
  Review,
  SubmitMilestoneInput,
  UpdateMilestoneInput,
} from '@/types/contract';

export async function listContracts(params?: {
  status?: ContractStatus;
  page?: number;
  limit?: number;
}): Promise<ContractListResult> {
  const { data } = await apiClient.get<ApiSuccessResponse<ContractListResult>>('/contracts', {
    params,
  });
  return data.data;
}

export async function getContract(id: string): Promise<ContractDetail> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ contract: ContractDetail }>>(
    `/contracts/${id}`,
  );
  return data.data.contract;
}

export async function completeContract(id: string): Promise<ContractDetail> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ contract: ContractDetail }>>(
    `/contracts/${id}/complete`,
  );
  return data.data.contract;
}

export async function cancelContract(
  id: string,
  input: CancelContractInput,
): Promise<ContractDetail> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ contract: ContractDetail }>>(
    `/contracts/${id}/cancel`,
    input,
  );
  return data.data.contract;
}

export async function addMilestone(
  contractId: string,
  input: CreateMilestoneInput,
): Promise<ContractDetail> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ contract: ContractDetail }>>(
    `/contracts/${contractId}/milestones`,
    input,
  );
  return data.data.contract;
}

export async function updateMilestone(
  contractId: string,
  milestoneId: string,
  input: UpdateMilestoneInput,
): Promise<ContractDetail> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ contract: ContractDetail }>>(
    `/contracts/${contractId}/milestones/${milestoneId}`,
    input,
  );
  return data.data.contract;
}

export async function deleteMilestone(
  contractId: string,
  milestoneId: string,
): Promise<ContractDetail> {
  const { data } = await apiClient.delete<ApiSuccessResponse<{ contract: ContractDetail }>>(
    `/contracts/${contractId}/milestones/${milestoneId}`,
  );
  return data.data.contract;
}

export async function submitMilestone(
  contractId: string,
  milestoneId: string,
  input: SubmitMilestoneInput,
): Promise<ContractDetail> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ contract: ContractDetail }>>(
    `/contracts/${contractId}/milestones/${milestoneId}/submit`,
    input,
  );
  return data.data.contract;
}

export async function approveMilestone(
  contractId: string,
  milestoneId: string,
): Promise<ContractDetail> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ contract: ContractDetail }>>(
    `/contracts/${contractId}/milestones/${milestoneId}/approve`,
  );
  return data.data.contract;
}

export async function requestMilestoneRevision(
  contractId: string,
  milestoneId: string,
  input: RequestRevisionInput,
): Promise<ContractDetail> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ contract: ContractDetail }>>(
    `/contracts/${contractId}/milestones/${milestoneId}/request-revision`,
    input,
  );
  return data.data.contract;
}

export async function createReview(
  contractId: string,
  input: CreateReviewInput,
): Promise<Review> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ review: Review }>>(
    `/contracts/${contractId}/reviews`,
    input,
  );
  return data.data.review;
}

export async function listContractReviews(contractId: string): Promise<Review[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ reviews: Review[] }>>(
    `/contracts/${contractId}/reviews`,
  );
  return data.data.reviews;
}

export async function listFreelancerReviews(
  freelancerId: string,
  params?: { page?: number; limit?: number },
): Promise<FreelancerReviewsResult> {
  const { data } = await apiClient.get<ApiSuccessResponse<FreelancerReviewsResult>>(
    `/freelancers/${freelancerId}/reviews`,
    { params },
  );
  return data.data;
}
