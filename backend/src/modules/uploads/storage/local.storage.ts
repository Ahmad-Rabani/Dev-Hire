import { createHash, randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../../../config/env';
import type { StorageProvider, StoredFile } from './storage.interface';

function resolveUploadRoot(): string {
  const configured = env.UPLOAD_DIR;
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
}

/**
 * Local filesystem storage for development.
 * Keys are server-generated — never use client filenames as paths.
 */
export class LocalStorageProvider implements StorageProvider {
  private root = resolveUploadRoot();

  private safeKey(purpose: string, extension: string): string {
    const stamp = new Date().toISOString().slice(0, 10);
    const id = randomUUID();
    const hash = createHash('sha256').update(id).digest('hex').slice(0, 16);
    // Keep purpose as a directory segment (sanitized).
    const safePurpose = purpose.replace(/[^a-z0-9_-]/gi, '');
    const safeExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase();
    return path.posix.join(safePurpose, stamp, `${hash}.${safeExt}`);
  }

  private absolutePath(storageKey: string): string {
    const normalized = path.normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, '');
    const full = path.resolve(this.root, normalized);
    if (!full.startsWith(this.root)) {
      throw new Error('Invalid storage key');
    }
    return full;
  }

  async save(input: {
    buffer: Buffer;
    purpose: string;
    extension: string;
  }): Promise<StoredFile> {
    const storageKey = this.safeKey(input.purpose, input.extension);
    const full = this.absolutePath(storageKey);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, input.buffer);
    return { storageKey, absolutePath: full };
  }

  async read(storageKey: string): Promise<Buffer> {
    return fs.readFile(this.absolutePath(storageKey));
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await fs.unlink(this.absolutePath(storageKey));
    } catch {
      // Ignore missing files during cleanup.
    }
  }
}

export const localStorage = new LocalStorageProvider();
