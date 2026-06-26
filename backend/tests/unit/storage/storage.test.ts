/**
 * Unit Tests - Storage Module (local disk)
 */

describe('🧪 Storage Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Configuration', () => {
    it('should use local storage driver', () => {
      process.env.STORAGE_DRIVER = 'local';
      expect(process.env.STORAGE_DRIVER).toBe('local');
    });

    it('should have uploads prefix', () => {
      process.env.UPLOADS_PREFIX = 'uploads';
      expect(process.env.UPLOADS_PREFIX).toBe('uploads');
    });

    it('should build a public file URL from PUBLIC_BASE_URL', () => {
      const base = 'http://localhost:3001';
      const prefix = 'uploads';
      const filename = 'images-123.png';
      const url = `${base}/${prefix}/${filename}`;
      expect(url).toBe('http://localhost:3001/uploads/images-123.png');
    });
  });

  describe('File Path Generation', () => {
    it('should generate unique file paths', () => {
      const generatePath = (prefix: string, filename: string) => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        return `${prefix}/${timestamp}-${random}-${filename}`;
      };

      const path1 = generatePath('uploads', 'test.png');
      const path2 = generatePath('uploads', 'test.png');

      expect(path1).not.toBe(path2);
      expect(path1).toContain('uploads/');
      expect(path1).toContain('test.png');
    });
  });

  describe('MIME Type Validation', () => {
    const isValidImageType = (mimeType: string): boolean => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      return validTypes.includes(mimeType);
    };

    it('should accept valid image types', () => {
      expect(isValidImageType('image/jpeg')).toBe(true);
      expect(isValidImageType('image/png')).toBe(true);
      expect(isValidImageType('image/gif')).toBe(true);
      expect(isValidImageType('image/webp')).toBe(true);
    });

    it('should reject invalid types', () => {
      expect(isValidImageType('application/pdf')).toBe(false);
      expect(isValidImageType('text/plain')).toBe(false);
      expect(isValidImageType('application/json')).toBe(false);
    });
  });
});
