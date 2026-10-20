import { getDatabaseStatus } from '../../config/database';

export type HealthPayload = {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
  database: {
    connected: boolean;
    readyState: number;
  };
};

export function getHealthStatus(): HealthPayload {
  const database = getDatabaseStatus();

  return {
    // API process is up; "degraded" if Mongo is not ready yet
    status: database.connected ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database,
  };
}
