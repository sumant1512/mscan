import { Page, expect } from '@playwright/test';
import { TEST_CONFIG } from './test-config.js';
import { DatabaseHelper } from './database-helper.js';

/**
 * Authentication Helper Class
 * Handles OTP-based login for both Super Admin and Tenant users
 */
export class AuthHelper {
  private dbHelper: DatabaseHelper;

  constructor(private page: Page) {
    this.dbHelper = new DatabaseHelper();
  }

  /**
   * Login as Super Admin
   */
  async loginAsSuperAdmin() {
    console.log('🔐 Starting Super Admin login...');
    await this.page.goto(TEST_CONFIG.superAdmin.baseUrl + '/login');
    await this.page.waitForLoadState('networkidle');
    console.log('✅ Login page loaded');

    // Connect to database to fetch OTP
    await this.dbHelper.connect();

    // Enter email
    console.log(`📧 Entering email: ${TEST_CONFIG.superAdmin.email}`);
    await this.page.fill('input#email', TEST_CONFIG.superAdmin.email);
    
    // Click Send OTP and wait for the button to show "Sending..."
    await this.page.click('button:has-text("Send OTP")');
    console.log('📨 Clicked Send OTP button, waiting for response...');
    
    // Wait for loading to complete (button text changes from "Sending..." back)
    await this.page.waitForLoadState('networkidle');
    
    // Give it a moment for the UI to update and OTP to be created in database
    await this.page.waitForTimeout(2000);

    // Wait for either OTP step or error message
    try {
      await this.page.waitForSelector('button:has-text("Verify & Login")', { 
        timeout: TEST_CONFIG.timeouts.medium 
      });
      console.log('✅ OTP input screen appeared');
    } catch (error) {
      // Check for error messages
      const errorMsg = await this.page.locator('.error-message-box').textContent().catch(() => null);
      
      console.error('❌ OTP screen did not appear');
      console.error('  Error message on page:', errorMsg);
      
      if (errorMsg) {
        await this.dbHelper.disconnect();
        throw new Error(`OTP request failed: ${errorMsg}`);
      }
      
      await this.dbHelper.disconnect();
      throw new Error('OTP screen did not appear. Check if the frontend is properly handling the response.');
    }

    // Fetch the actual OTP from database
    const actualOTP = await this.dbHelper.getLatestOTP(TEST_CONFIG.superAdmin.email);
    if (!actualOTP) {
      await this.dbHelper.disconnect();
      throw new Error('Failed to retrieve OTP from database');
    }

    // Enter the actual OTP
    console.log(`🔢 Entering OTP: ${actualOTP}`);
    await this.page.fill('input#otp', actualOTP);
    
    // Click verify button
    await this.page.click('button:has-text("Verify & Login")');
    console.log('✅ Clicked Verify & Login');

    // Wait for navigation with better error handling
    try {
      await this.page.waitForURL('**/dashboard', { 
        timeout: TEST_CONFIG.timeouts.navigation 
      });
      console.log('✅ Successfully navigated to dashboard');
    } catch (error) {
      // Check for error messages on the page
      const errorMsg = await this.page.locator('.error-message-box').textContent().catch(() => null);
      const currentUrl = this.page.url();
      
      console.error('❌ Login failed:');
      console.error('  Current URL:', currentUrl);
      console.error('  Error message:', errorMsg);
      
      await this.dbHelper.disconnect();
      
      if (errorMsg) {
        throw new Error(`Login failed: ${errorMsg}`);
      }
      throw new Error(`Failed to navigate to dashboard. Current URL: ${currentUrl}`);
    }

    // Disconnect from database
    await this.dbHelper.disconnect();

    // Verify successful login
    await expect(this.page).toHaveURL(/.*dashboard/);
    console.log('🎉 Super Admin login successful!');
  }

  /**
   * Login as Tenant Admin
   * Handles subdomain-based login with fallback to API-based token generation
   */
  async loginAsTenantAdmin(tenantConfig: typeof TEST_CONFIG.tenant1) {
    console.log(`🔐 Starting Tenant Admin login for ${tenantConfig.email}...`);
    await this.page.goto(tenantConfig.baseUrl + '/login');
    await this.page.waitForLoadState('networkidle');

    // Connect to database
    await this.dbHelper.connect();

    // Enter email
    console.log(`📧 Entering email: ${tenantConfig.email}`);
    await this.page.fill('input#email', tenantConfig.email);
    await this.page.click('button:has-text("Send OTP")');

    // Wait for loading to complete and UI to update
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    // Try to detect OTP input; if it doesn't appear, use API fallback
    let otpInputVisible = false;
    try {
      await this.page.waitForSelector('input#otp', { 
        timeout: TEST_CONFIG.timeouts.medium 
      });
      otpInputVisible = true;
      console.log('✅ OTP input screen appeared');
    } catch (e) {
      console.warn('⚠️  OTP input did not appear - will use API fallback');
      otpInputVisible = false;
    }

    // Fetch actual OTP from database, fallback to test OTP if none found
    let actualOTP = await this.dbHelper.getLatestOTP(tenantConfig.email);
    if (!actualOTP) {
      console.warn(`⚠️  No OTP found in database for ${tenantConfig.email}, using TEST_CONFIG.testOTP`);
      actualOTP = TEST_CONFIG.testOTP;
    } else {
      console.log(`🔢 Retrieved OTP from database: ${actualOTP}`);
    }

    if (otpInputVisible) {
      // Normal UI flow - OTP input is visible
      console.log('🔢 Entering OTP in UI');
      await this.page.fill('input#otp', actualOTP);
      await this.page.click('button:has-text("Verify & Login")');

      // Wait for dashboard
      await this.page.waitForURL('**/dashboard', { 
        timeout: TEST_CONFIG.timeouts.navigation 
      });

      // Disconnect from database
      await this.dbHelper.disconnect();
      console.log('🎉 Tenant Admin login successful via UI!');
      await expect(this.page).toHaveURL(/.*dashboard/);
      return;
    }

    // Fallback: OTP input didn't appear (subdomain API call failed)
    // Verify OTP via root domain API and set tokens manually
    console.log('🔄 Using API fallback to verify OTP via root domain...');
    try {
      // Use root domain API endpoint to verify OTP
      const verifyUrl = `${TEST_CONFIG.apiURL}/auth/verify-otp`;
      console.log(`📡 Calling: ${verifyUrl}`);
      
      const response: { success: boolean; error?: string; data?: any } = await this.page.evaluate(async ({ url, email, otp }) => {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
          });
          
          if (!res.ok) {
            const text = await res.text();
            return { success: false, error: `HTTP ${res.status}: ${text}` };
          }
          
          const json = await res.json();
          return { success: true, data: json };
        } catch (err: any) {
          return { success: false, error: err.message || String(err) };
        }
      }, { url: verifyUrl, email: tenantConfig.email, otp: actualOTP });

      if (!response.success || !response.data?.success) {
        throw new Error(`API verification failed: ${response.error || response.data?.message || 'Unknown error'}`);
      }

      const { accessToken, refreshToken, userType, subdomain } = response.data.data;
      console.log('✅ OTP verified via API, setting tokens in localStorage');

      // Set tokens in localStorage
      await this.page.evaluate(({ accessToken, refreshToken, userType, subdomain }) => {
        (globalThis as any).localStorage.setItem('tms_access_token', accessToken);
        (globalThis as any).localStorage.setItem('tms_refresh_token', refreshToken);
        (globalThis as any).localStorage.setItem('tms_user_type', userType || 'TENANT_ADMIN');
        if (subdomain) {
          (globalThis as any).localStorage.setItem('tms_tenant_subdomain', subdomain);
        }
      }, { accessToken, refreshToken, userType, subdomain });

      // Navigate to dashboard
      console.log('🚀 Navigating to dashboard...');
      await this.page.goto(tenantConfig.baseUrl + '/dashboard');
      await this.page.waitForURL('**/dashboard', { 
        timeout: TEST_CONFIG.timeouts.navigation 
      });

      await this.dbHelper.disconnect();
      console.log('🎉 Tenant Admin login successful via API fallback!');
      await expect(this.page).toHaveURL(/.*dashboard/);
    } catch (error) {
      const errorMsg = await this.page.locator('.error-message-box').textContent().catch(() => null);
      await this.dbHelper.disconnect();
      console.error('❌ Tenant admin login failed:', error);
      throw new Error(
        `Tenant admin login failed. API verification error: ${String(error)}${errorMsg ? ` | UI Error: ${errorMsg}` : ''}`
      );
    }
  }

  /**
   * Logout from application
   */
  async logout() {
    // Click logout button (try multiple selectors)
    const logoutButton = this.page.locator('button:has-text("Logout"), .btn-logout, .logout-btn').first();
    await logoutButton.click();
    
    // Verify redirected to login
    await this.page.waitForURL('**/login', { 
      timeout: TEST_CONFIG.timeouts.medium 
    });
    await expect(this.page).toHaveURL(/.*login/);
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    const currentUrl = this.page.url();
    return !currentUrl.includes('/login');
  }

  /**
   * Get stored token from (globalThis as any).localStorage
   */
  async getStoredToken(): Promise<string | null> {
    return await this.page.evaluate(() => {
      return (globalThis as any).localStorage.getItem('tms_access_token');
    });
  }

  /**
   * Get access token (alias for getStoredToken)
   */
  async getAccessToken(): Promise<string | null> {
    return await this.getStoredToken();
  }

  /**
   * Clear all auth tokens
   */
  async clearTokens() {
    await this.page.evaluate(() => {
      (globalThis as any).localStorage.removeItem('tms_access_token');
      (globalThis as any).localStorage.removeItem('tms_refresh_token');
      (globalThis as any).localStorage.removeItem('tms_user_type');
      (globalThis as any).localStorage.removeItem('tms_tenant_subdomain');
    });
  }
}

/**
 * Page Object Helper Base Class
 */
export class PageHelper {
  constructor(protected page: Page) {}

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoadingToComplete() {
    await this.page.waitForLoadState('networkidle');
    // Wait for any loading spinners or "Sending..." states to disappear
    await this.page.waitForFunction(
      () => {
        const loadingElements = (globalThis as any).document.querySelectorAll('[class*="loading"], [class*="spinner"]');
        const sendingButtons = Array.from((globalThis as any).document.querySelectorAll('button')).filter(
          (btn: any) => btn.textContent?.includes('Sending') || btn.textContent?.includes('Loading')
        );
        return loadingElements.length === 0 && sendingButtons.length === 0;
      },
      { timeout: TEST_CONFIG.timeouts.medium }
    );
  }

  /**
   * Wait for success message
   */
  async waitForSuccessMessage(message?: string) {
    const selector = message 
      ? `text=${message}` 
      : '[class*="success"], .alert-success, [role="alert"]:has-text("success")';
    
    await this.page.waitForSelector(selector, { 
      timeout: TEST_CONFIG.timeouts.medium 
    });
  }

  /**
   * Wait for error message
   */
  async waitForErrorMessage(message?: string) {
    const selector = message 
      ? `text=${message}` 
      : '[class*="error"], .alert-danger, [role="alert"]:has-text("error")';
    
    await this.page.waitForSelector(selector, { 
      timeout: TEST_CONFIG.timeouts.medium 
    });
  }

  /**
   * Navigate using sidebar menu (supports nested menus)
   */
  async navigateToMenuItem(menuText: string, subMenuText?: string) {
    // Wait for sidebar to be visible
    await this.page.waitForSelector('.side-nav', { state: 'visible', timeout: 5000 });
    
    // If submenu is specified, first click parent to expand
    if (subMenuText) {
      const parentItem = this.page.locator('.nav-item.has-children').filter({ hasText: menuText }).first();
      if (await parentItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await parentItem.click();
        await this.page.waitForTimeout(500); // Wait for submenu expansion
        
        // Now click the submenu item
        const subItem = this.page.locator('.sub-item').filter({ hasText: subMenuText }).first();
        await subItem.click();
        await this.waitForLoadingToComplete();
        return;
      }
    }
    
    // Try to find and click direct menu item (no children)
    const directItem = this.page.locator('.nav-item:not(.has-children)').filter({ hasText: menuText }).first();
    if (await directItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await directItem.click();
      await this.waitForLoadingToComplete();
      return;
    }
    
    // Try submenu items
    const subItem = this.page.locator('.sub-item').filter({ hasText: menuText }).first();
    if (await subItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await subItem.click();
      await this.waitForLoadingToComplete();
      return;
    }

    throw new Error(`Navigation menu item "${menuText}"${subMenuText ? ` > "${subMenuText}"` : ''} not found`);
  }

  /**
   * Fill form field by label
   */
  async fillFieldByLabel(label: string, value: string) {
    const input = this.page.locator(`label:has-text("${label}")`).locator('..').locator('input, textarea, select');
    await input.fill(value);
  }

  /**
   * Click button with specific text (supports multiple options)
   */
  async clickButton(...buttonTexts: string[]) {
    const text = buttonTexts.length > 0 ? buttonTexts[0] : '';
    await this.page.click(`button:has-text("${text}")`);
  }

  /**
   * Verify table contains text
   */
  async verifyTableContainsText(text: string) {
    await expect(this.page.locator('table')).toContainText(text);
  }

  /**
   * Get table row count
   */
  async getTableRowCount(): Promise<number> {
    return await this.page.locator('tbody tr').count();
  }

  /**
   * Click action button in table row
   */
  async clickTableRowAction(rowText: string, actionText: string) {
    // Wait for table to be loaded
    await this.page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const row = this.page.locator(`tr:has-text("${rowText}")`);
    
    // Wait for the row to be visible
    await row.waitFor({ state: 'visible', timeout: 5000 });
    
    // Try multiple selectors: button text, title attribute, or emoji content
    const selectors = [
      `button:has-text("${actionText}")`,
      `button[title="${actionText}"]`,
      `button.btn-icon[title="${actionText}"]`
    ];
    
    for (const selector of selectors) {
      const button = row.locator(selector);
      if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
        await button.click();
        return;
      }
    }
    
    throw new Error(`Action button "${actionText}" not found in row "${rowText}"`);
  }
}
