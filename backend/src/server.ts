import http from 'http';
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env, isDevelopment } from './config/env';
import {
  startEmailOutboxWorker,
  stopEmailOutboxWorker,
} from './modules/email/email-outbox.service';
import { initSocketServer } from './realtime/socket';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  initSocketServer(server);

  // Prefer a single poller: inline in the API OR the CLI worker — not both.
  if (env.NODE_ENV !== 'test' && env.EMAIL_WORKER_MODE === 'inline') {
    startEmailOutboxWorker(isDevelopment ? 10_000 : 30_000);
    logger.info('Email outbox worker: inline');
  } else if (env.EMAIL_WORKER_MODE === 'external') {
    logger.info('Email outbox worker: external (run npm run worker:email separately)');
  }

  server.listen(env.PORT, () => {
    logger.info(`DevHire API listening on http://localhost:${env.PORT}`);
    logger.info(`Health: http://localhost:${env.PORT}/api/v1/health`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    if (env.STORAGE_DRIVER === 'local' && env.NODE_ENV === 'production') {
      logger.warn(
        'STORAGE_DRIVER=local in production — use S3-compatible storage for durable uploads',
      );
    }
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    stopEmailOutboxWorker();
    server.close(() => {
      void import('./config/database').then(({ disconnectDatabase }) =>
        disconnectDatabase().finally(() => process.exit(0)),
      );
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
      message: reason instanceof Error ? reason.message : String(reason),
    });
  });
}

bootstrap().catch((error: unknown) => {
  logger.error('Failed to start server', {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
