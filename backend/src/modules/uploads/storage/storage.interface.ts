export type StoredFile = {
  storageKey: string;
  absolutePath?: string;
};

export interface StorageProvider {
  save(input: {
    buffer: Buffer;
    purpose: string;
    extension: string;
  }): Promise<StoredFile>;
  read(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
}
