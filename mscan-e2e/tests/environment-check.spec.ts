import { test, expect } from '@playwright/test';

/**
 * Environment Check Tests
 * Run these first to ensure your environment is properly configured
 */

// Environment tests don't need authentication
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Environment Checks', () => {
  
  test('should verify backend is accessible', async ({ request }) => {
    try {
      // Try to make a simple API call to verify backend is running
      const response = await request.post('http://localhost:3000/api/auth/request-otp', {
        data: { email: 'test@example.com' }
      });
      
      console.log('✅ Backend is accessible');
      console.log('   Status:', response.status());
      
      // Status 200 or 400 (bad request) both mean backend is running
      expect([200, 201, 400, 404]).toContain(response.status());
    } catch (error: any) {
      if (error.message?.includes('ECONNREFUSED')) {
        console.error('❌ Backend is not accessible at http://localhost:3000');
        console.error('⚠️  Please start your backend server:');
        console.error('    cd mscan-server && npm start');
      }
      throw error;
    }
  });

  test('should verify frontend is accessible', async ({ page }) => {
    try {
      await page.goto('http://localhost:4200', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      console.log('✅ Frontend is accessible');
      expect(page.url()).toContain('localhost:4200');
    } catch (error) {
      console.error('❌ Frontend is not accessible at http://localhost:4200');
      console.error('⚠️  Please start your frontend server:');
      console.error('    cd mscan-client && npm start');
      throw error;
    }
  });

  test('should load login page successfully', async ({ page }) => {
    await page.goto('http://localhost:4200/login');
    await page.waitForLoadState('networkidle');
    
    // Check for login form elements
    const emailInput = await page.locator('input#email').isVisible();
    const sendOTPButton = await page.locator('button:has-text("Send OTP")').isVisible();
    
    console.log('✅ Login page loaded successfully');
    console.log('  Email input visible:', emailInput);
    console.log('  Send OTP button visible:', sendOTPButton);
    
    expect(emailInput).toBeTruthy();
    expect(sendOTPButton).toBeTruthy();
  });

  test('should verify console for network errors', async ({ page }) => {
    const consoleMessages: string[] = [];
    const errors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        errors.push(text);
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    await page.goto('http://localhost:4200/login');
    await page.waitForLoadState('networkidle');
    
    if (errors.length > 0) {
      console.warn('⚠️  Console errors detected:');
      errors.forEach(err => console.warn('  ', err));
    } else {
      console.log('✅ No console errors detected');
    }
  });

  test('should test API endpoint directly', async ({ request }) => {
    try {
      const response = await request.post('http://localhost:3000/api/auth/request-otp', {
        data: {
          email: 'admin@mscan.com'
        }
      });
      
      const status = response.status();
      console.log('📨 OTP Request Response Status:', status);
      
      if (status === 200 || status === 201) {
        console.log('✅ OTP request API is working');
        const body = await response.json();
        console.log('Response:', body);
      } else {
        console.error('❌ OTP request failed with status:', status);
        const body = await response.text();
        console.error('Response:', body);
      }
    } catch (error) {
      console.error('❌ Failed to call OTP API:', error);
      throw error;
    }
  });
});
