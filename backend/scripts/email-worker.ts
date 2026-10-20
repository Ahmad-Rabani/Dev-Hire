/**
 * Optional standalone email outbox worker.
 *
 *   cd backend
 *   npm run worker:email
 *
 * The API server also runs a lightweight in-process poller when not in test mode.
 */
import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { processEmailOutbox } from '../src/modules/email/email-outbox.service';
import { logger } from '../src/utils/logger';

dotenv.config();

async function main(): Promise<void> {
  await connectDatabase();
  logger.info('Email worker started');

  const tick = async () => {
    const result = await processEmailOutbox(25);
    if (result.processed > 0) {
      logger.info('Email outbox tick', result);
    }
  };

  await tick();
  const handle = setInterval(() => {
    void tick().catch((error) => {
      logger.error('Email worker tick failed', {
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }, 10_000);

  const shutdown = async () => {
    clearInterval(handle);
    await disconnectDatabase();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
