# Testing Setup and Execution Guide

## Overview
This document provides instructions for running all tests in the TMS (Tenant Management System).

## Backend Testing

### Prerequisites
```bash
cd mscan-server
npm install --save-dev jest supertest @types/jest
```

### Test Structure
```
mscan-server/src/
├── __tests__/
│   ├── auth.integration.test.js      # Authentication API integration tests
│   ├── user.integration.test.js      # User management API integration tests
│   ├── email.service.test.js         # Email service unit tests
│   └── e2e.test.js                   # End-to-end workflow tests
└── services/__tests__/
    ├── otp.service.test.js            # OTP service unit tests
    └── token.service.test.js          # Token service unit tests
```

### Running Backend Tests

**Run all tests:**
```bash
npm test
```

**Run tests with coverage:**
```bash
npm test -- --coverage
```

**Run tests in watch mode:**
```bash
npm run test:watch
```

**Run specific test file:**
```bash
npm test -- otp.service.test.js
```

**Run E2E tests:**
```bash
# Start the server first
npm start

# In another terminal, run E2E tests
npm test -- e2e.test.js
```

### Test Coverage Goals
- **Unit Tests**: 80%+ coverage for services
- **Integration Tests**: All API endpoints covered
- **E2E Tests**: Critical user flows covered

## Frontend Testing

### Prerequisites
```bash
cd mscan-client
# Angular testing tools are included by default
# If needed, install additional dependencies:
npm install --save-dev @angular/core @angular/platform-browser-dynamic
```

### Test Structure
```
mscan-client/src/app/
├── services/
│   └── auth.service.spec.ts           # Auth service unit tests
└── components/
    ├── login/
    │   └── login.component.spec.ts    # Login component tests
    └── customer-registration/
        └── customer-registration.component.spec.ts
```

### Running Frontend Tests

**Run all tests:**
```bash
ng test
```

**Run tests once (CI mode):**
```bash
ng test --watch=false --browsers=ChromeHeadless
```

**Run tests with coverage:**
```bash
ng test --code-coverage
```

**Run specific test:**
```bash
ng test --include='**/auth.service.spec.ts'
```

## Test Scenarios Covered

### Backend Unit Tests

#### 1. OTP Service (otp.service.test.js)
- ✅ Generate 6-digit OTP
- ✅ Enforce rate limiting (3 requests per 15 minutes)
- ✅ Create OTP with 5-minute expiry
- ✅ Verify valid OTP
- ✅ Reject expired OTP
- ✅ Reject used OTP
- ✅ Enforce 3-attempt limit

#### 2. Token Service (token.service.test.js)
- ✅ Generate access and refresh tokens
- ✅ Include user info in tokens
- ✅ Set correct expiry times (30min, 7 days)
- ✅ Verify refresh tokens
- ✅ Reject blacklisted tokens
- ✅ Blacklist tokens on logout

#### 3. Email Service (email.service.test.js)
- ✅ Send OTP emails
- ✅ Send welcome emails
- ✅ Include expiry information
- ✅ Validate email addresses
- ✅ Handle sending errors

### Backend Integration Tests

#### 4. Authentication API (auth.integration.test.js)
- ✅ Request OTP for valid email
- ✅ Reject invalid email format
- ✅ Enforce rate limiting
- ✅ Verify OTP and return tokens
- ✅ Reject invalid OTP
- ✅ Refresh access tokens
- ✅ Logout and blacklist tokens

#### 5. User Management API (user.integration.test.js)
- ✅ Register new customer
- ✅ Reject duplicate email
- ✅ Reject duplicate tenant code
- ✅ Validate required fields
- ✅ Get user profile
- ✅ Update user profile

### Frontend Unit Tests

#### 6. Auth Service (auth.service.spec.ts)
- ✅ Request OTP
- ✅ Verify OTP and store tokens
- ✅ Load user context
- ✅ Refresh tokens
- ✅ Logout and clear tokens
- ✅ Check authentication status

#### 7. Login Component (login.component.spec.ts)
- ✅ Validate email format
- ✅ Request OTP successfully
- ✅ Start countdown timer
- ✅ Validate OTP format (6 digits)
- ✅ Verify OTP and navigate
- ✅ Handle errors
- ✅ Resend OTP functionality

#### 8. Customer Registration Component (customer-registration.component.spec.ts)
- ✅ Validate all form fields
- ✅ Enforce email format
- ✅ Enforce phone number format
- ✅ Enforce tenant code format
- ✅ Register customer successfully
- ✅ Handle duplicate errors
- ✅ Reset form after success

### End-to-End Tests

#### 9. Complete Login Flow (e2e.test.js)
- ✅ Request OTP → Verify → Access dashboard
- ✅ Handle OTP expiration
- ✅ Enforce OTP attempt limits
- ✅ Token refresh workflow
- ✅ Logout workflow
- ✅ Customer registration workflow
- ✅ Rate limiting enforcement

## Environment Setup for Testing

### Backend Test Environment
Create `.env.test` file:
```env
NODE_ENV=test
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mscan_test_db
DB_USER=postgres
DB_PASSWORD=admin
JWT_SECRET=test-jwt-secret-key-123
REFRESH_TOKEN_SECRET=test-refresh-secret-key-456
EMAIL_SERVICE=console
```

### Database Setup for E2E Tests
```bash
# Create test database
psql -U postgres -c "CREATE DATABASE mscan_test_db;"

# Run migrations on test database
DB_NAME=mscan_test_db node database/migrate.js
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: Run Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: admin
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd mscan-server && npm install
      - name: Run tests
        run: cd mscan-server && npm test

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd mscan-client && npm install
      - name: Run tests
        run: cd mscan-client && ng test --watch=false --browsers=ChromeHeadless
```

## Test Reports

### Backend Coverage Report
After running `npm test -- --coverage`, view the report at:
```
mscan-server/coverage/lcov-report/index.html
```

### Frontend Coverage Report
After running `ng test --code-coverage`, view the report at:
```
mscan-client/coverage/index.html
```

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Database connection errors:**
```bash
# Verify PostgreSQL is running
pg_isready -h localhost -p 5432
```

**Mock failures:**
- Ensure mocks are cleared in `beforeEach`
- Verify mock return values match actual service responses

**Async test timeouts:**
```javascript
// Increase timeout for slow tests
jest.setTimeout(10000); // 10 seconds
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Clear database records after each E2E test
3. **Mocking**: Mock external services (email, database) in unit tests
4. **Coverage**: Aim for 80%+ code coverage
5. **Fast Feedback**: Unit tests should run in < 5 seconds
6. **Real Data**: E2E tests should use real database
7. **Clear Names**: Test names should describe expected behavior

## Next Steps

1. Add performance tests for token operations
2. Add security tests for injection attacks
3. Add load tests for concurrent OTP requests
4. Set up automated test runs on PR
5. Add visual regression tests for UI components
