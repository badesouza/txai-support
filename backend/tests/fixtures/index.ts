/**
 * Test Fixtures
 * Reusable test data
 */

// Use crypto for UUID generation in tests
const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

export const fixtures = {
  // Valid user data
  validUser: () => ({
    name: `Test User ${Date.now()}`,
    email: `test-${generateId()}@example.com`,
    password: 'SecurePass123!',
    phone: '11999999999',
    profile: 'USER'
  }),

  // Valid admin user data
  validAdmin: () => ({
    name: `Admin ${Date.now()}`,
    email: `admin-${generateId()}@example.com`,
    password: 'AdminPass123!',
    phone: '11888888888',
    profile: 'ADMIN'
  }),

  // Valid call data
  validCall: () => ({
    title: `Test Call ${Date.now()}`,
    description: 'This is a test call description',
    status: 'OPEN',
    priority: 'MEDIUM'
  }),

  // Invalid data for validation tests
  invalidUser: {
    missingEmail: {
      name: 'Test User',
      password: 'password123',
      phone: '11999999999'
    },
    invalidEmail: {
      name: 'Test User',
      email: 'invalid-email',
      password: 'password123',
      phone: '11999999999'
    },
    shortPassword: {
      name: 'Test User',
      email: 'test@example.com',
      password: '123',
      phone: '11999999999'
    }
  },

  invalidCall: {
    missingTitle: {
      description: 'Test description',
      status: 'OPEN',
      priority: 'HIGH'
    },
    invalidStatus: {
      title: 'Test Call',
      description: 'Test description',
      status: 'INVALID_STATUS',
      priority: 'HIGH'
    }
  },

  // File upload fixtures
  testImage: {
    path: 'tests/fixtures/test-image.png',
    mimeType: 'image/png'
  }
};

// Create a simple test image (1x1 pixel PNG)
export function createTestImageBuffer(): Buffer {
  // Minimal valid PNG (1x1 transparent pixel)
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, // IEND chunk
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
  ]);
}


