import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for MScan E2E Tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Sequential execution for better stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  // globalSetup: './tests/global-setup.ts', // Disabled due to OTP rate limiting
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // headless mode can be controlled via CLI: --headed or default (headless)
    // storageState: '.auth/super-admin.json', // Disabled - login in each test instead
  },
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  // webServer: [
  //   {
  //     command: 'cd ../mscan-client && npm start',
  //     url: 'http://localhost:4200',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 120000,
  //   },
  // ],
});
