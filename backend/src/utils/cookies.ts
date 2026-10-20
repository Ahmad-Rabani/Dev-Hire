import type { CookieOptions, Response } from 'express';
import { env, isProduction } from '../config/env';
import { getRefreshExpiryDate } from './tokens';

export const REFRESH_COOKIE_NAME = 'devhire_refresh';

export function refreshCookieOptions(): CookieOptions {
  const maxAge = Math.max(1000, getRefreshExpiryDate().getTime() - Date.now());
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE || isProduction,
    // Production cross-origin SPA+API needs SameSite=None + Secure.
    // CSRF on cookie POSTs is mitigated by requireTrustedOrigin middleware.
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge,
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...refreshCookieOptions(),
    maxAge: undefined,
  });
}
