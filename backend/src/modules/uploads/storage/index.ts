import { env } from '../../../config/env';
import { localStorage } from './local.storage';
import { S3StorageProvider } from './s3.storage';
import type { StorageProvider } from './storage.interface';

let cached: StorageProvider | null = null;

/**
 * Resolve the configured storage driver once per process.
 * Local disk is default for development; S3 for production multi-instance.
 */
export function getStorageProvider(): StorageProvider {
  if (cached) return cached;
  if (env.STORAGE_DRIVER === 's3') {
    cached = new S3StorageProvider();
  } else {
    cached = localStorage;
  }
  return cached;
}

/** Test helper — reset cached provider after env changes. */
export function resetStorageProviderCache(): void {
  cached = null;
}
