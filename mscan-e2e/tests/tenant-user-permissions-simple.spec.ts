/**
 * E2E Tests: Tenant User & Permission Management (Simplified)
 * 
 * Focus: Test actual implemented APIs without manual DB manipulation
 */

import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from '../utils/test-config';

// Helper to login as super admin via API
async function getSuperAdminToken(request: any): Promise<string> {
  const response = await request.post(`${TEST_CONFIG.apiURL}/v1/auth/request-otp`, {
    data: { email: 'super@admin.com' }
  });
  
  // In real tests, you'd get OTP from email/console
  // For now, assuming OTP is sent to console
  const verifyResponse = await request.post(`${TEST_CONFIG.apiURL}/v1/auth/verify-otp`, {
    data: { email: 'super@admin.com', otp_code: '000000' } // Mock OTP
  });
  
  if (verifyResponse.ok()) {
    const data = await verifyResponse.json();
    return data.token;
  }
  throw new Error('Failed to get super admin token');
}

test.describe('Tenant User & Permission Management API Tests', () => {
  
  test.describe('Permission Management (Super Admin)', () => {
    
    test('GET /api/v1/permissions - should list all permissions', async ({ request }) => {
      const response = await request.get(`${TEST_CONFIG.apiURL}/api/v1/permissions`);
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.permissions).toBeDefined();
      expect(Array.isArray(data.permissions)).toBe(true);
      expect(data.permissions.length).toBeGreaterThan(0);
      
      // Check permission structure
      const firstPerm = data.permissions[0];
      expect(firstPerm).toHaveProperty('id');
      expect(firstPerm).toHaveProperty('code');
      expect(firstPerm).toHaveProperty('name');
      expect(firstPerm).toHaveProperty('description');
    });
    
    test('GET /api/v1/permissions/allowed/TENANT_ADMIN - should list tenant admin permissions', async ({ request }) => {
      const response = await request.get(`${TEST_CONFIG.apiURL}/api/v1/permissions/allowed/TENANT_ADMIN`);
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.permissions).toBeDefined();
      expect(Array.isArray(data.permissions)).toBe(true);
      
      // Tenant admin should have limited permissions compared to super admin
      expect(data.permissions.length).toBeGreaterThan(0);
      expect(data.permissions.length).toBeLessThan(30);
    });
    
    test('GET /api/v1/permissions/allowed/TENANT_USER - should list tenant user permissions', async ({ request }) => {
      const response = await request.get(`${TEST_CONFIG.apiURL}/api/v1/permissions/allowed/TENANT_USER`);
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.permissions).toBeDefined();
      
      // Tenant user should have minimal permissions
      expect(data.permissions.length).toBeGreaterThan(0);
      expect(data.permissions.length).toBeLessThan(10);
    });
  });
  
  test.describe('Permission Filtering', () => {
    
    test('Filter permissions by scope=TENANT', async ({ request }) => {
      const response = await request.get(`${TEST_CONFIG.apiURL}/api/v1/permissions?scope=TENANT`);
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      
      // All returned permissions should have TENANT scope
      data.permissions.forEach((perm: any) => {
        expect(perm.scope).toBe('TENANT');
      });
    });
    
    test('Filter permissions by assignable_by=TENANT_ADMIN', async ({ request }) => {
      const response = await request.get(`${TEST_CONFIG.apiURL}/api/v1/permissions?assignable_by=TENANT_ADMIN`);
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      
      // All returned permissions should be assignable by tenant admin
      data.permissions.forEach((perm: any) => {
        expect(perm.allowed_assigners).toContain('TENANT_ADMIN');
      });
    });
  });
  
  test.describe('Permission Details', () => {
    
    test('GET /api/v1/permissions/:code - should get specific permission', async ({ request }) => {
      // First get all permissions to find a code
      const listResponse = await request.get(`${TEST_CONFIG.apiURL}/api/v1/permissions`);
      const listData = await listResponse.json();
      const firstPermCode = listData.permissions[0].code;
      
      // Now get that specific permission
      const response = await request.get(`${TEST_CONFIG.apiURL}/api/v1/permissions/${firstPermCode}`);
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.permission).toBeDefined();
      expect(data.permission.code).toBe(firstPermCode);
    });
    
    test('GET /api/v1/permissions/:code - should return 404 for non-existent permission', async ({ request }) => {
      const response = await request.get(`${TEST_CONFIG.apiURL}/api/v1/permissions/NON_EXISTENT_PERM`);
      
      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });
  
  test.describe('Tenant User Management (Basic)', () => {
    
    test('API structure validation - check tenant users endpoint exists', async ({ request }) => {
      // Test that the endpoint exists (even if it returns 401 without auth)
      const response = await request.get(`${TEST_CONFIG.apiURL}/api/v1/tenants/test-tenant-id/users`);
      
      // Should get 401 or 403, not 404
      expect([401, 403]).toContain(response.status());
    });
  });
  
  test.describe('Health Check', () => {
    
    test('Backend server should be running', async ({ request }) => {
      const response = await request.get(`${TEST_CONFIG.apiURL}/health`);
      expect([200, 404]).toContain(response.status()); // 404 is ok if no health endpoint
    });
  });
});

test.describe('Permission Data Validation', () => {
  
  test('Should have required permission codes seeded', async ({ request }) => {
    const response = await request.get(`${TEST_CONFIG.apiURL}/api/v1/permissions`);
    const data = await response.json();
    
    const permissionCodes = data.permissions.map((p: any) => p.code);
    
    // Check for expected permissions based on the migration
    const expectedPermissions = [
      'MANAGE_TENANTS',
      'MANAGE_USERS',
      'VIEW_USERS',
      'CREATE_COUPONS',
      'VIEW_COUPONS'
    ];
    
    expectedPermissions.forEach(code => {
      expect(permissionCodes).toContain(code);
    });
  });
  
  test('Permission scopes should be valid', async ({ request }) => {
    const response = await request.get(`${TEST_CONFIG.apiURL}/api/v1/permissions`);
    const data = await response.json();
    
    const validScopes = ['GLOBAL', 'TENANT', 'USER'];
    
    data.permissions.forEach((perm: any) => {
      expect(validScopes).toContain(perm.scope);
    });
  });
  
  test('Permission allowed_assigners should be valid', async ({ request }) => {
    const response = await request.get(`${TEST_CONFIG.apiURL}/api/v1/permissions`);
    const data = await response.json();
    
    const validRoles = ['SUPER_ADMIN', 'TENANT_ADMIN'];
    
    data.permissions.forEach((perm: any) => {
      expect(Array.isArray(perm.allowed_assigners)).toBe(true);
      perm.allowed_assigners.forEach((role: string) => {
        expect(validRoles).toContain(role);
      });
    });
  });
});
