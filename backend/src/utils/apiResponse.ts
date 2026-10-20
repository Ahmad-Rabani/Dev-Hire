import type { Response } from 'express';
import type { FieldError } from './AppError';

export type ApiSuccessBody<T> = {
  success: true;
  message?: string;
  data: T;
};

export type ApiErrorBody = {
  success: false;
  message: string;
  errors?: FieldError[];
};

export function sendSuccess<T>(
  res: Response,
  data: T,
  options?: { statusCode?: number; message?: string },
): void {
  const body: ApiSuccessBody<T> = {
    success: true,
    data,
  };
  if (options?.message) {
    body.message = options.message;
  }
  res.status(options?.statusCode ?? 200).json(body);
}

export function sendError(
  res: Response,
  message: string,
  options?: { statusCode?: number; errors?: FieldError[] },
): void {
  const body: ApiErrorBody = {
    success: false,
    message,
  };
  if (options?.errors?.length) {
    body.errors = options.errors;
  }
  res.status(options?.statusCode ?? 500).json(body);
}
