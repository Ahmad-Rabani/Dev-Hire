import { isDevelopment } from '../config/env';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  if (meta === undefined) {
    return base;
  }
  return `${base} ${typeof meta === 'string' ? meta : JSON.stringify(meta)}`;
}

/**
 * Lightweight logger for Phase 1. Can be swapped for pino/winston later
 * without changing call sites across the codebase.
 */
export const logger = {
  info(message: string, meta?: unknown): void {
    console.log(formatMessage('info', message, meta));
  },
  warn(message: string, meta?: unknown): void {
    console.warn(formatMessage('warn', message, meta));
  },
  error(message: string, meta?: unknown): void {
    console.error(formatMessage('error', message, meta));
  },
  debug(message: string, meta?: unknown): void {
    if (isDevelopment) {
      console.debug(formatMessage('debug', message, meta));
    }
  },
};
