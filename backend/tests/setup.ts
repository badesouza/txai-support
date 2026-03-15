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
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8082';
process.env.GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || 'local-dev';

// Global test timeout
jest.setTimeout(30000);

// Suppress console during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn()
// };



