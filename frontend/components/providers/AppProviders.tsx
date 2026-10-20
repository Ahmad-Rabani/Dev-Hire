'use client';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider } from 'antd';
import dynamic from 'next/dynamic';
import { useState, type ReactNode } from 'react';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { SocketNotificationProvider } from '@/features/notifications/SocketNotificationProvider';
import { makeQueryClient } from '@/lib/query-client';

const ReactQueryDevtools = dynamic(
  () =>
    import('@tanstack/react-query-devtools').then((mod) => mod.ReactQueryDevtools),
  { ssr: false },
);

type AppProvidersProps = {
  children: ReactNode;
};

/**
 * Client boundary for libraries that need browser APIs:
 * TanStack Query, Ant Design registry, and Ant Design App (for message/modal).
 */
export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => makeQueryClient());
  const showDevtools = process.env.NODE_ENV === 'development';

  return (
    <AntdRegistry>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#0f766e',
              borderRadius: 8,
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            },
          }}
        >
          <AntApp>
            <AuthProvider>
              <SocketNotificationProvider>{children}</SocketNotificationProvider>
            </AuthProvider>
          </AntApp>
        </ConfigProvider>
        {showDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </QueryClientProvider>
    </AntdRegistry>
  );
}
