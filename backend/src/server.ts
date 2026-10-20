import http from 'http';
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env, isDevelopment } from './config/env';
import { startEmailOutboxWorker } from './modules/email/email-outbox.service';
import { initSocketServer } from './realtime/socket';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  initSocketServer(server);

  // Process queued emails in-process during development/production without Redis.
  // A dedicated CLI worker remains available: npm run worker:email
  if (env.NODE_ENV !== 'test') {
    startEmailOutboxWorker(isDevelopment ? 10_000 : 30_000);
  }

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
