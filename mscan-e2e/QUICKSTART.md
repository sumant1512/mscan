# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies
```bash
cd mscan-e2e
npm install
npx playwright install
```

### Step 2: Configure Test Data

Update `utils/test-config.ts` with your test OTP (line 28):
```typescript
testOTP: '123456', // Replace with your test OTP
```

### Step 3: Run Tests

**Option A: Automated Setup**
```bash
chmod +x setup.sh
./setup.sh
npm test
```

**Option B: Manual Run**
```bash
# Make sure backend is running on localhost:3000
# Make sure frontend is running on localhost:4200
npm test
```

## 📋 Pre-requisites Checklist

- [ ] Backend running: `http://localhost:3000`
- [ ] Frontend running: `http://localhost:4200`
- [ ] Database seeded with test users
- [ ] Test OTP configured in `utils/test-config.ts`
- [ ] Subdomain entries in `/etc/hosts`:
  ```
  127.0.0.1 harsh.localhost
  127.0.0.1 test-tenant.localhost
  ```

## 🎯 Common Commands

```bash
npm test              # Run all tests
npm run test:headed   # Run with browser visible
npm run test:ui       # Interactive mode
npm run test:debug    # Debug mode
npm run report        # View last test report
```

## 📊 What Gets Tested

✅ **Authentication** (5 tests)
- Super admin login/logout
- Tenant admin login/logout
- Invalid credentials
- Session management

✅ **Super Admin** (15+ tests)
- Tenant management
- Credit approvals
- User management
- Dashboard

✅ **Tenant Admin** (25+ tests)
- Coupon management
- Credit requests
- Customer registration
- Verification apps
- Scan history
- Dashboard

✅ **Security** (2+ tests)
- Multi-tenant data isolation
- Cross-tenant access prevention

**Total: 45+ End-to-End Tests**

## 🐛 Troubleshooting

**Tests failing?**
1. Check backend/frontend are running
2. Verify test credentials exist in database
3. Update test OTP in config
4. Run in headed mode to see what's happening: `npm run test:headed`

**Need help?**
See detailed [README.md](README.md) for comprehensive documentation.
