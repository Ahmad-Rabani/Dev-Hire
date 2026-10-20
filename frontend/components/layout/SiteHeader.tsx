'use client';

import { App, Button, Dropdown } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';
import { dashboardPathForRole } from '@/features/auth/lib/redirects';
import { getApiErrorMessage } from '@/lib/api-client';

export function SiteHeader() {
  const { message } = App.useApp();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const clearSession = useAuthStore((s) => s.clearSession);

  const onLogout = async () => {
    try {
      await logout();
    } catch (error) {
      message.warning(getApiErrorMessage(error, 'Signed out locally'));
    } finally {
      clearSession();
      router.push('/');
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="text-xl font-semibold tracking-tight text-teal-800">
          DevHire
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          <Link href="/jobs">
            <Button type="text">Jobs</Button>
          </Link>
          <Link href="/freelancers">
            <Button type="text">Freelancers</Button>
          </Link>

          {status === 'authenticated' && user ? (
            <>
              {user.role === 'client' ? (
                <>
                  <Link href="/client/jobs">
                    <Button type="text">My jobs</Button>
                  </Link>
                  <Link href="/client/contracts">
                    <Button type="text">Contracts</Button>
                  </Link>
                </>
              ) : null}
              {user.role === 'freelancer' ? (
                <>
                  <Link href="/freelancer/proposals">
                    <Button type="text">My proposals</Button>
                  </Link>
                  <Link href="/freelancer/contracts">
                    <Button type="text">Contracts</Button>
                  </Link>
                </>
              ) : null}
              <Link href={dashboardPathForRole(user.role)}>
                <Button type="text">My profile</Button>
              </Link>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'logout',
                      label: 'Log out',
                      onClick: () => void onLogout(),
                    },
                  ],
                }}
              >
                <Button type="primary">{user.name.split(' ')[0]}</Button>
              </Dropdown>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button>Log in</Button>
              </Link>
              <Link href="/register">
                <Button type="primary">Sign up</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
