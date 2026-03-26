import { StorageAdapter } from "./interface";
import fs from "fs/promises";
import { createReadStream } from "fs";
import { Readable } from "stream";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

export class LocalStorageAdapter implements StorageAdapter {
  async getFileStream(fileKey: string): Promise<Readable | null> {
    const filePath = path.join(UPLOAD_DIR, fileKey);
    try {
      await fs.access(filePath);
      return createReadStream(filePath);
    } catch {
      return null;
    }
  }

  async getSignedUrl(fileKey: string, _expiresInSeconds = 3600): Promise<string> {
    // In local dev, return a direct path. In production, this would be a signed S3 URL.
    return `/api/files/${encodeURIComponent(fileKey)}`;
  }

  async putFile(fileKey: string, data: Buffer, _mimeType: string): Promise<string> {
    const filePath = path.join(UPLOAD_DIR, fileKey);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    return fileKey;
  }

  async exists(fileKey: string): Promise<boolean> {
    try {
      await fs.access(path.join(UPLOAD_DIR, fileKey));
      return true;
    } catch {
      return false;
    }
  }
}

/** Singleton storage adapter */
export const storage = new LocalStorageAdapter();
