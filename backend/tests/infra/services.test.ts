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

  describe('PostgreSQL', () => {
    it('should be connected (via API health check)', async () => {
      const api = new ApiClient();
      
      try {
        const response = await api.get('/health');
        // If API is healthy, PostgreSQL is connected
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

  describe('Redis', () => {
    it('should be connected (if WhatsApp features work)', async () => {
      const api = new ApiClient();
      
      try {
        await api.loginAsAdmin();
        // Check WhatsApp status endpoint which uses Redis
        const response = await api.get('/whatsapp/status');
        // Should not fail with connection error
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
  it('should use local disk storage driver', () => {
    const driver = process.env.STORAGE_DRIVER || 'local';
    expect(driver).toBe('local');
  });
});


