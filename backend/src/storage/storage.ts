import path from 'path';
import fs from 'fs/promises';
import { Storage } from '@google-cloud/storage';

export type StorageDriver = 'local' | 'gcs';

export type SaveBufferOptions = {
  buffer: Buffer;
  filename: string;
  contentType?: string;
};

export type SaveResult = {
  absolutePath: string;
  relativePath: string;
};

const uploadsDir = process.env.UPLOAD_PATH
  ? path.resolve(process.env.UPLOAD_PATH)
  : path.resolve(process.cwd(), 'uploads');

const signedUrlTtlSecondsRaw = Number(process.env.GCS_SIGNED_URL_TTL_SECONDS ?? 900);
const signedUrlTtlSeconds = Number.isFinite(signedUrlTtlSecondsRaw) ? signedUrlTtlSecondsRaw : 900;
const gcsBucketName = process.env.GCS_BUCKET ?? '';
const gcsUploadsPrefix = (process.env.GCS_UPLOADS_PREFIX ?? 'uploads').replace(/^\//, '').replace(/\/$/, '');

class LocalStorageProvider {
  async saveBuffer(options: SaveBufferOptions): Promise<SaveResult> {
    await fs.mkdir(uploadsDir, { recursive: true });
    const absolutePath = path.join(uploadsDir, options.filename);
    await fs.writeFile(absolutePath, options.buffer);
    return {
      absolutePath,
      relativePath: `/uploads/${options.filename}`,
    };
  }

  async deleteFile(relativePath: string): Promise<void> {
    const filename = path.basename(relativePath);
    const absolutePath = path.join(uploadsDir, filename);
    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async getFileUrl(relativePath: string): Promise<string> {
    return relativePath;
  }
}

class GcsStoragePlaceholder {
  private storage: Storage;

  constructor() {
    const projectId = process.env.GCS_PROJECT_ID || undefined;
    const credentialsRaw = process.env.GCS_CREDENTIALS_JSON;
    let credentials: Record<string, unknown> | undefined;
    if (credentialsRaw) {
      try {
        credentials = JSON.parse(credentialsRaw);
      } catch (error) {
        throw new Error('GCS_CREDENTIALS_JSON inválido');
      }
    }
    this.storage = new Storage({ projectId, credentials });
  }

  private ensureBucket(): string {
    if (!gcsBucketName) {
      throw new Error('GCS_BUCKET não configurado');
    }
    return gcsBucketName;
  }

  private objectNameFromPath(relativePath: string): string {
    const cleaned = relativePath.replace(/^\//, '');
    return cleaned.startsWith(`${gcsUploadsPrefix}/`)
      ? cleaned
      : `${gcsUploadsPrefix}/${path.basename(cleaned)}`;
  }

  async saveBuffer(options: SaveBufferOptions): Promise<SaveResult> {
    const bucketName = this.ensureBucket();
    const objectName = `${gcsUploadsPrefix}/${options.filename}`;
    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(objectName);

    await file.save(options.buffer, {
      resumable: false,
      contentType: options.contentType,
      predefinedAcl: undefined,
    });

    return {
      absolutePath: `gs://${bucketName}/${objectName}`,
      relativePath: `/${objectName}`,
    };
  }

  async deleteFile(relativePath: string): Promise<void> {
    const bucketName = this.ensureBucket();
    const bucket = this.storage.bucket(bucketName);
    const objectName = this.objectNameFromPath(relativePath);
    await bucket.file(objectName).delete({ ignoreNotFound: true });
  }

  async getFileUrl(relativePath: string): Promise<string> {
    const bucketName = this.ensureBucket();
    const bucket = this.storage.bucket(bucketName);
    const objectName = this.objectNameFromPath(relativePath);
    const [url] = await bucket.file(objectName).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + signedUrlTtlSeconds * 1000,
    });
    return url;
  }
}

const configuredDriver = (process.env.STORAGE_DRIVER ?? 'local').toLowerCase();
const driver: StorageDriver = configuredDriver === 'gcs' ? 'gcs' : 'local';
const provider = driver === 'gcs' ? new GcsStoragePlaceholder() : new LocalStorageProvider();

export const storage = {
  driver,
  uploadsDir,
  saveBuffer: (options: SaveBufferOptions) => provider.saveBuffer(options),
  deleteFile: (relativePath: string) => provider.deleteFile(relativePath),
  getFileUrl: (relativePath: string) => provider.getFileUrl(relativePath),
};
