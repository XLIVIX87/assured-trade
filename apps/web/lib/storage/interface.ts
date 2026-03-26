/**
 * Storage adapter interface.
 * Phase 1: local filesystem implementation.
 * Future: S3-compatible object storage.
 */
export interface StorageAdapter {
  /** Get a readable stream for a stored file */
  getFileStream(fileKey: string): Promise<import("stream").Readable | null>;
  /** Generate a signed URL for temporary access */
  getSignedUrl(fileKey: string, expiresInSeconds?: number): Promise<string>;
  /** Upload a buffer and return the file key */
  putFile(fileKey: string, data: Buffer, mimeType: string): Promise<string>;
  /** Check if a file exists */
  exists(fileKey: string): Promise<boolean>;
}
