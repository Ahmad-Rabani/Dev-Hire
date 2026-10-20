'use client';

import { Spin } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import type { UserRole } from '@/types/user';

type RequireAuthProps = {
  children: ReactNode;
  roles?: UserRole[];
};

export function RequireAuth({ children, roles }: RequireAuthProps) {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (status === 'idle' || status === 'loading') return;

    if (status === 'unauthenticated') {
      const returnTo = encodeURIComponent(pathname);
      router.replace(`/login?returnTo=${returnTo}`);
      return;
    }

    if (roles && user && !roles.includes(user.role)) {
      router.replace('/');
    }
  }, [status, user, roles, router, pathname]);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spin size="large" tip="Checking session…" />
      </div>
    );
  }

  if (status !== 'authenticated' || !user) {
    return null;
  }

  if (roles && !roles.includes(user.role)) {
    return null;
  }

  return children;
}
