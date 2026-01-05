# TMS System - Quick Testing Guide

## Quick Start (30 seconds)

1. **Start Backend** (Terminal 1):
   ```bash
   cd mscan-server
   node src/server.js
   ```

2. **Start Frontend** (Terminal 2):
   ```bash
   cd mscan-client
   npx ng serve --open
   ```

3. **Test Login**:
   - Browser opens at http://localhost:4200
   - Enter: `admin@mscan.com`
   - Click "Send OTP"
   - Check Terminal 1 for OTP (e.g., `🔐 OTP for admin@mscan.com: 123456`)
   - Enter the OTP
   - Click "Verify & Login"

## Complete Test Scenarios

### Scenario 1: Super Admin Login & Dashboard

**Steps:**
1. Navigate to http://localhost:4200
2. Enter email: `admin@mscan.com`
3. Click "Send OTP"
4. Find OTP in backend terminal (6-digit code)
5. Enter OTP and click "Verify & Login"

**Expected Results:**
- Redirected to Super Admin Dashboard
- See statistics:
  - Total Customers
  - Total Users
  - Active Sessions (24h)
- See "Recent Customers" table
- See "Register New Customer" button
- Header shows "Super Admin Dashboard" and logout button

### Scenario 2: Register New Customer (Super Admin)

**Prerequisites:** Logged in as Super Admin

**Steps:**
1. Click "Register New Customer" button
2. Fill in form:
   - Company Name: "XYZ Transport"
   - Admin Email: "admin@xyztransport.com"
   - Admin Full Name: "Jane Smith"
   - Contact Phone: "+1 555 0200" (optional)
   - Address: "456 Oak Ave" (optional)
3. Click "Register Customer"

**Expected Results:**
- Success message appears
- "Welcome email sent" notification
- Backend creates:
  - New tenant record
  - New tenant admin user
- Automatic redirect to dashboard after 3 seconds

**Verify in Backend:**
```bash
# Terminal 3
psql -U postgres -d mscan_db -c "SELECT * FROM tenants;"
psql -U postgres -d mscan_db -c "SELECT * FROM users WHERE role='TENANT_ADMIN';"
```

### Scenario 3: Tenant Admin Login & Dashboard

**Steps:**
1. Logout from Super Admin
2. Enter email: `admin@testtransport.com` (or your newly created tenant)
3. Click "Send OTP"
4. Get OTP from backend terminal
5. Enter OTP and login

**Expected Results:**
- Redirected to Tenant Dashboard
- Header shows company name: "Test Transport Co"
- See company information:
  - Company name
  - Contact email
  - Status (Active/Inactive)
- See statistics:
  - Total Users
  - Active Users (24h)
- See "Recent Activity" section
- NO "Register New Customer" option (tenant admins can't register)

### Scenario 4: OTP Rate Limiting

**Steps:**
1. On login page, enter any email
2. Click "Send OTP" 3 times quickly
3. Try clicking "Send OTP" a 4th time

**Expected Results:**
- First 3 requests succeed
- 4th request shows error: "Too many OTP requests. Please try again later."
- Must wait 15 minutes before sending more OTPs to that email

**Verify:**
```bash
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Call 4 times, 4th should fail
```

### Scenario 5: Invalid OTP Attempts

**Steps:**
1. Request OTP for valid email
2. Enter wrong OTP (e.g., "000000")
3. Click "Verify & Login"
4. Repeat 3 times

**Expected Results:**
- Each attempt shows "Invalid OTP"
- After 3 failed attempts, OTP is invalidated
- Must request new OTP

### Scenario 6: OTP Expiry

**Steps:**
1. Request OTP
2. Wait for countdown timer to reach 0:00
3. Try to verify OTP after expiry

**Expected Results:**
- Timer shows "OTP expired"
- Verification fails with "OTP has expired"
- Must request new OTP using "Resend OTP" button

### Scenario 7: Token Refresh (Simulated)

**Prerequisites:** Logged in with valid tokens

**Method 1 - Manual Test:**
```bash
# Get initial tokens from login
ACCESS_TOKEN="<your-access-token>"
REFRESH_TOKEN="<your-refresh-token>"

# Wait 31 minutes (or modify JWT_EXPIRES_IN to 1m for testing)

# Try to access protected route
curl -X GET http://localhost:3000/dashboard/stats \
  -H "Authorization: Bearer $ACCESS_TOKEN"
# Should fail with "Token expired"

# Refresh token
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"
# Should return new tokens
```

**Method 2 - Frontend Automatic:**
- Login to frontend
- Keep browser open for 30+ minutes while using the app
- Token should auto-refresh without interruption
- Check browser DevTools > Network tab for `/auth/refresh` calls

### Scenario 8: Authorization & Route Guards

**Test 1: Unauthenticated Access**
1. Open browser in incognito mode
2. Navigate to http://localhost:4200/dashboard
3. **Expected:** Redirected to /login

**Test 2: Tenant Accessing Super Admin Routes**
1. Login as tenant admin
2. Manually navigate to http://localhost:4200/customers
3. **Expected:** Redirected to /dashboard

**Test 3: Backend Authorization**
```bash
# Try to create customer without token
curl -X POST http://localhost:3000/users/customers \
  -H "Content-Type: application/json" \
  -d '{"companyName": "Test"}'
# Expected: 401 Unauthorized

# Try to create customer with tenant token
curl -X POST http://localhost:3000/users/customers \
  -H "Authorization: Bearer <tenant-token>" \
  -H "Content-Type: application/json" \
  -d '{"companyName": "Test"}'
# Expected: 403 Forbidden
```

### Scenario 9: Logout & Token Blacklisting

**Steps:**
1. Login to frontend
2. Note the access token (DevTools > Application > Local Storage)
3. Click "Logout"
4. Try to use the old token:
   ```bash
   curl -X GET http://localhost:3000/auth/context \
     -H "Authorization: Bearer <old-token>"
   ```

**Expected Results:**
- Redirected to login page
- Token is blacklisted in database
- API returns "Token has been invalidated"

**Verify in DB:**
```bash
psql -U postgres -d mscan_db -c "SELECT * FROM token_blacklist ORDER BY created_at DESC LIMIT 5;"
```

### Scenario 10: Audit Logging

**Steps:**
1. Perform various actions (login, create customer, update profile)
2. Check audit logs:
   ```bash
   psql -U postgres -d mscan_db -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;"
   ```

**Expected Results:**
- Each action creates audit log entry
- Logs include: user_id, action, resource_type, ip_address, timestamp

## Test Data

### Pre-seeded Accounts

| Email | Role | Company |
|-------|------|---------|
| admin@mscan.com | SUPER_ADMIN | N/A (System Admin) |
| admin@testtransport.com | TENANT_ADMIN | Test Transport Co |

### Sample Test Customers

Create these during testing:

```javascript
// Customer 1
{
  "companyName": "Quick Logistics LLC",
  "contactEmail": "admin@quicklogistics.com",
  "adminName": "Michael Brown",
  "contactPhone": "+1 555 1234"
}

// Customer 2
{
  "companyName": "Express Freight Co",
  "contactEmail": "admin@expressfreight.com",
  "adminName": "Sarah Johnson",
  "contactPhone": "+1 555 5678"
}

// Customer 3
{
  "companyName": "Global Shipping Inc",
  "contactEmail": "admin@globalshipping.com",
  "adminName": "David Lee"
}
```

## Common Issues & Solutions

### Issue: OTP not appearing in console

**Solution:**
- Check backend terminal is running
- Look for message: `🔐 OTP for <email>: 123456`
- Email service is configured for console logging in development

### Issue: "Email already exists"

**Solution:**
```bash
# Check existing users
psql -U postgres -d mscan_db -c "SELECT email, role FROM users;"

# Delete test user if needed
psql -U postgres -d mscan_db -c "DELETE FROM users WHERE email='test@example.com';"
```

### Issue: Frontend shows white screen

**Solution:**
1. Check browser console for errors
2. Verify Angular dev server is running
3. Check for compilation errors in Terminal 2
4. Try `Ctrl+C` and restart `npx ng serve`

### Issue: CORS error in browser

**Solution:**
- Verify backend is running on port 3000
- Check CORS settings in mscan-server/src/server.js
- Ensure frontend uses http://localhost:4200

### Issue: Database connection error

**Solution:**
```bash
# Check PostgreSQL status
pg_isready -h localhost -p 5432

# Restart PostgreSQL (macOS)
brew services restart postgresql@14

# Verify database exists
psql -U postgres -l | grep mscan_db
```

## Performance Testing

### Load Test OTP Requests
```bash
# Using ab (Apache Bench)
ab -n 100 -c 10 -p otp-payload.json -T application/json \
  http://localhost:3000/auth/request-otp

# otp-payload.json:
# {"email": "load-test@example.com"}
```

### Database Query Performance
```bash
psql -U postgres -d mscan_db

# Check query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'admin@mscan.com';
EXPLAIN ANALYZE SELECT * FROM tenants WHERE is_active = true;
```

## Cleanup After Testing

```bash
# Reset database to clean state
psql -U postgres -d mscan_db -c "TRUNCATE users, tenants, otps, token_blacklist, audit_logs RESTART IDENTITY CASCADE;"

# Re-run seed data
psql -U postgres -d mscan_db -f mscan-server/database/seed.sql

# Clear local storage (browser)
# DevTools > Application > Local Storage > Clear All
```

## Next Steps

After completing all test scenarios:

1. ✅ Mark Phase 6-9 as complete in tasks.md
2. ✅ Create production deployment documentation
3. ✅ Set up CI/CD pipeline
4. ✅ Configure production email service
5. ✅ Add monitoring and logging
6. ✅ Perform security audit
7. ✅ User acceptance testing

---

**Testing Checklist:**
- [ ] Super Admin login works
- [ ] Tenant Admin login works
- [ ] Customer registration works
- [ ] OTP rate limiting works
- [ ] Token refresh works
- [ ] Route guards protect pages
- [ ] Dashboard shows correct data
- [ ] Logout blacklists tokens
- [ ] Audit logs capture actions
- [ ] CORS allows frontend access
- [ ] Database queries are efficient
- [ ] Error messages are user-friendly
