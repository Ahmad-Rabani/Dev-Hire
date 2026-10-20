import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { badRequest } from '../utils/AppError';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Validates a request part with Zod.
 * Express 5 makes `req.query` (and sometimes `params`) read-only, so coerced
 * values for those parts are stored on `req.validated` instead.
 */
export function validate(schema: ZodType, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      next(
        badRequest(
          'Validation failed',
          result.error.issues.map((issue) => ({
            field: issue.path.join('.') || part,
            message: issue.message,
          })),
        ),
      );
      return;
    }

    if (part === 'body') {
      req.body = result.data;
    } else {
      req.validated = { ...req.validated, [part]: result.data };
    }
    next();
  };
}

export function getValidatedQuery<T>(req: Request): T {
  return (req.validated?.query ?? req.query) as T;
}

export function getValidatedParams<T>(req: Request): T {
  return (req.validated?.params ?? req.params) as T;
}
