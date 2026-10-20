import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '@/lib/env';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiErrorResponse, ApiSuccessResponse } from '@/types/api';
import type { User } from '@/types/user';

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/**
 * Central Axios instance for all API calls.
 * - Access token from in-memory Zustand store (Authorization header)
 * - Refresh token via HttpOnly cookie (withCredentials)
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<ApiSuccessResponse<{ accessToken: string; user: User }>>(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .then((response) => {
        const { accessToken, user } = response.data.data;
        useAuthStore.getState().setSession(accessToken, user);
        return accessToken;
      })
      .catch(() => {
        useAuthStore.getState().clearSession();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';

    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password');

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
    }

    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    return axiosError.response?.data?.message ?? axiosError.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function getApiFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {};
  const fields = (error as AxiosError<ApiErrorResponse>).response?.data?.errors;
  if (!fields?.length) return {};
  return Object.fromEntries(fields.map((item) => [item.field, item.message]));
}
