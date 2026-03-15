// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Env vars:
 * - BASE_URL: frontend base url, e.g. https://bizybox-gcp-project-dev.web.app
 * - ADMIN_EMAIL / ADMIN_PASSWORD: credentials
 *
 * Optional:
 * - CI=1 (enables retries + forbids test.only)
 * - PW_HEADFUL=1 (forces headed mode via config, useful outside CLI flags)
 */
const baseURL = process.env.BASE_URL || 'http://localhost:8081';

module.exports = defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    headless: process.env.PW_HEADFUL ? false : true,
    viewport: { width: 1365, height: 768 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

