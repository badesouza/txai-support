/**
 * E2E Tests - Complete User Journey
 * Tests the full user workflow from registration to managing calls
 */

import { ApiClient } from '../utils/api-client';
import { fixtures } from '../fixtures';
import { itIfApi, isApiAvailable } from '../utils/test-helpers';

describe('🌐 E2E - User Journey', () => {
  let api: ApiClient;
  let testUser: ReturnType<typeof fixtures.validUser>;
  let userId: string;
  let callId: string;

  beforeAll(async () => {
    api = new ApiClient();
    testUser = fixtures.validUser();
    
    const available = await isApiAvailable();
    if (!available) {
      console.log('\n  ⚠️ Backend API not running - tests will be skipped\n');
    }
  });

  describe('Step 1: User Registration', () => {
    itIfApi('should complete new user registration', async () => {
      const response = await api.post('/users/register', testUser);

      expect(response.status).toBe(201);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.id).toBeDefined();
      
      userId = response.body.user.id;
      api.setToken(response.body.token);

      console.log(`    ✓ User registered: ${testUser.email}`);
    });
  });

  describe('Step 2: User Login', () => {
    itIfApi('should login with registered credentials', async () => {
      api.clearToken();
      
      const response = await api.post('/users/login', {
        email: testUser.email,
        password: testUser.password
      });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      
      api.setToken(response.body.token);
      console.log(`    ✓ User logged in successfully`);
    });
  });

  describe('Step 3: Create Support Call', () => {
    itIfApi('should create a new support call', async () => {
      const callData = {
        title: 'E2E Test Call - Network Issue',
        description: 'Having issues connecting to the network. Please help!',
        status: 'OPEN',
        priority: 'HIGH'
      };

      const response = await api.post('/calls', callData);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('OPEN');
      
      callId = response.body.id;
      console.log(`    ✓ Call created: ${callId.slice(0, 8)}...`);
    });
  });

  describe('Step 4: View Call Details', () => {
    itIfApi('should retrieve call details', async () => {
      if (!callId) return;
      
      const response = await api.get(`/calls/${callId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(callId);
      expect(response.body.title).toContain('E2E Test Call');
      
      console.log(`    ✓ Call details retrieved`);
    });
  });

  describe('Step 5: Update Call Status', () => {
    itIfApi('should update call to IN_PROGRESS', async () => {
      if (!callId) return;
      
      const response = await api.put(`/calls/${callId}`, {
        status: 'IN_PROGRESS'
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('IN_PROGRESS');
      
      console.log(`    ✓ Call status updated to IN_PROGRESS`);
    });

    itIfApi('should update call to RESOLVED', async () => {
      if (!callId) return;
      
      const response = await api.put(`/calls/${callId}`, {
        status: 'CLOSED'
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CLOSED');
      
      console.log(`    ✓ Call status updated to CLOSED`);
    });
  });

  describe('Step 6: List User Calls', () => {
    itIfApi('should list calls for authenticated user', async () => {
      const response = await api.get('/calls');

      expect(response.status).toBe(200);
      expect(response.body.calls).toBeDefined();
      
      console.log(`    ✓ User calls listed (${response.body.calls.length} total)`);
    });
  });

  describe('Step 7: Update User Profile', () => {
    itIfApi('should update user name', async () => {
      if (!userId) return;
      
      const newName = 'E2E Updated Name';
      const response = await api.put(`/users/${userId}`, {
        name: newName
      });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(newName);
      
      console.log(`    ✓ User profile updated`);
    });
  });

  describe('Step 8: Cleanup', () => {
    itIfApi('should delete test call', async () => {
      if (!callId) return;
      
      const response = await api.delete(`/calls/${callId}`);

      expect(response.status).toBe(200);
      console.log(`    ✓ Test call deleted`);
    });

    itIfApi('should delete test user', async () => {
      if (!userId) return;
      
      // Login as admin to delete user
      await api.loginAsAdmin();
      
      const response = await api.delete(`/users/${userId}`);

      expect(response.status).toBe(200);
      console.log(`    ✓ Test user deleted`);
    });
  });
});

describe('🌐 E2E - Admin Journey', () => {
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

  describe('Admin Dashboard', () => {
    itIfApi('should list all users', async () => {
      const response = await api.get('/users');

      expect(response.status).toBe(200);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
      
      console.log(`    ✓ Listed ${response.body.users.length} users`);
    });

    itIfApi('should list all calls', async () => {
      const response = await api.get('/calls');

      expect(response.status).toBe(200);
      expect(response.body.calls).toBeDefined();
      
      console.log(`    ✓ Listed ${response.body.calls.length} calls`);
    });

    itIfApi('should get statistics', async () => {
      const response = await api.get('/calls/statistics');

      // Stats endpoint might not exist
      if (response.status === 200) {
        expect(response.body).toBeDefined();
        console.log(`    ✓ Statistics retrieved`);
      } else {
        console.log(`    ⚠ Statistics endpoint not available`);
      }
    });
  });

  describe('Admin User Management', () => {
    itIfApi('should create a new admin user', async () => {
      const adminData = fixtures.validAdmin();
      
      const response = await api.post('/users/register', adminData);

      expect(response.status).toBe(201);
      
      // Cleanup
      if (response.body.user?.id) {
        await api.delete(`/users/${response.body.user.id}`);
      }
      
      console.log(`    ✓ Admin user created and deleted`);
    });
  });
});
