import fs from 'fs/promises';
import path from 'path';

export type SaveBufferOptions = {
  buffer: Buffer;
  filename: string;
  contentType?: string;
};

export type SaveResult = {
  absolutePath: string;
  relativePath: string;
};

// Public prefix used both for stored paths and the static route (see server.ts).
const uploadsPrefix = (process.env.UPLOADS_PREFIX ?? 'uploads').replace(/^\//, '').replace(/\/$/, '');
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), uploadsPrefix);
const publicBaseUrl = (process.env.PUBLIC_BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');

/**
 * Local filesystem storage provider.
 * Files are written under UPLOADS_DIR and served by the backend at /<prefix>.
 */
class LocalStorageProvider {
  private dir: string;
  private prefix: string;

  constructor() {
    this.dir = uploadsDir;
    this.prefix = uploadsPrefix;
    console.log(`📁 Local storage directory: ${this.dir}`);
  }

  private fileNameFromPath(relativePath: string): string {
    return path.basename(relativePath);
  }

  async saveBuffer(options: SaveBufferOptions): Promise<SaveResult> {
    await fs.mkdir(this.dir, { recursive: true });
    const safeName = path.basename(options.filename);
    const absolutePath = path.join(this.dir, safeName);

    await fs.writeFile(absolutePath, options.buffer);

    return {
      absolutePath,
      relativePath: `/${this.prefix}/${safeName}`,
    };
  }

  async deleteFile(relativePath: string): Promise<void> {
    const safeName = this.fileNameFromPath(relativePath);
    await fs.rm(path.join(this.dir, safeName), { force: true });
  }

  async getFileUrl(relativePath: string): Promise<string> {
    const safeName = this.fileNameFromPath(relativePath);
    return `${publicBaseUrl}/${this.prefix}/${safeName}`;
  }
}

const provider = new LocalStorageProvider();

export const storage = {
  saveBuffer: (options: SaveBufferOptions) => provider.saveBuffer(options),
  deleteFile: (relativePath: string) => provider.deleteFile(relativePath),
  getFileUrl: (relativePath: string) => provider.getFileUrl(relativePath),
};

export const uploadsConfig = {
  dir: uploadsDir,
  prefix: uploadsPrefix,
};
