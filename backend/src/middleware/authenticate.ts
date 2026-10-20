import type { NextFunction, Request, Response } from 'express';
import { User } from '../modules/users/user.model';
import type { AuthUser } from '../types/express';
import { forbidden, unauthorized } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { verifyAccessToken } from '../utils/tokens';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

/**
 * Requires a valid access token and an active account.
 * Suspended users are rejected even if the JWT signature is still valid.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    throw unauthorized('Authentication required');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw unauthorized('Invalid or expired access token');
  }

  const user = await User.findById(payload.sub).select('role email status emailVerified');
  if (!user) {
    throw unauthorized('User no longer exists');
  }

  if (user.status === 'suspended') {
    throw forbidden('Your account has been suspended');
  }

  const authUser: AuthUser = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
    status: user.status,
    emailVerified: user.emailVerified,
  };

  req.user = authUser;
  next();
});

export function authorize(...roles: AuthUser['role'][]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      next(forbidden('You do not have permission to perform this action'));
      return;
    }
    next();
  };
}
