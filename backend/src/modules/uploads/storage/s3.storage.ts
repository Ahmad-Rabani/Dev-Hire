import { createHash, randomUUID } from 'crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';
import type { StorageProvider, StoredFile } from './storage.interface';

/**
 * S3-compatible object storage for production.
 * Works with AWS S3, MinIO, R2, etc. via S3_ENDPOINT.
 * Objects stay private; authorized downloads go through the API.
 */
export class S3StorageProvider implements StorageProvider {
  private client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(env.S3_FORCE_PATH_STYLE || env.S3_ENDPOINT),
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

  private safeKey(purpose: string, extension: string): string {
    const stamp = new Date().toISOString().slice(0, 10);
    const id = randomUUID();
    const hash = createHash('sha256').update(id).digest('hex').slice(0, 16);
    const safePurpose = purpose.replace(/[^a-z0-9_-]/gi, '');
    const safeExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase();
    return `${safePurpose}/${stamp}/${hash}.${safeExt}`;
  }

  async save(input: {
    buffer: Buffer;
    purpose: string;
    extension: string;
  }): Promise<StoredFile> {
    const storageKey = this.safeKey(input.purpose, input.extension);
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: storageKey,
        Body: input.buffer,
      }),
    );
    return { storageKey };
  }

  async read(storageKey: string): Promise<Buffer> {
    if (!storageKey || storageKey.includes('..') || storageKey.includes('\\')) {
      throw new Error('Invalid storage key');
    }
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: storageKey,
      }),
    );
    if (!result.Body) {
      throw new Error('Empty object body');
    }
    const bytes = await result.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: storageKey,
        }),
      );
    } catch (error) {
      logger.warn('S3 delete failed (ignored during cleanup)', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
