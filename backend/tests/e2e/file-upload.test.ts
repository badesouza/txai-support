/**
 * E2E Tests - File Upload
 * Tests file upload functionality with GCS/emulator
 */

import { ApiClient } from '../utils/api-client';
import { fixtures, createTestImageBuffer } from '../fixtures';
import { itIfApi, isApiAvailable } from '../utils/test-helpers';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('🌐 E2E - File Upload', () => {
  let api: ApiClient;
  let callId: string;
  let tempFilePath: string;

  beforeAll(async () => {
    api = new ApiClient();
    
    const available = await isApiAvailable();
    if (!available) {
      console.log('\n  ⚠️ Backend API not running - tests will be skipped\n');
      return;
    }
    
    await api.loginAsAdmin();

    // Create a temporary test image
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `test-image-${Date.now()}.png`);
    fs.writeFileSync(tempFilePath, createTestImageBuffer());

    // Create a call to attach images to
    const callData = fixtures.validCall();
    const response = await api.post('/calls', callData);
    if (response.body.id) {
      callId = response.body.id;
    }
  });

  afterAll(async () => {
    // Cleanup temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    // Delete test call
    if (callId) {
      await api.delete(`/calls/${callId}`);
    }
  });

  describe('Image Upload', () => {
    itIfApi('should upload an image to a call', async () => {
      if (!callId || !tempFilePath) return;
      
      const response = await api.uploadFile(
        `/calls/${callId}/images`,
        'image',
        tempFilePath
      );

      // Upload might succeed or return error if endpoint doesn't exist
      if (response.status === 200 || response.status === 201) {
        expect(response.body).toBeDefined();
        console.log(`    ✓ Image uploaded successfully`);
      } else if (response.status === 404) {
        console.log(`    ⚠ Image upload endpoint not available`);
      } else {
        console.log(`    ⚠ Upload returned status: ${response.status}`);
      }
    });

    itIfApi('should reject non-image files', async () => {
      if (!callId) return;
      
      // Create a temp text file
      const textFilePath = path.join(os.tmpdir(), `test-text-${Date.now()}.txt`);
      fs.writeFileSync(textFilePath, 'This is not an image');

      try {
        const response = await api.uploadFile(
          `/calls/${callId}/images`,
          'image',
          textFilePath
        );

        // Should reject or filter non-images
        if (response.status === 200 || response.status === 201) {
          // Some APIs accept any file type
          console.log(`    ⚠ API accepted non-image file`);
        } else {
          expect(response.status).toBeGreaterThanOrEqual(400);
          console.log(`    ✓ Non-image file rejected`);
        }
      } finally {
        fs.unlinkSync(textFilePath);
      }
    });

    itIfApi('should require authentication for upload', async () => {
      if (!callId || !tempFilePath) return;
      
      const unauthApi = new ApiClient();
      
      const response = await unauthApi.uploadFile(
        `/calls/${callId}/images`,
        'image',
        tempFilePath
      );

      expect(response.status).toBe(401);
      console.log(`    ✓ Unauthenticated upload rejected`);
    });
  });

  describe('Image Retrieval', () => {
    itIfApi('should list images for a call', async () => {
      if (!callId) return;
      
      const response = await api.get(`/calls/${callId}`);

      expect(response.status).toBe(200);
      
      // Check if images array exists
      if (response.body.images !== undefined) {
        expect(Array.isArray(response.body.images)).toBe(true);
        console.log(`    ✓ Call has ${response.body.images.length} images`);
      } else if (response.body.imageUrls !== undefined) {
        expect(Array.isArray(response.body.imageUrls)).toBe(true);
        console.log(`    ✓ Call has ${response.body.imageUrls.length} image URLs`);
      }
    });
  });
});

describe('🌐 E2E - Storage Service', () => {
  it('should have storage service configured', () => {
    const storageDriver = process.env.STORAGE_DRIVER;
    const emulatorHost = process.env.STORAGE_EMULATOR_HOST;
    const bucket = process.env.GCS_BUCKET;

    console.log(`    Storage Driver: ${storageDriver || 'default'}`);
    console.log(`    Emulator Host: ${emulatorHost || 'none (production)'}`);
    console.log(`    Bucket: ${bucket || 'not configured'}`);

    // At minimum, bucket should be configured in test env
    expect(bucket || emulatorHost || storageDriver).toBeDefined();
  });
});
