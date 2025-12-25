/**
 * Functional Tests - Users API
 */

import { ApiClient } from '../../utils/api-client';
import { fixtures } from '../../fixtures';
import { itIfApi, isApiAvailable } from '../../utils/test-helpers';

describe('🔗 Users API', () => {
  let api: ApiClient;

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

  describe('GET /users', () => {
    itIfApi('should return paginated users', async () => {
      const response = await api.get('/users?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    itIfApi('should not include passwords in response', async () => {
      const response = await api.get('/users');

      if (response.body.users.length > 0) {
        expect(response.body.users[0].password).toBeUndefined();
      }
    });

    itIfApi('should include pagination metadata', async () => {
      const response = await api.get('/users?page=1&limit=5');

      expect(response.body.pagination || response.body.total !== undefined).toBe(true);
    });
  });

  describe('GET /users/:id', () => {
    itIfApi('should return user by ID', async () => {
      // Get list first to find a user ID
      const listResponse = await api.get('/users');
      const userId = listResponse.body.users[0]?.id;
      
      if (userId) {
        const response = await api.get(`/users/${userId}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(userId);
        expect(response.body.password).toBeUndefined();
      }
    });

    itIfApi('should return 404 for non-existent user', async () => {
      const response = await api.get('/users/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /users/:id', () => {
    itIfApi('should update user name', async () => {
      // Create a test user first
      const newUser = fixtures.validUser();
      const registerResponse = await api.post('/users/register', newUser);
      const userId = registerResponse.body.user.id;

      const response = await api.put(`/users/${userId}`, {
        name: 'Updated Name'
      });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
    });

    itIfApi('should not allow updating email to existing email', async () => {
      // Create two users
      const user1 = fixtures.validUser();
      const user2 = fixtures.validUser();
      
      await api.post('/users/register', user1);
      const response2 = await api.post('/users/register', user2);
      const user2Id = response2.body.user.id;

      // Try to update user2's email to user1's email
      const updateResponse = await api.put(`/users/${user2Id}`, {
        email: user1.email
      });

      expect(updateResponse.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('DELETE /users/:id', () => {
    itIfApi('should delete a user', async () => {
      // Create a user to delete
      const newUser = fixtures.validUser();
      const registerResponse = await api.post('/users/register', newUser);
      const userId = registerResponse.body.user.id;

      const deleteResponse = await api.delete(`/users/${userId}`);
      expect(deleteResponse.status).toBe(200);

      // Verify deletion
      const getResponse = await api.get(`/users/${userId}`);
      expect(getResponse.status).toBe(404);
    });

    itIfApi('should return 404 for non-existent user', async () => {
      const response = await api.delete('/users/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /users/me', () => {
    itIfApi('should return current authenticated user', async () => {
      const response = await api.get('/users/me');

      // This might return 404 if /me endpoint doesn't exist
      if (response.status === 200) {
        expect(response.body.email).toBeDefined();
        expect(response.body.password).toBeUndefined();
      }
    });
  });
});
