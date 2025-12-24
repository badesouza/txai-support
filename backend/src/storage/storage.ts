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

// Emulator detection - @google-cloud/storage SDK natively supports STORAGE_EMULATOR_HOST
const isEmulator = !!process.env.STORAGE_EMULATOR_HOST;
const gcsPublicHost = process.env.GCS_PUBLIC_HOST || '';

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

class GcsStorageProvider {
  private storage: Storage;
  private bucket: string;
  private prefix: string;
  private signedUrlTtl: number;

  constructor() {
    const projectId = process.env.GCS_PROJECT_ID || 'local-dev';
    const credentialsRaw = process.env.GCS_CREDENTIALS_JSON;
    
    // The @google-cloud/storage SDK automatically uses STORAGE_EMULATOR_HOST if set!
    // No code changes needed for emulator - just set the env var
    let credentials: Record<string, unknown> | undefined;
    
    // Only parse credentials if not using emulator
    if (!isEmulator && credentialsRaw) {
      try {
        credentials = JSON.parse(credentialsRaw);
      } catch (error) {
        throw new Error('GCS_CREDENTIALS_JSON inválido');
      }
    }
    
    this.storage = new Storage({ 
      projectId,
      // Credentials not needed for emulator
      credentials: isEmulator ? undefined : credentials,
    });
    
    this.bucket = gcsBucketName;
    this.prefix = gcsUploadsPrefix;
    this.signedUrlTtl = signedUrlTtlSeconds;
    
    if (isEmulator) {
      console.log(`📦 GCS Storage using emulator: ${process.env.STORAGE_EMULATOR_HOST}`);
    }
  }

  private ensureBucket(): string {
    if (!this.bucket) {
      throw new Error('GCS_BUCKET não configurado');
    }
    return this.bucket;
  }

  private objectNameFromPath(relativePath: string): string {
    const cleaned = relativePath.replace(/^\//, '');
    return cleaned.startsWith(`${this.prefix}/`)
      ? cleaned
      : `${this.prefix}/${path.basename(cleaned)}`;
  }

  async saveBuffer(options: SaveBufferOptions): Promise<SaveResult> {
    const bucketName = this.ensureBucket();
    const objectName = `${this.prefix}/${options.filename}`;
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
    const objectName = this.objectNameFromPath(relativePath);
    
    // For emulator: use public URL directly (no signing needed/supported properly)
    if (isEmulator && gcsPublicHost) {
      return `${gcsPublicHost}/${bucketName}/${objectName}`;
    }
    
    // For production: generate signed URL
    const bucket = this.storage.bucket(bucketName);
    const [url] = await bucket.file(objectName).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + this.signedUrlTtl * 1000,
    });
    return url;
  }
}

const configuredDriver = (process.env.STORAGE_DRIVER ?? 'local').toLowerCase();
const driver: StorageDriver = configuredDriver === 'gcs' ? 'gcs' : 'local';

function createProvider() {
  if (driver === 'gcs') {
    // Works with BOTH:
    // - fake-gcs-server (when STORAGE_EMULATOR_HOST is set)
    // - Real GCS (when STORAGE_EMULATOR_HOST is not set)
    return new GcsStorageProvider();
  }
  return new LocalStorageProvider();
}

const provider = createProvider();

export const storage = {
  driver,
  uploadsDir,
  saveBuffer: (options: SaveBufferOptions) => provider.saveBuffer(options),
  deleteFile: (relativePath: string) => provider.deleteFile(relativePath),
  getFileUrl: (relativePath: string) => provider.getFileUrl(relativePath),
};
