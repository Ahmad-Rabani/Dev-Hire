import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

/**
 * Connect once at process start. Mongoose caches the connection on the
 * default connection object, which health checks and models both use.
 */
export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.MONGODB_URI);
  logger.info('MongoDB connected');
}

export function getDatabaseStatus(): {
  connected: boolean;
  readyState: number;
} {
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const readyState = mongoose.connection.readyState;
  return {
    connected: readyState === 1,
    readyState,
  };
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
