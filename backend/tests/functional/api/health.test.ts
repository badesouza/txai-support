/**
 * Functional Tests - Health API
 */

import { ApiClient, getTestConfig } from '../../utils/api-client';
import { itIfApi, isApiAvailable } from '../../utils/test-helpers';

describe('🔗 Health API', () => {
  let api: ApiClient;
  let apiRunning = false;

  beforeAll(async () => {
    api = new ApiClient();
    apiRunning = await isApiAvailable();
    if (!apiRunning) {
      console.log('\n  ⚠️ Backend API not running - tests will be skipped\n');
    }
  });

  describe('GET /health', () => {
    itIfApi('should return OK status', async () => {
      const response = await api.get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'OK'
      });
    });

    itIfApi('should include timestamp', async () => {
      const response = await api.get('/health');

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp).getTime()).not.toBeNaN();
    });

    itIfApi('should include uptime', async () => {
      const response = await api.get('/health');

      expect(response.body.uptime).toBeDefined();
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    itIfApi('should include environment info', async () => {
      const response = await api.get('/health');

      expect(response.body.environment).toBeDefined();
      expect(['development', 'production', 'test']).toContain(response.body.environment);
    });
  });
});
