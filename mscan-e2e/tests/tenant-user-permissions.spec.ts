/**
 * E2E Tests: Tenant User & Permission Management
 * 
 * Test Coverage:
 * - Super Admin creates permissions
 * - Super Admin creates users with permissions
 * - Tenant Admin creates users with allowed permissions
 * - Tenant Admin cannot assign forbidden permissions
 * - Tenant isolation (cannot access other tenant's users)
 * - Effective permissions (tenant + user level)
 * - Duplicate email/permission validation
 * - Audit logging
 * - UI role-based visibility
 * - Pagination
 */

import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin, loginAsTenantAdmin, loginAsTenantUser } from '../utils/helpers';
import { DatabaseHelper } from '../utils/database-helper';
import { TestConfig } from '../utils/test-config';

test.describe('Tenant User & Permission Management', () => {
  let dbHelper: DatabaseHelper;
  let superAdminContext: any;
  let tenantAdminContext: any;
  let testTenantId: string;
  let secondTenantId: string;

  test.beforeAll(async () => {
    dbHelper = new DatabaseHelper();
    await dbHelper.connect();
  });

  test.afterAll(async () => {
    // Clean up test data
    if (testTenantId) {
      await dbHelper.cleanupTenant(testTenantId);
    }
    if (secondTenantId) {
      await dbHelper.cleanupTenant(secondTenantId);
    }
    await dbHelper.disconnect();
  });

  test.beforeEach(async ({ page }) => {
    // Setup test tenants using actual schema
    const timestamp = Date.now();
    const tenantResult = await dbHelper.query(
      `INSERT INTO tenants (tenant_name, email, phone, is_active, subdomain_slug)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [`Test Tenant ${timestamp}`, `test-${timestamp}@example.com`, '1234567890', true, `test-${timestamp}`]
    );
    testTenantId = tenantResult.rows[0].id;

    const timestamp2 = Date.now() + 1;
    const tenant2Result = await dbHelper.query(
      `INSERT INTO tenants (tenant_name, email, phone, is_active, subdomain_slug)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [`Test Tenant 2 ${timestamp2}`, `test2-${timestamp2}@example.com`, '0987654321', true, `test2-${timestamp2}`]
    );
    secondTenantId = tenant2Result.rows[0].id;
  });

  test.describe('13.4.1 Super Admin creates permission definition', () => {
    test('Super Admin can create new permission', async ({ page }) => {
      await loginAsSuperAdmin(page);
      
      // Navigate to permissions page (if UI exists)
      // For now, test via API
      const token = await page.evaluate(() => localStorage.getItem('token'));
      
      const response = await page.request.post(`${TestConfig.API_BASE_URL}/api/v1/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          code: `TEST_PERMISSION_${Date.now()}`,
          name: 'Test Permission',
          description: 'Test permission created via E2E',
          scope: 'TENANT',
          allowed_assigners: ['SUPER_ADMIN', 'TENANT_ADMIN']
        }
      });

      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.permission).toBeDefined();
      expect(data.permission.code).toContain('TEST_PERMISSION_');
    });

    test('Super Admin cannot create duplicate permission', async ({ page }) => {
      await loginAsSuperAdmin(page);
      const token = await page.evaluate(() => localStorage.getItem('token'));
      
      const permissionCode = `DUP_PERM_${Date.now()}`;
      
      // Create first permission
      await page.request.post(`${TestConfig.API_BASE_URL}/api/v1/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          code: permissionCode,
          name: 'Duplicate Test',
          description: 'Test duplicate',
          scope: 'TENANT',
          allowed_assigners: ['SUPER_ADMIN']
        }
      });

      // Attempt to create duplicate
      const response = await page.request.post(`${TestConfig.API_BASE_URL}/api/v1/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          code: permissionCode,
          name: 'Duplicate Test 2',
          description: 'Test duplicate 2',
          scope: 'TENANT',
          allowed_assigners: ['SUPER_ADMIN']
        }
      });

      expect(response.status()).toBe(409);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  test.describe('13.4.2 Super Admin creates user in tenant with permissions', () => {
    test('Super Admin can create tenant user with permissions', async ({ page }) => {
      await loginAsSuperAdmin(page);
      const token = await page.evaluate(() => localStorage.getItem('token'));

      const userData = {
        username: `testuser_${Date.now()}`,
        email: `testuser_${Date.now()}@example.com`,
        full_name: 'Test User',
        password: 'TestPass123!',
        phone: '+1234567890',
        permission_ids: [] // Empty for this test, or use existing permission IDs
      };

      const response = await page.request.post(
        `${TestConfig.API_BASE_URL}/api/v1/tenants/${testTenantId}/users`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: userData
        }
      );

      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(userData.email);
    });
  });

  test.describe('13.4.3 Tenant Admin creates user with allowed permissions', () => {
    test('Tenant Admin can create user with allowed permissions', async ({ page }) => {
      // First create a tenant admin user
      const adminResult = await dbHelper.query(
        `INSERT INTO users (username, email, full_name, password_hash, role, tenant_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          `admin_${Date.now()}`,
          `admin_${Date.now()}@example.com`,
          'Test Admin',
          '$2b$10$abcdefghijklmnopqrstuv', // dummy hash
          'TENANT_ADMIN',
          testTenantId,
          1
        ]
      );
      const adminUserId = adminResult.rows[0].id;

      // Get a permission that tenant admin can assign
      const permResult = await dbHelper.query(
        `SELECT id FROM permissions 
         WHERE 'TENANT_ADMIN' = ANY(allowed_assigners) 
         LIMIT 1`
      );

      await loginAsTenantAdmin(page, testTenantId);
      const token = await page.evaluate(() => localStorage.getItem('token'));

      const userData = {
        username: `tenantuser_${Date.now()}`,
        email: `tenantuser_${Date.now()}@example.com`,
        full_name: 'Tenant Test User',
        password: 'TestPass123!',
        phone: '+1234567890',
        permission_ids: permResult.rows.length > 0 ? [permResult.rows[0].id] : []
      };

      const response = await page.request.post(
        `${TestConfig.API_BASE_URL}/api/v1/tenants/${testTenantId}/users`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: userData
        }
      );

      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('13.4.4 Tenant Admin attempts to assign forbidden permission', () => {
    test('Tenant Admin cannot assign super admin only permission', async ({ page }) => {
      // Get a super admin only permission
      const permResult = await dbHelper.query(
        `SELECT id FROM permissions 
         WHERE allowed_assigners = ARRAY['SUPER_ADMIN']::VARCHAR[] 
         LIMIT 1`
      );

      if (permResult.rows.length === 0) {
        test.skip();
        return;
      }

      await loginAsTenantAdmin(page, testTenantId);
      const token = await page.evaluate(() => localStorage.getItem('token'));

      const userData = {
        username: `forbiddenuser_${Date.now()}`,
        email: `forbiddenuser_${Date.now()}@example.com`,
        full_name: 'Forbidden Test',
        password: 'TestPass123!',
        phone: '+1234567890',
        permission_ids: [permResult.rows[0].id]
      };

      const response = await page.request.post(
        `${TestConfig.API_BASE_URL}/api/v1/tenants/${testTenantId}/users`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: userData
        }
      );

      expect(response.status()).toBe(403);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('not authorized');
    });
  });

  test.describe('13.4.5 Tenant Admin cannot access other tenant\'s users', () => {
    test('Tenant isolation is enforced', async ({ page }) => {
      // Create user in second tenant
      const userResult = await dbHelper.query(
        `INSERT INTO users (username, email, full_name, password_hash, role, tenant_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          `otheruser_${Date.now()}`,
          `otheruser_${Date.now()}@example.com`,
          'Other Tenant User',
          '$2b$10$abcdefghijklmnopqrstuv',
          'TENANT_USER',
          secondTenantId,
          1
        ]
      );
      const otherUserId = userResult.rows[0].id;

      // Login as tenant admin of first tenant
      await loginAsTenantAdmin(page, testTenantId);
      const token = await page.evaluate(() => localStorage.getItem('token'));

      // Try to access user from second tenant
      const response = await page.request.get(
        `${TestConfig.API_BASE_URL}/api/v1/tenants/${secondTenantId}/users/${otherUserId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      expect(response.status()).toBe(403);
    });
  });

  test.describe('13.4.6 User effective permissions = tenant + user level', () => {
    test('Effective permissions combine tenant and user levels', async ({ page }) => {
      // Create a test user
      const userResult = await dbHelper.query(
        `INSERT INTO users (username, email, full_name, password_hash, role, tenant_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          `effectiveuser_${Date.now()}`,
          `effectiveuser_${Date.now()}@example.com`,
          'Effective Perm User',
          '$2b$10$abcdefghijklmnopqrstuv',
          'TENANT_USER',
          testTenantId,
          1
        ]
      );
      const userId = userResult.rows[0].id;

      // Get some permissions
      const permResult = await dbHelper.query(
        `SELECT id FROM permissions LIMIT 2`
      );

      if (permResult.rows.length < 2) {
        test.skip();
        return;
      }

      // Assign tenant-level permission
      await dbHelper.query(
        `INSERT INTO permission_assignments (permission_id, tenant_id, user_id, assigned_by, is_tenant_level)
         VALUES ($1, $2, NULL, $3, true)`,
        [permResult.rows[0].id, testTenantId, 1]
      );

      // Assign user-level permission
      await dbHelper.query(
        `INSERT INTO permission_assignments (permission_id, tenant_id, user_id, assigned_by, is_tenant_level)
         VALUES ($1, $2, $3, $4, false)`,
        [permResult.rows[1].id, testTenantId, userId, 1]
      );

      await loginAsSuperAdmin(page);
      const token = await page.evaluate(() => localStorage.getItem('token'));

      // Get effective permissions
      const response = await page.request.get(
        `${TestConfig.API_BASE_URL}/api/v1/tenants/${testTenantId}/users/${userId}/permissions`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.permissions).toBeDefined();
      expect(data.permissions.length).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('13.4.7 Duplicate email in same tenant returns 409', () => {
    test('Cannot create user with duplicate email in tenant', async ({ page }) => {
      const email = `duplicate_${Date.now()}@example.com`;

      // Create first user
      await dbHelper.query(
        `INSERT INTO users (username, email, full_name, password_hash, role, tenant_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          `dup1_${Date.now()}`,
          email,
          'Duplicate 1',
          '$2b$10$abcdefghijklmnopqrstuv',
          'TENANT_USER',
          testTenantId,
          1
        ]
      );

      await loginAsSuperAdmin(page);
      const token = await page.evaluate(() => localStorage.getItem('token'));

      // Try to create second user with same email
      const userData = {
        username: `dup2_${Date.now()}`,
        email: email,
        full_name: 'Duplicate 2',
        password: 'TestPass123!',
        phone: '+1234567890',
        permission_ids: []
      };

      const response = await page.request.post(
        `${TestConfig.API_BASE_URL}/api/v1/tenants/${testTenantId}/users`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: userData
        }
      );

      expect(response.status()).toBe(409);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('already exists');
    });
  });

  test.describe('13.4.9 Delete user creates audit log entry', () => {
    test('User deletion is logged in audit_logs', async ({ page }) => {
      // Create user to delete
      const userResult = await dbHelper.query(
        `INSERT INTO users (username, email, full_name, password_hash, role, tenant_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          `deleteuser_${Date.now()}`,
          `deleteuser_${Date.now()}@example.com`,
          'Delete Test User',
          '$2b$10$abcdefghijklmnopqrstuv',
          'TENANT_USER',
          testTenantId,
          1
        ]
      );
      const userId = userResult.rows[0].id;

      await loginAsSuperAdmin(page);
      const token = await page.evaluate(() => localStorage.getItem('token'));

      // Delete user
      const response = await page.request.delete(
        `${TestConfig.API_BASE_URL}/api/v1/tenants/${testTenantId}/users/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      expect(response.status()).toBe(200);

      // Check audit log
      const auditResult = await dbHelper.query(
        `SELECT * FROM audit_logs 
         WHERE action = 'user.deleted' 
         AND target_id = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [userId.toString()]
      );

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].target_type).toBe('user');
    });
  });

  test.describe('13.4.11 Pagination works correctly for large user lists', () => {
    test('User list pagination returns correct results', async ({ page }) => {
      // Create multiple users
      for (let i = 0; i < 15; i++) {
        await dbHelper.query(
          `INSERT INTO users (username, email, full_name, password_hash, role, tenant_id, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            `paguser${i}_${Date.now()}`,
            `paguser${i}_${Date.now()}@example.com`,
            `Pagination User ${i}`,
            '$2b$10$abcdefghijklmnopqrstuv',
            'TENANT_USER',
            testTenantId,
            1
          ]
        );
      }

      await loginAsSuperAdmin(page);
      const token = await page.evaluate(() => localStorage.getItem('token'));

      // Get first page
      const response1 = await page.request.get(
        `${TestConfig.API_BASE_URL}/api/v1/tenants/${testTenantId}/users?page=1&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      expect(response1.status()).toBe(200);
      const data1 = await response1.json();
      expect(data1.success).toBe(true);
      expect(data1.users.length).toBeLessThanOrEqual(10);

      // Get second page
      const response2 = await page.request.get(
        `${TestConfig.API_BASE_URL}/api/v1/tenants/${testTenantId}/users?page=2&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      expect(response2.status()).toBe(200);
      const data2 = await response2.json();
      expect(data2.success).toBe(true);
      expect(data2.users.length).toBeGreaterThan(0);

      // Verify different results
      const firstUserId = data1.users[0]?.id;
      const secondPageIds = data2.users.map((u: any) => u.id);
      expect(secondPageIds).not.toContain(firstUserId);
    });
  });

  test.describe('13.4.10 UI shows/hides permission management based on role', () => {
    test('Super Admin can see User Management menu', async ({ page }) => {
      await loginAsSuperAdmin(page);
      await page.goto(`${TestConfig.BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Check for User Management link
      const userManagementLink = page.locator('a:has-text("User Management")');
      await expect(userManagementLink).toBeVisible();
    });

    test('Tenant Admin can see User Management menu', async ({ page }) => {
      await loginAsTenantAdmin(page, testTenantId);
      await page.goto(`${TestConfig.BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      const userManagementLink = page.locator('a:has-text("User Management")');
      await expect(userManagementLink).toBeVisible();
    });

    test('Tenant User cannot see User Management menu', async ({ page }) => {
      // Create a tenant user
      const userResult = await dbHelper.query(
        `INSERT INTO users (username, email, full_name, password_hash, role, tenant_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email`,
        [
          `reguser_${Date.now()}`,
          `reguser_${Date.now()}@example.com`,
          'Regular User',
          '$2b$10$abcdefghijklmnopqrstuv',
          'TENANT_USER',
          testTenantId,
          1
        ]
      );

      await loginAsTenantUser(page, userResult.rows[0].email, testTenantId);
      await page.goto(`${TestConfig.BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      const userManagementLink = page.locator('a:has-text("User Management")');
      await expect(userManagementLink).not.toBeVisible();
    });
  });

  test.describe('13.4.12 Permission assignment form validation', () => {
    test('Create user form validates required fields', async ({ page }) => {
      await loginAsTenantAdmin(page, testTenantId);
      await page.goto(`${TestConfig.BASE_URL}/tenant/users/create`);
      await page.waitForLoadState('networkidle');

      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Check for validation errors
      await expect(page.locator('text=required')).toBeVisible();
    });

    test('Email validation works correctly', async ({ page }) => {
      await loginAsTenantAdmin(page, testTenantId);
      await page.goto(`${TestConfig.BASE_URL}/tenant/users/create`);
      await page.waitForLoadState('networkidle');

      // Enter invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.blur('input[name="email"]');

      // Check for email validation error
      await expect(page.locator('text=/valid email/i')).toBeVisible();
    });
  });
});
