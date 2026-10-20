import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { isProduction } from '../config/env';

/**
 * Express 5 / 4 async errors: wrap handlers or use this as the final middleware.
 * Controllers should `next(error)` or throw inside async handlers that are wrapped.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational AppError', { message: err.message, stack: err.stack });
    }
    sendError(res, err.message, {
      statusCode: err.statusCode,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, 'Validation failed', {
      statusCode: 400,
      errors: err.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      })),
    });
    return;
  }

  logger.error('Unhandled error', {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  sendError(res, isProduction ? 'Internal server error' : getDevMessage(err), {
    statusCode: 500,
  });
}

function getDevMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return 'Internal server error';
}
