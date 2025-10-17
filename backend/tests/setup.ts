import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, 'test.env') });

const prisma = new PrismaClient();

// Declaração de tipo global para testUtils
declare global {
  var testUtils: {
    prisma: PrismaClient;
    createTestUser: (userData?: any) => Promise<any>;
    createTestCall: (userId: number, callData?: any) => Promise<any>;
  };
}

// Setup global test environment
beforeAll(async () => {
  // Set test database URL
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://txai_user:txai_password@localhost:5433/txai_support_test';
  
  // Run migrations for test database
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit'
    });
  } catch (error) {
    console.warn('Migration failed, continuing with tests:', error);
  }
});

// Cleanup after each test
afterEach(async () => {
  // Clean up test data (preserve users to keep auth tokens valid across tests)
  await prisma.userToken.deleteMany();
  await prisma.callStatusHistory.deleteMany();
  await prisma.call.deleteMany();
});

// Cleanup after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Global test utilities
global.testUtils = {
  prisma,
  createTestUser: async (userData = {}) => {
    return await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
        phone: '123456789',
        profile: 'USER',
        ...userData
      }
    });
  },
  createTestCall: async (userId: number, callData = {}) => {
    return await prisma.call.create({
      data: {
        userId,
        title: 'Test Call',
        description: 'Test Description',
        status: 'OPEN',
        priority: 'MEDIUM',
        ...callData
      }
    });
  }
};
