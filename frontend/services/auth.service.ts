import { apiClient } from '@/lib/api-client';
import type { ApiSuccessResponse } from '@/types/api';
import type { User, UserRole } from '@/types/user';

export type AuthPayload = {
  accessToken: string;
  user: User;
  emailDelivery?: { verificationEmailQueued: boolean };
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: Extract<UserRole, 'client' | 'freelancer'>;
  acceptTerms: true;
};

export type LoginInput = {
  email: string;
  password: string;
};

export async function register(input: RegisterInput): Promise<AuthPayload> {
  const { data } = await apiClient.post<ApiSuccessResponse<AuthPayload>>(
    '/auth/register',
    input,
  );
  return data.data;
}

export async function login(input: LoginInput): Promise<AuthPayload> {
  const { data } = await apiClient.post<ApiSuccessResponse<AuthPayload>>(
    '/auth/login',
    input,
  );
  return data.data;
}

export async function refreshSession(): Promise<AuthPayload> {
  const { data } = await apiClient.post<ApiSuccessResponse<AuthPayload>>('/auth/refresh');
  return data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get<ApiSuccessResponse<{ user: User }>>('/auth/me');
  return data.data.user;
}

export async function verifyEmail(token: string): Promise<User> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ user: User }>>(
    '/auth/verify-email',
    { token },
  );
  return data.data.user;
}

export async function forgotPassword(email: string): Promise<string> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ message: string }>>(
    '/auth/forgot-password',
    { email },
  );
  return data.message ?? data.data.message;
}

export async function resetPassword(token: string, password: string): Promise<string> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ message: string }>>(
    '/auth/reset-password',
    { token, password },
  );
  return data.message ?? data.data.message;
}
