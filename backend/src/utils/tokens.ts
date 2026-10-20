import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { UserRole } from '../modules/users/user.types';

export type AccessTokenPayload = {
  sub: string;
  role: UserRole;
  email: string;
  type: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  sid: string;
  type: 'refresh';
};

export function signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'devhire-api',
    audience: 'devhire-client',
  });
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'devhire-api',
    audience: 'devhire-client',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'devhire-api',
    audience: 'devhire-client',
  });

  if (typeof decoded === 'string' || decoded.type !== 'access' || !decoded.sub) {
    throw new Error('Invalid access token');
  }

  return decoded as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: 'devhire-api',
    audience: 'devhire-client',
  });

  if (typeof decoded === 'string' || decoded.type !== 'refresh' || !decoded.sub || !decoded.sid) {
    throw new Error('Invalid refresh token');
  }

  return decoded as RefreshTokenPayload;
}

export function getRefreshExpiryDate(): Date {
  // Approximate from configured string; default 7 days if unparsable
  const match = /^(\d+)([smhd])$/.exec(env.JWT_REFRESH_EXPIRES_IN.trim());
  const now = Date.now();
  if (!match) {
    return new Date(now + 7 * 24 * 60 * 60 * 1000);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return new Date(now + amount * (multipliers[unit] ?? multipliers.d));
}
