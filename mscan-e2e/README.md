# MScan E2E Test Suite

Comprehensive end-to-end test automation for MScan application using Playwright.

## 📁 Project Structure

```
mscan-e2e/
├── tests/
│   ├── auth/                    # Authentication tests
│   │   └── authentication.spec.ts
│   ├── super-admin/             # Super Admin feature tests
│   │   ├── tenant-management.spec.ts
│   │   ├── credit-approval.spec.ts
│   │   ├── user-management.spec.ts
│   │   └── dashboard.spec.ts
│   ├── tenant-admin/            # Tenant Admin feature tests
│   │   ├── coupon-management.spec.ts
│   │   ├── credit-request.spec.ts
│   │   ├── customer-registration.spec.ts
│   │   ├── verification-app.spec.ts
│   │   ├── scan-history.spec.ts
│   │   └── dashboard.spec.ts
│   └── data-isolation.spec.ts   # Multi-tenant data isolation tests
├── utils/
│   ├── test-config.ts           # Test configuration and data
│   ├── helpers.ts               # Authentication and page helpers
│   └── page-objects.ts          # Page object models
├── playwright.config.ts         # Playwright configuration
├── package.json
└── tsconfig.json
```

## 🚀 Setup Instructions

### Prerequisites

1. **Node.js** (v18 or higher)
2. **MScan Backend** running on `http://localhost:3000`
3. **MScan Frontend** running on `http://localhost:4200`
4. **Test Database** with seed data

### Installation

1. Navigate to the e2e folder:
```bash
cd mscan-e2e
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install
```

### Database Setup

Ensure your test database has:
- Super admin users: `sumantmishra511@gmail.com`, `kumarbhaskar419@gmail.com`
- Test tenant 1: subdomain `harsh`, email `admin@harsh.com`
- Test tenant 2: subdomain `test-tenant`, email `admin@test-tenant.com`

### Configure Test OTP

Update `utils/test-config.ts` with your test OTP:
```typescript
testOTP: '123456', // Use your test OTP here
```

## 🧪 Running Tests

### Run All Tests
```bash
npm test
```

### Run in Headed Mode (see browser)
```bash
npm run test:headed
```

### Run in UI Mode (interactive)
```bash
npm run test:ui
```

### Run Specific Test Suites
```bash
# Authentication tests
npm run test:auth

# Super Admin tests
npm run test:super-admin

# Tenant Admin tests
npm run test:tenant-admin
```

### Debug Mode
```bash
npm run test:debug
```

### View Test Report
```bash
npm run report
```

## 📝 Test Configuration

### Update Test Data

Edit `utils/test-config.ts` to configure:
- Base URLs
- Test credentials
- Tenant configurations
- Timeouts
- Test data templates

### Configure Playwright

Edit `playwright.config.ts` to adjust:
- Browser settings
- Viewport sizes
- Timeouts
- Reporters
- Parallelization

## 🔍 Test Coverage

### Authentication Tests
- ✅ Super Admin login/logout
- ✅ Tenant Admin login/logout
- ✅ Invalid credentials handling
- ✅ Session management
- ✅ Subdomain isolation
- ✅ Token management

### Super Admin Features
- ✅ Tenant management (CRUD)
- ✅ Credit approval/rejection
- ✅ User management
- ✅ Dashboard statistics
- ✅ System-wide analytics

### Tenant Admin Features
- ✅ Coupon management (CRUD)
- ✅ Credit requests
- ✅ Customer registration
- ✅ Verification app configuration
- ✅ Scan history
- ✅ Dashboard analytics

### Data Isolation
- ✅ Multi-tenant data separation
- ✅ Cross-tenant access prevention

## 📊 Test Reports

After running tests, view reports:
- HTML Report: `playwright-report/index.html`
- JSON Results: `test-results.json`

## 🎯 Best Practices

### Writing New Tests

1. **Use Page Objects**: Extend `PageHelper` class for reusability
2. **Proper Waits**: Always use `waitForLoadingToComplete()`
3. **Unique Data**: Generate unique test data using timestamps
4. **Cleanup**: Clean up test data when needed
5. **Assertions**: Use meaningful assertions with clear error messages

### Example Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/helpers';
import { YourPage } from '../../utils/page-objects';

test.describe('Feature Name', () => {
  let authHelper: AuthHelper;
  let yourPage: YourPage;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    yourPage = new YourPage(page);
    
    // Login
    await authHelper.loginAsSuperAdmin();
  });

  test('should perform action', async ({ page }) => {
    // Test implementation
    await yourPage.navigateToFeature();
    await yourPage.performAction();
    
    // Assertions
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

## 🐛 Debugging Tips

1. **Run in headed mode**: See what's happening
```bash
npm run test:headed
```

2. **Use debug mode**: Step through tests
```bash
npm run test:debug
```

3. **Check screenshots**: Located in `test-results/` folder

4. **View videos**: Recorded for failed tests in `test-results/`

5. **Console logs**: Check terminal output for API calls and errors

## 🔧 Common Issues

### Issue: Tests timeout waiting for OTP
**Solution**: Update `testOTP` in `test-config.ts` with valid OTP

### Issue: "Target page, context or browser has been closed"
**Solution**: Increase timeouts in `playwright.config.ts`

### Issue: Login fails
**Solution**: 
- Verify backend is running
- Check test user credentials exist
- Ensure database is seeded

### Issue: Subdomain tests fail
**Solution**: Add entries to `/etc/hosts`:
```
127.0.0.1 harsh.localhost
127.0.0.1 test-tenant.localhost
```

## 📦 Dependencies

- `@playwright/test`: ^1.40.0 - End-to-end testing framework
- `@types/node`: ^20.10.0 - Node.js type definitions

## 🚦 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd mscan-e2e
          npm ci
          npx playwright install --with-deps
      
      - name: Run tests
        run: |
          cd mscan-e2e
          npm test
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: mscan-e2e/playwright-report/
```

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Writing Tests](https://playwright.dev/docs/writing-tests)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)

## 🤝 Contributing

When adding new tests:
1. Follow existing patterns and structure
2. Add meaningful test descriptions
3. Update this README if needed
4. Ensure tests pass locally before committing

## 📄 License

Same as MScan project license.
