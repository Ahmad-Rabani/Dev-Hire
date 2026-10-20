import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { forbidden } from '../utils/AppError';

/**
 * Cookie-authenticated POSTs (refresh / logout) are vulnerable to CSRF when
 * SameSite=None is used in production. Require Origin (or Referer) to match
 * the configured frontend origin.
 *
 * SameSite=Lax in development already reduces cross-site cookie POSTs.
 */
export function requireTrustedOrigin(req: Request, _res: Response, next: NextFunction): void {
  const allowed = env.FRONTEND_ORIGIN.replace(/\/$/, '');
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin.replace(/\/$/, '') : '';
  const referer = typeof req.headers.referer === 'string' ? req.headers.referer : '';

  if (origin && origin === allowed) {
    next();
    return;
  }

  if (referer.startsWith(`${allowed}/`) || referer === allowed) {
    next();
    return;
  }

  // Same-origin tooling (curl without Origin) is blocked in production;
  // local scripts should set Origin: FRONTEND_ORIGIN or use Bearer tokens.
  if (env.NODE_ENV === 'test') {
    next();
    return;
  }

  next(forbidden('Request origin is not allowed for cookie-authenticated actions'));
}
