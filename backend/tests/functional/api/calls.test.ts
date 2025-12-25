/**
 * Functional Tests - Calls API
 */

import { ApiClient } from '../../utils/api-client';
import { fixtures } from '../../fixtures';
import { itIfApi, isApiAvailable } from '../../utils/test-helpers';

describe('🔗 Calls API', () => {
  let api: ApiClient;
  let createdCallId: string;

  beforeAll(async () => {
    api = new ApiClient();
    
    const available = await isApiAvailable();
    if (!available) {
      console.log('\n  ⚠️ Backend API not running - tests will be skipped\n');
      return;
    }
    
    await api.loginAsAdmin();
  });

  afterAll(() => {
    api.clearToken();
  });

  describe('POST /calls', () => {
    itIfApi('should create a new call', async () => {
      const callData = fixtures.validCall();
      
      const response = await api.post('/calls', callData);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe(callData.title);
      expect(response.body.status).toBe(callData.status);
      expect(response.body.priority).toBe(callData.priority);
      
      createdCallId = response.body.id;
    });

    itIfApi('should set userId from authenticated user', async () => {
      const callData = fixtures.validCall();
      
      const response = await api.post('/calls', callData);

      expect(response.body.userId).toBeDefined();
      expect(typeof response.body.userId).toBe('string');
      expect(response.body.userId.length).toBeGreaterThan(0);
    });

    itIfApi('should set timestamps on creation', async () => {
      const callData = fixtures.validCall();
      
      const response = await api.post('/calls', callData);

      expect(response.body.createdAt).toBeDefined();
      expect(new Date(response.body.createdAt).getTime()).not.toBeNaN();
      expect(response.body.updatedAt).toBeDefined();
    });

    itIfApi('should reject call without title', async () => {
      const response = await api.post('/calls', fixtures.invalidCall.missingTitle);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    itIfApi('should require authentication', async () => {
      const unauthApi = new ApiClient();
      const response = await unauthApi.post('/calls', fixtures.validCall());

      expect(response.status).toBe(401);
    });
  });

  describe('GET /calls', () => {
    itIfApi('should return paginated calls', async () => {
      const response = await api.get('/calls?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.calls).toBeDefined();
      expect(Array.isArray(response.body.calls)).toBe(true);
    });

    itIfApi('should include pagination info', async () => {
      const response = await api.get('/calls?page=1&limit=10');

      expect(response.body.pagination || response.body.total !== undefined).toBe(true);
    });

    itIfApi('should support filtering by status', async () => {
      const response = await api.get('/calls?status=OPEN');

      expect(response.status).toBe(200);
      if (response.body.calls.length > 0) {
        expect(response.body.calls.every((c: any) => c.status === 'OPEN')).toBe(true);
      }
    });
  });

  describe('GET /calls/:id', () => {
    itIfApi('should return call by ID', async () => {
      // First create a call
      const createResponse = await api.post('/calls', fixtures.validCall());
      const callId = createResponse.body.id;

      const response = await api.get(`/calls/${callId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(callId);
    });

    itIfApi('should return 404 for non-existent call', async () => {
      const response = await api.get('/calls/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /calls/:id', () => {
    itIfApi('should update call status', async () => {
      // First create a call
      const createResponse = await api.post('/calls', fixtures.validCall());
      const callId = createResponse.body.id;

      const response = await api.put(`/calls/${callId}`, {
        status: 'IN_PROGRESS'
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('IN_PROGRESS');
    });

    itIfApi('should update call priority', async () => {
      const createResponse = await api.post('/calls', fixtures.validCall());
      const callId = createResponse.body.id;

      const response = await api.put(`/calls/${callId}`, {
        priority: 'HIGH'
      });

      expect(response.status).toBe(200);
      expect(response.body.priority).toBe('HIGH');
    });

    itIfApi('should update updatedAt timestamp', async () => {
      const createResponse = await api.post('/calls', fixtures.validCall());
      const callId = createResponse.body.id;
      const originalUpdatedAt = createResponse.body.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await api.put(`/calls/${callId}`, {
        title: 'Updated Title'
      });

      expect(response.body.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('DELETE /calls/:id', () => {
    itIfApi('should delete a call', async () => {
      // First create a call
      const createResponse = await api.post('/calls', fixtures.validCall());
      const callId = createResponse.body.id;

      const deleteResponse = await api.delete(`/calls/${callId}`);
      expect(deleteResponse.status).toBe(200);

      // Verify deletion
      const getResponse = await api.get(`/calls/${callId}`);
      expect(getResponse.status).toBe(404);
    });
  });
});
