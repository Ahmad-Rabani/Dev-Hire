import { apiClient } from '@/lib/api-client';
import type { ApiSuccessResponse, HealthData } from '@/types/api';

export async function fetchHealth(): Promise<HealthData> {
  const { data } = await apiClient.get<ApiSuccessResponse<HealthData>>('/health');
  return data.data;
}
