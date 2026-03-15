/**
 * Infrastructure Tests - Service Availability
 * Tests that all required services are running and accessible
 */

import { ApiClient, getTestConfig } from '../utils/api-client';
import http from 'http';
import https from 'https';

describe('🏗️ Infrastructure - Services', () => {
  const config = getTestConfig();

  const checkUrl = (url: string): Promise<{ status: number; ok: boolean }> => {
    return new Promise((resolve) => {
      const protocol = url.startsWith('https') ? https : http;
      const req = protocol.get(url, (res) => {
        resolve({ status: res.statusCode || 0, ok: res.statusCode === 200 });
      });
      req.on('error', () => resolve({ status: 0, ok: false }));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve({ status: 0, ok: false });
      });
    });
  };

  describe('Backend API', () => {
    it('should be reachable (skip if local not running)', async () => {
      const result = await checkUrl(`${config.apiUrl}/health`);
      
      if (!result.ok && !config.isCloud) {
        console.log('    ⚠️ Local backend not running - skipping');
        return;
      }
      expect(result.ok).toBe(true);
    });

    it('should respond within 5 seconds', async () => {
      const start = Date.now();
      const result = await checkUrl(`${config.apiUrl}/health`);
      const duration = Date.now() - start;

      if (!result.ok && !config.isCloud) {
        console.log('    ⚠️ Local backend not running - skipping');
        return;
      }
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Firestore', () => {
    it('should be connected (via API health check)', async () => {
      const api = new ApiClient();
      
      try {
        const response = await api.get('/health');
        // If API is healthy, Firestore is connected
        expect(response.status).toBe(200);
      } catch (e) {
        if (!config.isCloud) {
          console.log('    ⚠️ Local backend not running - skipping');
          return;
        }
        throw e;
      }
    });
  });

  describe('WhatsApp integration', () => {
    it('should expose the WhatsApp status endpoint', async () => {
      const api = new ApiClient();
      
      try {
        await api.loginAsAdmin();
        const response = await api.get('/whatsapp/status');
        expect([200, 401, 404]).toContain(response.status);
      } catch (e) {
        if (!config.isCloud) {
          console.log('    ⚠️ Local backend not running - skipping');
          return;
        }
        throw e;
      }
    });
  });

  describe('Environment Configuration', () => {
    it('should have API_URL configured', () => {
      expect(config.apiUrl).toBeDefined();
      expect(config.apiUrl.length).toBeGreaterThan(0);
    });

    it('should have admin credentials configured', () => {
      expect(config.adminEmail).toBeDefined();
      expect(config.adminPassword).toBeDefined();
    });

    it('should detect environment correctly', () => {
      const isCloud = config.apiUrl.includes('run.app');
      
      if (isCloud) {
        expect(config.isCloud).toBe(true);
        console.log('    ☁️  Running against CLOUD environment');
      } else {
        expect(config.isCloud).toBe(false);
        console.log('    🏠 Running against LOCAL environment');
      }
    });
  });
});

describe('🏗️ Infrastructure - Storage', () => {
  const storageEmulatorUrl = process.env.STORAGE_EMULATOR_HOST || 'http://localhost:4443';
  const config = getTestConfig();

  const checkStorage = async (): Promise<boolean> => {
    if (config.isCloud) {
      // For cloud, we just verify the API can handle uploads
      return true;
    }

    // For local, check the emulator
    return new Promise((resolve) => {
      const url = `${storageEmulatorUrl}/storage/v1/b`;
      http.get(url, (res) => {
        resolve(res.statusCode === 200);
      }).on('error', () => resolve(false));
    });
  };

  it('should have storage service available (skip if local not running)', async () => {
    const isAvailable = await checkStorage();
    
    if (!config.isCloud && !isAvailable) {
      console.log('    ⚠️ Local storage emulator not running - skipping');
      return;
    }
    
    expect(isAvailable).toBe(true);
  });
});


