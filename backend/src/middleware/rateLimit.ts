import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/** Shared factory for abuse-sensitive auth endpoints. */
export function createAuthRateLimiter(options?: {
  windowMs?: number;
  max?: number;
  message?: string;
}) {
  return rateLimit({
    windowMs: options?.windowMs ?? 15 * 60 * 1000,
    max: options?.max ?? 20,
    standardHeaders: true,
    legacyHeaders: false,
    // Automated tests register many users quickly.
    skip: () => env.NODE_ENV === 'test',
    message: {
      success: false,
      message: options?.message ?? 'Too many requests. Please try again later.',
    },
  });
}

export const loginRateLimiter = createAuthRateLimiter({
  max: 15,
  message: 'Too many login attempts. Please try again later.',
});

export const registerRateLimiter = createAuthRateLimiter({
  max: 10,
  message: 'Too many registration attempts. Please try again later.',
});

export const passwordResetRateLimiter = createAuthRateLimiter({
  max: 10,
  message: 'Too many password reset attempts. Please try again later.',
});

export const refreshRateLimiter = createAuthRateLimiter({
  max: 60,
  message: 'Too many session refresh attempts. Please try again later.',
});
