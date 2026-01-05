# End-to-End Testing Guide

## Overview
This document describes E2E test scenarios for the TMS system covering complete user journeys from login to dashboard access.

## Test Environment Setup

### Prerequisites
- Backend server running on `http://localhost:3000`
- Frontend application running on `http://localhost:4200`
- PostgreSQL database with test data seeded
- Email service configured (or console mode for development)

### Test Data
```sql
-- Super Admin User
Email: superadmin@tms.com
Role: SUPER_ADMIN

-- Tenant Admin User  
Email: admin@acme.com
Company: Acme Transport Co
Tenant Code: ACME01
Role: TENANT_ADMIN

-- Tenant User
Email: user@acme.com
Company: Acme Transport Co  
Role: TENANT_USER
```

## E2E Test Scenarios

### 1. Complete OTP Login Flow (Super Admin)

**Objective**: Verify complete login process with OTP authentication

**Steps**:
1. Navigate to login page (`/login`)
2. Enter super admin email: `superadmin@tms.com`
3. Click "Request OTP" button
4. Verify success message displayed
5. Check email/console for 6-digit OTP
6. Enter OTP in verification form
7. Click "Verify" button
8. Verify redirect to Super Admin dashboard (`/dashboard/super-admin`)
9. Verify dashboard shows system-wide statistics
10. Verify navigation menu shows "Register Customer" link
11. Verify user name displayed in header

**Expected Results**:
- OTP received within 30 seconds
- Successful authentication redirects to correct dashboard
- Dashboard displays accurate statistics
- Super Admin menu items visible

### 2. Complete OTP Login Flow (Tenant User)

**Objective**: Verify tenant user login and dashboard access

**Steps**:
1. Navigate to login page
2. Enter tenant user email: `user@acme.com`
3. Request and verify OTP
4. Verify redirect to Tenant dashboard (`/dashboard/tenant`)
5. Verify dashboard shows only Acme Transport data
6. Verify no "Register Customer" option in menu
7. Verify company name "Acme Transport Co" displayed

**Expected Results**:
- Tenant user sees only their company's data
- No access to system-wide statistics
- No access to customer registration

### 3. Customer Registration Flow (Super Admin Only)

**Objective**: Test customer registration capability

**Steps**:
1. Login as Super Admin
2. Navigate to "Register Customer" (`/register-customer`)
3. Fill in customer details:
   - Company Name: "New Transport LLC"
   - Tenant Code: "NEWTRANS"
   - Admin Email: "admin@newtrans.com"
   - Admin Full Name: "Jane Smith"
   - Phone: "+1987654321"
4. Submit form
5. Verify success message
6. Check that welcome email sent to new admin
7. Logout as Super Admin
8. Login as new tenant admin using OTP
9. Verify access to tenant dashboard

**Expected Results**:
- New tenant created successfully
- New tenant admin can login
- Tenant admin sees their own dashboard
- Welcome email delivered

### 4. Token Refresh Flow

**Objective**: Verify automatic token refresh

**Steps**:
1. Login as any user
2. Access dashboard
3. Wait 25 minutes (near token expiry)
4. Perform an action (e.g., view profile)
5. Verify action completes without re-login
6. Check browser network tab for refresh token call

**Expected Results**:
- Token automatically refreshed before expiry
- User remains authenticated
- No interruption to user experience

### 5. Logout and Session Invalidation

**Objective**: Verify complete logout process

**Steps**:
1. Login as tenant user
2. Access dashboard
3. Note the JWT tokens in localStorage
4. Click "Logout" button
5. Verify redirect to login page
6. Verify tokens removed from localStorage
7. Attempt to navigate back to dashboard
8. Verify redirect to login page
9. Try to use old access token in API call
10. Verify 401 Unauthorized response

**Expected Results**:
- Complete session cleanup
- Tokens blacklisted
- Old tokens cannot be reused
- Protected routes inaccessible

### 6. OTP Rate Limiting

**Objective**: Verify rate limiting protection

**Steps**:
1. Navigate to login page
2. Enter email address
3. Request OTP (1st time)
4. Immediately request OTP again (2nd time)
5. Immediately request OTP again (3rd time)
6. Immediately request OTP again (4th time)
7. Verify error message displayed
8. Wait 15 minutes
9. Try requesting OTP again

**Expected Results**:
- First 3 requests succeed
- 4th request shows rate limit error
- After 15 minutes, requests work again
- Error message clearly explains wait time

### 7. OTP Expiration

**Objective**: Verify OTP expiry after 5 minutes

**Steps**:
1. Request OTP for login
2. Wait 6 minutes (OTP expires)
3. Enter the expired OTP
4. Verify error message: "OTP has expired"
5. Request new OTP
6. Enter new OTP within 5 minutes
7. Verify successful login

**Expected Results**:
- Expired OTP rejected
- Clear error message
- New OTP can be requested
- Fresh OTP works correctly

### 8. Invalid OTP Attempts

**Objective**: Verify invalid OTP handling

**Steps**:
1. Request valid OTP
2. Enter incorrect OTP (e.g., "000000")
3. Verify error message
4. Enter correct OTP
5. Verify successful login

**Expected Results**:
- Invalid OTP rejected
- Error message displayed
- User can retry with correct OTP
- Account not locked

### 9. Profile Update Flow

**Objective**: Test user profile modification

**Steps**:
1. Login as tenant user
2. Navigate to profile page
3. Update full name
4. Update phone number
5. Save changes
6. Verify success message
7. Refresh page
8. Verify updated information persists
9. Navigate to dashboard
10. Verify updated name in header

**Expected Results**:
- Profile updates saved successfully
- Changes persist across sessions
- UI updates reflect changes immediately

### 10. Cross-Tenant Data Isolation

**Objective**: Verify tenants cannot access each other's data

**Steps**:
1. Login as Tenant A admin
2. Note Tenant A's data on dashboard
3. Logout
4. Login as Tenant B admin
5. Verify dashboard shows only Tenant B data
6. Verify no Tenant A information visible
7. Attempt API call with Tenant A IDs (if possible)
8. Verify 403 Forbidden or 404 Not Found

**Expected Results**:
- Complete data isolation between tenants
- No cross-tenant data leakage
- Proper authorization checks in place
- Error handling for unauthorized access

## Performance Benchmarks

### Expected Response Times
- OTP Request: < 500ms
- OTP Verification: < 300ms
- Dashboard Load: < 1s
- Profile Update: < 500ms
- Token Refresh: < 200ms

### Load Testing
- Concurrent OTP requests: 100/sec
- Concurrent logins: 50/sec
- Dashboard queries: 200/sec

## Testing Tools

### Recommended Tools
1. **Playwright** or **Cypress** for automated E2E tests
2. **Postman** for API testing
3. **K6** or **Artillery** for load testing
4. **Chrome DevTools** for network inspection

### Automated E2E Test Structure
```javascript
describe('TMS E2E Tests', () => {
  beforeEach(async () => {
    // Reset database to known state
    // Clear browser storage
    // Navigate to login page
  });

  test('Super Admin Complete Login Flow', async () => {
    // Test implementation
  });

  test('Tenant User Login and Dashboard', async () => {
    // Test implementation
  });

  // ... more tests
});
```

## Common Issues and Solutions

### Issue: OTP not received
- **Check**: Email service configuration
- **Check**: Console logs for OTP in dev mode
- **Check**: Spam folder
- **Solution**: Use console mode for testing

### Issue: Token expiry during test
- **Check**: Token expiry settings
- **Solution**: Increase JWT_ACCESS_EXPIRY for testing

### Issue: Database state between tests
- **Check**: Test isolation
- **Solution**: Implement proper teardown/setup

### Issue: Rate limiting affects tests
- **Check**: Rate limit configuration
- **Solution**: Clear rate limit store between tests

## Test Coverage Goals

### Target Coverage
- **Authentication**: 100% coverage
- **Authorization**: 100% coverage
- **Dashboard**: 90% coverage
- **Customer Registration**: 100% coverage
- **Profile Management**: 90% coverage

### Critical Paths (Must Test)
1. ✅ OTP login flow
2. ✅ Role-based dashboard access
3. ✅ Customer registration (Super Admin)
4. ✅ Token refresh mechanism
5. ✅ Logout and cleanup
6. ✅ Data isolation between tenants

## Test Execution

### Manual Testing
```bash
# Start backend
cd mscan-server
npm start

# Start frontend (separate terminal)
cd mscan-client
npm start

# Run through test scenarios manually
# or use Postman collection
```

### Automated Testing
```bash
# Run E2E tests (when implemented)
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test
npm run test:e2e -- --grep "login flow"
```

## Test Reporting

### Required Metrics
- Test execution time
- Pass/fail rate
- Code coverage
- Performance metrics
- Screenshot on failure
- Video recording for critical flows

### Report Format
- HTML report with screenshots
- JSON report for CI/CD
- Allure report for detailed analysis
