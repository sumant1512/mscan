/**
 * Global Setup for Playwright Tests
 * Logs in as super admin once and saves the session state
 * This avoids hitting OTP rate limits during test execution
 */
import { chromium, FullConfig } from '@playwright/test';
import { AuthHelper } from '../utils/helpers.js';
import path from 'path';
import fs from 'fs';

async function globalSetup(config: FullConfig) {
  console.log('\n🚀 Running global setup - Logging in as super admin...\n');

  // Create auth directory if it doesn't exist
  const authDir = path.join(__dirname, '../.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const storageState = path.join(authDir, 'super-admin.json');

  // Launch browser and login
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const authHelper = new AuthHelper(page);

  try {
    // Login as super admin
    await authHelper.loginAsSuperAdmin();
    
    // Save signed-in state
    await context.storageState({ path: storageState });
    console.log('\n✅ Super admin session saved to:', storageState);
    console.log('📋 This session will be reused across all tests to avoid OTP rate limits\n');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
