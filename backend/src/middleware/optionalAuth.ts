import type { NextFunction, Request, Response } from 'express';
import { User } from '../modules/users/user.model';
import type { AuthUser } from '../types/express';
import { verifyAccessToken } from '../utils/tokens';

/**
 * Attaches req.user when a valid Bearer token is present.
 * Does not fail when missing/invalid — used for public routes that enrich for owners.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      next();
      return;
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      next();
      return;
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('role email status emailVerified');
    if (user && user.status !== 'suspended') {
      const authUser: AuthUser = {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
        status: user.status,
        emailVerified: user.emailVerified,
      };
      req.user = authUser;
    }
  } catch {
    // Ignore invalid tokens for optional auth
  }
  next();
}
