'use client';

import { useEffect, type ReactNode } from 'react';
import { refreshSession } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';

type AuthProviderProps = {
  children: ReactNode;
};

/**
 * Restores the session after a full page reload using the HttpOnly refresh cookie.
 * While status is idle/loading, protected layouts show a spinner instead of flashing content.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setStatus = useAuthStore((s) => s.setStatus);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (status === 'authenticated' || status === 'unauthenticated') {
        return;
      }
      setStatus('loading');
      try {
        const session = await refreshSession();
        if (!cancelled) {
          setSession(session.accessToken, session.user);
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
    // Run once on mount for session restoration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return children;
}
