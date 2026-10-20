'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Descriptions, Spin, Typography } from 'antd';
import { getApiErrorMessage } from '@/lib/api-client';
import { fetchHealth } from '@/services/health.service';

const { Text, Title } = Typography;

/**
 * Phase 1 smoke test: proves TanStack Query → Axios → Express → MongoDB
 * connectivity from the UI.
 */
export function ApiStatusCard() {
  const { data, error, isLoading, isFetching, refetch, isError } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  return (
    <Card
      title="API connection"
      extra={
        <button
          type="button"
          className="text-sm font-medium text-teal-700 hover:underline"
          onClick={() => void refetch()}
        >
          Refresh
        </button>
      }
      className="w-full shadow-sm"
    >
      {isLoading ? (
        <div className="flex items-center gap-3 py-6">
          <Spin />
          <Text type="secondary">Checking backend health…</Text>
        </div>
      ) : null}

      {isError ? (
        <Alert
          type="error"
          showIcon
          message="Cannot reach the DevHire API"
          description={
            <>
              {getApiErrorMessage(error)}. Start the backend (`cd backend && npm run
              dev`) and confirm `NEXT_PUBLIC_API_URL` in `.env.local`.
            </>
          }
        />
      ) : null}

      {data ? (
        <>
          <Alert
            type={data.status === 'ok' ? 'success' : 'warning'}
            showIcon
            className="mb-4"
            message={
              data.status === 'ok'
                ? 'Backend is healthy'
                : 'Backend is up but database is not connected'
            }
          />
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Status">{data.status}</Descriptions.Item>
            <Descriptions.Item label="Database">
              {data.database.connected ? 'connected' : 'disconnected'} (readyState{' '}
              {data.database.readyState})
            </Descriptions.Item>
            <Descriptions.Item label="Uptime">
              {Math.floor(data.uptime)}s
              {isFetching ? ' · refreshing…' : ''}
            </Descriptions.Item>
            <Descriptions.Item label="Checked at">
              {new Date(data.timestamp).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        </>
      ) : null}

      <Title level={5} className="!mt-6">
        What this demonstrates
      </Title>
      <Text type="secondary">
        UI → TanStack Query → Axios (`/health`) → Express route → health service →
        Mongoose connection status → JSON → card update.
      </Text>
    </Card>
  );
}
