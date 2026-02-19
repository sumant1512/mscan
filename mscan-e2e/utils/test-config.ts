/**
 * Test Configuration
 * Centralized configuration for test data and environment settings
 */

export const TEST_CONFIG = {
  // Base URLs
  baseURL: 'http://localhost:4200',
  apiURL: 'http://localhost:3000/api',

  // Super Admin Credentials
  superAdmin: {
    email: 'admin@mscan.com',
    expectedRole: 'SUPER_ADMIN',
    baseUrl: 'http://localhost:4200'
  },

  // Test Tenant 1
  tenant1: {
    subdomain: 'sumant',
    email: 'sumant@mscan.com',  // Using actual tenant admin from database
    baseUrl: 'http://sumant.localhost:4200',   // Use localhost for E2E tests (tenant identified by email)
    apiBaseUrl: 'http://localhost:3000/api',  // API base URL
    tenant_name: 'sumant',
    contactName: 'Sumant Mishra'
  },

  // Test Tenant 2 (for isolation testing)
  tenant2: {
    subdomain: 'test-company-1767426455059',
    email: 'test1767426455059@example.com',  // Using actual tenant admin from database
    baseUrl: 'http://test-company-1767426455059.localhost:4200',  // Use localhost for E2E tests (tenant identified by email)
    apiBaseUrl: 'http://localhost:3000/api',  // API base URL
    tenant_name: 'Test Company 1767426455059',
    contactName: 'Test User'
  },

  // Timeouts
  timeouts: {
    short: 5000,
    medium: 10000,
    long: 30000,
    navigation: 60000
  },

  // OTP for testing (IMPORTANT: Update this with your actual test OTP)
  // For local testing, you may need to check your email or console logs
  // Or configure your backend to accept a fixed OTP in test mode
  testOTP: '123456',  // ⚠️ UPDATE THIS WITH YOUR ACTUAL TEST OTP

  // Pagination
  defaultPageSize: 10,

  // Wait conditions
  waitForLoadingToDisappear: 10000,
  waitForSuccessMessage: 5000,
};

/**
 * Test Data Templates
 */
export const TEST_DATA = {
  // New tenant data
  newTenant: {
    companyName: 'E2E Test Company',
    contactName: 'E2E Test Contact',
    email: 'e2etest@example.com',
    phone: '+1234567890',
    subdomain: 'e2etest'
  },

  // New coupon data
  newCoupon: {
    offerTitle: 'E2E Test Offer',
    offerDescription: 'Test offer created by E2E automation',
    termsAndConditions: 'Test terms and conditions',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    maxRedemptions: 100,
    discountValue: 50,
    category: 'FOOD'
  },

  // Credit request data
  creditRequest: {
    amount: 1000,
    justification: 'E2E test credit request for testing purposes'
  },

  // Customer data
  newCustomer: {
    firstName: 'E2E Test',
    lastName: 'Customer',
    email: 'e2ecustomer@example.com',
    phone: '+1987654321',
    dateOfBirth: '1990-01-15',
    gender: 'male'
  },

  // User data
  newUser: {
    fullName: 'E2E Test User',
    email: 'e2euser@example.com',
    phone: '+1122334455',
    role: 'TENANT_ADMIN'
  }
};
