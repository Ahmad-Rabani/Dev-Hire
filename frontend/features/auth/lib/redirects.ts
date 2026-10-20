import type { UserRole } from '@/types/user';

const SAFE_RETURN_PATH = /^\/(?!\/)(?!https?:)/i;

/** Prevent open redirects — only allow same-origin relative paths. */
export function sanitizeReturnTo(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!SAFE_RETURN_PATH.test(value)) return fallback;
  if (value.startsWith('//')) return fallback;
  return value;
}

export function dashboardPathForRole(role: UserRole): string {
  switch (role) {
    case 'client':
      return '/client/dashboard';
    case 'freelancer':
      return '/freelancer/dashboard';
    case 'admin':
      return '/admin';
    default:
      return '/';
  }
}
