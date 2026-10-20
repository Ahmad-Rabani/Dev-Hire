import http from 'http';
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  // Validate env first (imported via env module), then connect DB, then listen.
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  // Socket.IO will attach to this same HTTP server in Phase 7.

  server.listen(env.PORT, () => {
    logger.info(`DevHire API listening on http://localhost:${env.PORT}`);
    logger.info(`Health: http://localhost:${env.PORT}/api/v1/health`);
    logger.info(`Environment: ${env.NODE_ENV}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(() => {
      void import('./config/database').then(({ disconnectDatabase }) =>
        disconnectDatabase().finally(() => process.exit(0)),
      );
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error: unknown) => {
  logger.error('Failed to start server', {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
