import { create } from 'zustand';
import type { User } from '@/types/user';

type AuthState = {
  accessToken: string | null;
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  setSession: (accessToken: string, user: User) => void;
  setUser: (user: User) => void;
  clearSession: () => void;
  setStatus: (status: AuthState['status']) => void;
};

/**
 * Access token lives in memory only (Zustand). Refresh token is an HttpOnly cookie.
 * On full page reload, AuthProvider calls /auth/refresh to restore the session.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: 'idle',
  setSession: (accessToken, user) =>
    set({ accessToken, user, status: 'authenticated' }),
  setUser: (user) => set({ user }),
  clearSession: () =>
    set({ accessToken: null, user: null, status: 'unauthenticated' }),
  setStatus: (status) => set({ status }),
}));
