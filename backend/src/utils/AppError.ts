export type FieldError = {
  field: string;
  message: string;
};

/**
 * Operational errors we expect (validation, auth, not found).
 * The global error middleware turns these into consistent JSON responses.
 * Unexpected errors (bugs) are wrapped as 500s without leaking internals.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: FieldError[];

  constructor(
    message: string,
    statusCode = 500,
    options?: { errors?: FieldError[]; isOperational?: boolean },
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = options?.isOperational ?? true;
    this.errors = options?.errors;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export function badRequest(message: string, errors?: FieldError[]): AppError {
  return new AppError(message, 400, { errors });
}

export function unauthorized(message = 'Authentication required'): AppError {
  return new AppError(message, 401);
}

export function forbidden(message = 'You do not have permission to perform this action'): AppError {
  return new AppError(message, 403);
}

export function notFound(message = 'Resource not found'): AppError {
  return new AppError(message, 404);
}

export function conflict(message: string): AppError {
  return new AppError(message, 409);
}

export function tooManyRequests(message = 'Too many requests. Please try again later.'): AppError {
  return new AppError(message, 429);
}
