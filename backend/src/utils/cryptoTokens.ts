import { createHash, randomBytes } from 'crypto';

/** Opaque token for email verification / password reset (sent to user). */
export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/** Store only the hash of opaque tokens / refresh tokens in MongoDB. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
