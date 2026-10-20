import { apiClient } from '@/lib/api-client';
import type { ApiSuccessResponse } from '@/types/api';
import type {
  ContractSummary,
  CreateProposalInput,
  Proposal,
  ProposalListResult,
  ProposalStatus,
  UpdateProposalInput,
} from '@/types/proposal';

export async function submitProposal(
  jobId: string,
  input: CreateProposalInput,
): Promise<Proposal> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ proposal: Proposal }>>(
    `/jobs/${jobId}/proposals`,
    input,
  );
  return data.data.proposal;
}

export async function listJobProposals(
  jobId: string,
  params?: { status?: ProposalStatus; page?: number; limit?: number },
): Promise<ProposalListResult> {
  const { data } = await apiClient.get<ApiSuccessResponse<ProposalListResult>>(
    `/jobs/${jobId}/proposals`,
    { params },
  );
  return data.data;
}

export async function listMyProposals(params?: {
  status?: ProposalStatus;
  page?: number;
  limit?: number;
}): Promise<ProposalListResult> {
  const { data } = await apiClient.get<ApiSuccessResponse<ProposalListResult>>(
    '/users/me/proposals',
    { params },
  );
  return data.data;
}

export async function getMyProposalForJob(jobId: string): Promise<Proposal | null> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ proposal: Proposal | null }>>(
    `/jobs/${jobId}/proposals/mine`,
  );
  return data.data.proposal;
}

export async function getProposal(id: string): Promise<Proposal> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ proposal: Proposal }>>(
    `/proposals/${id}`,
  );
  return data.data.proposal;
}

export async function updateProposal(id: string, input: UpdateProposalInput): Promise<Proposal> {
  const { data } = await apiClient.patch<ApiSuccessResponse<{ proposal: Proposal }>>(
    `/proposals/${id}`,
    input,
  );
  return data.data.proposal;
}

export async function withdrawProposal(id: string): Promise<Proposal> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ proposal: Proposal }>>(
    `/proposals/${id}/withdraw`,
  );
  return data.data.proposal;
}

export async function acceptProposal(
  id: string,
): Promise<{ proposal: Proposal; contract: ContractSummary }> {
  const { data } = await apiClient.post<
    ApiSuccessResponse<{ proposal: Proposal; contract: ContractSummary }>
  >(`/proposals/${id}/accept`);
  return data.data;
}

export async function rejectProposal(id: string): Promise<Proposal> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ proposal: Proposal }>>(
    `/proposals/${id}/reject`,
  );
  return data.data.proposal;
}
