/**
 * Test Helpers
 * Utilities for conditional test execution
 */

import http from 'http';
import https from 'https';

/**
 * Check if a URL is reachable
 */
export const isUrlReachable = async (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, (res) => {
      resolve(res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
};

/**
 * Check if the API is available
 */
let apiAvailable: boolean | null = null;
export const isApiAvailable = async (): Promise<boolean> => {
  if (apiAvailable !== null) return apiAvailable;
  
  const apiUrl = process.env.API_URL || 'http://localhost:3001/api';
  apiAvailable = await isUrlReachable(`${apiUrl}/health`);
  return apiAvailable;
};

/**
 * Skip test if API is not available
 */
export const skipIfNoApi = async (testFn: () => Promise<void>) => {
  const available = await isApiAvailable();
  if (!available) {
    console.log('    ⚠️ API not available - skipping');
    return;
  }
  await testFn();
};

/**
 * Conditional describe block
 * Only runs tests if API is available
 */
export const describeIfApi = (name: string, fn: () => void) => {
  describe(name, () => {
    beforeAll(async () => {
      const available = await isApiAvailable();
      if (!available) {
        console.log(`\n  ⚠️ Skipping "${name}" - API not available\n`);
      }
    });
    fn();
  });
};

/**
 * Create a test that skips if API unavailable
 */
export const itIfApi = (name: string, fn: () => Promise<void>, timeout?: number) => {
  it(name, async () => {
    const available = await isApiAvailable();
    if (!available) {
      console.log(`    ⏭️ Skipped: ${name}`);
      return;
    }
    await fn();
  }, timeout);
};

