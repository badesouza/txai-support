/**
 * Functional Tests - Authentication API
 */

import { ApiClient, getTestConfig } from '../../utils/api-client';
import { fixtures } from '../../fixtures';
import { itIfApi, isApiAvailable } from '../../utils/test-helpers';

describe('🔗 Authentication API', () => {
  let api: ApiClient;
  let config: ReturnType<typeof getTestConfig>;

  beforeAll(async () => {
    api = new ApiClient();
    config = getTestConfig();
    
    const available = await isApiAvailable();
    if (!available) {
      console.log('\n  ⚠️ Backend API not running - tests will be skipped\n');
    }
  });

  beforeEach(() => {
    api.clearToken();
  });

  describe('POST /users/register', () => {
    itIfApi('should register a new user', async () => {
      const userData = fixtures.validUser();
      
      const response = await api.post('/users/register', userData);

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned
    });

    itIfApi('should return JWT token on registration', async () => {
      const userData = fixtures.validUser();
      
      const response = await api.post('/users/register', userData);

      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.split('.').length).toBe(3); // JWT has 3 parts
    });

    itIfApi('should reject duplicate email', async () => {
      // First registration
      const userData = fixtures.validUser();
      await api.post('/users/register', userData);

      // Second registration with same email
      const response = await api.post('/users/register', userData);

      expect(response.status).toBe(400);
    });

    itIfApi('should reject invalid email format', async () => {
      const response = await api.post('/users/register', {
        ...fixtures.invalidUser.invalidEmail,
        phone: '11999999999'
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    itIfApi('should reject missing required fields', async () => {
      const response = await api.post('/users/register', {});

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /users/login', () => {
    itIfApi('should login with valid credentials', async () => {
      const response = await api.post('/users/login', {
        email: config.adminEmail,
        password: config.adminPassword
      });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
    });

    itIfApi('should reject invalid credentials', async () => {
      const response = await api.post('/users/login', {
        email: config.adminEmail,
        password: 'wrong-password'
      });

      expect(response.status).toBe(401);
    });

    itIfApi('should reject non-existent user', async () => {
      const response = await api.post('/users/login', {
        email: 'nonexistent@example.com',
        password: 'anypassword'
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    itIfApi('should return user info without password', async () => {
      const response = await api.post('/users/login', {
        email: config.adminEmail,
        password: config.adminPassword
      });

      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.email).toBe(config.adminEmail);
    });
  });

  describe('Protected Routes', () => {
    itIfApi('should reject requests without token', async () => {
      const response = await api.get('/users');

      expect(response.status).toBe(401);
    });

    itIfApi('should reject requests with invalid token', async () => {
      api.setToken('invalid-token');
      const response = await api.get('/users');

      expect(response.status).toBe(401);
    });

    itIfApi('should accept requests with valid token', async () => {
      await api.loginAsAdmin();
      const response = await api.get('/users');

      expect(response.status).toBe(200);
    });
  });
});
