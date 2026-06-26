/**
 * Jest Setup - Runs before each test file
 */

import dotenv from 'dotenv';
import path from 'path';

// Load test environment
dotenv.config({ path: path.join(__dirname, 'test.env') });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.API_URL = process.env.API_URL || 'http://localhost:3001/api';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://txai:txai_secret@localhost:5432/txai_support';

// Extend Jest matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      pass,
      message: () => pass
        ? `Expected ${received} not to be a valid UUID`
        : `Expected ${received} to be a valid UUID`
    };
  },
  
  toBeISODate(received: string) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime()) && received.includes('T');
    return {
      pass,
      message: () => pass
        ? `Expected ${received} not to be a valid ISO date`
        : `Expected ${received} to be a valid ISO date`
    };
  }
});

// Declare custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeISODate(): R;
    }
  }
}

// Global test timeout
jest.setTimeout(30000);

// Suppress console during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn()
// };


