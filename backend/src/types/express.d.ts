import type { AccountStatus, UserRole } from '../modules/users/user.types';

export type AuthUser = {
  id: string;
  role: UserRole;
  email: string;
  status: AccountStatus;
  emailVerified: boolean;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      /** Coerced query/params from Zod (`req.query` is read-only in Express 5). */
      validated?: {
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
