# E2E Tests - Quick Run Guide

## 🚀 Quick Start

```bash
# Set environment variable
export E2E_TESTS_ENABLED=true

# Run all E2E tests
npm test -- e2e.test.js

# Or run with environment variable inline
E2E_TESTS_ENABLED=true npm test -- e2e.test.js
```

---

## 📋 Run Individual Test Files

### **Authentication & OTP Flow:**
```bash
E2E_TESTS_ENABLED=true npm test -- e2e.test.js
```
**Coverage**: OTP login, token refresh, logout, rate limiting (11 tests)

---

### **Tenant & Credit Management:**
```bash
E2E_TESTS_ENABLED=true npm test -- tenant-admin-e2e.test.js
```
**Coverage**: Tenant CRUD, credit requests, tenant isolation (40+ tests)

---

### **Template System:**
```bash
E2E_TESTS_ENABLED=true npm test -- template-e2e.test.js
```
**Coverage**: Template CRUD, protection logic, hard delete (35+ tests)

---

### **Verification Apps:**
```bash
E2E_TESTS_ENABLED=true npm test -- verification-app-e2e.test.js
```
**Coverage**: App CRUD, template assignment, QR/reward config (40+ tests)

---

### **Product Management:**
```bash
E2E_TESTS_ENABLED=true npm test -- product-e2e.test.js
```
**Coverage**: Product CRUD, variants, attributes, stock (70+ tests)

---

### **Category System:**
```bash
E2E_TESTS_ENABLED=true npm test -- category-e2e.test.js
```
**Coverage**: Category CRUD, nesting, hierarchy, ordering (50+ tests)

---

## 🎯 Run Specific Modules

### **Run Specific Test Module:**
```bash
E2E_TESTS_ENABLED=true npm test -- template-e2e.test.js -t "Module 1"
E2E_TESTS_ENABLED=true npm test -- product-e2e.test.js -t "Module 2: Product Variants"
```

### **Run Specific Test:**
```bash
E2E_TESTS_ENABLED=true npm test -- product-e2e.test.js -t "Should create product with template"
```

---

## 🔄 Run All Tests by Category

### **Run All New E2E Tests:**
```bash
E2E_TESTS_ENABLED=true npm test -- template-e2e.test.js && \
E2E_TESTS_ENABLED=true npm test -- verification-app-e2e.test.js && \
E2E_TESTS_ENABLED=true npm test -- product-e2e.test.js && \
E2E_TESTS_ENABLED=true npm test -- category-e2e.test.js
```

### **Run All E2E Tests (Pattern Match):**
```bash
E2E_TESTS_ENABLED=true npm test -- --testPathPattern=e2e.test.js
```

---

## 📊 Run with Coverage

```bash
E2E_TESTS_ENABLED=true npm test -- --coverage template-e2e.test.js
```

---

## 🐛 Debug Mode

### **Run in Verbose Mode:**
```bash
E2E_TESTS_ENABLED=true npm test -- --verbose template-e2e.test.js
```

### **Run Single Test for Debugging:**
```bash
E2E_TESTS_ENABLED=true npm test -- template-e2e.test.js -t "Should permanently delete template"
```

---

## 🔍 Watch Mode (for development)

```bash
E2E_TESTS_ENABLED=true npm test -- --watch template-e2e.test.js
```

---

## 📝 Prerequisites

### **1. Database Setup:**
```bash
# Ensure PostgreSQL is running
docker-compose up -d postgres

# Or if using local PostgreSQL
pg_isready
```

### **2. Database Schema:**
```bash
# Run migrations (if needed)
npm run migrate

# Or apply full setup
psql -U postgres -d mscan_db -f mscan-server/database/full_setup.sql
```

### **3. Environment Variables:**
```bash
# Required for E2E tests
export E2E_TESTS_ENABLED=true

# Database connection (usually in .env)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mscan_test
DB_USER=postgres
DB_PASSWORD=your_password
```

---

## 🎨 Test Output Examples

### **Success Output:**
```
PASS  mscan-server/src/__tests__/template-e2e.test.js
  Template System E2E Tests
    Module 1: Template CRUD
      ✓ Should create template (45ms)
      ✓ Should get all templates for tenant (23ms)
      ✓ Should get template by ID (18ms)
      ✓ Should update template when no products exist (35ms)
      ✓ Should duplicate template (42ms)
    Module 2: Template Protection - Products
      ✓ Should show updated product_count (28ms)
      ✓ Should NOT allow updating template when it has products (31ms)
      ✓ Should NOT allow deleting template when it has products (25ms)

Tests:       35 passed, 35 total
Time:        12.456 s
```

### **Failure Output:**
```
FAIL  mscan-server/src/__tests__/template-e2e.test.js
  Template System E2E Tests
    Module 2: Template Protection - Products
      ✕ Should NOT allow updating template when it has products (31ms)

  ● Template System E2E Tests › Module 2 › Should NOT allow updating template

    expect(received).toBe(expected)

    Expected: 409
    Received: 200

      at Object.<anonymous> (src/__tests__/template-e2e.test.js:142:28)

Tests:       1 failed, 34 passed, 35 total
```

---

## 🧹 Cleanup

Tests automatically cleanup after themselves, but if needed:

```bash
# Manual cleanup of test data
psql -U postgres -d mscan_test -c "
DELETE FROM products WHERE created_by IN (
  SELECT id FROM users WHERE email LIKE '%test%'
);
DELETE FROM categories WHERE created_by IN (
  SELECT id FROM users WHERE email LIKE '%test%'
);
DELETE FROM verification_apps WHERE created_by IN (
  SELECT id FROM users WHERE email LIKE '%test%'
);
DELETE FROM product_templates WHERE created_by IN (
  SELECT id FROM users WHERE email LIKE '%test%'
);
DELETE FROM users WHERE email LIKE '%test%';
DELETE FROM tenants WHERE company_name LIKE '%Test%';
"
```

---

## 📊 Test Statistics

| Test File | Tests | Time (avg) | Database Ops |
|-----------|-------|------------|--------------|
| e2e.test.js | 11 | ~8s | ~50 |
| tenant-admin-e2e.test.js | 41 | ~15s | ~200 |
| template-e2e.test.js | 35 | ~12s | ~150 |
| verification-app-e2e.test.js | 40 | ~13s | ~180 |
| product-e2e.test.js | 70 | ~25s | ~350 |
| category-e2e.test.js | 50 | ~18s | ~250 |
| **TOTAL** | **247** | **~91s** | **~1,180** |

---

## 🚦 CI/CD Integration

### **GitHub Actions Example:**
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: mscan_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run migrations
        run: npm run migrate
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: mscan_test
          DB_USER: postgres
          DB_PASSWORD: postgres

      - name: Run E2E Tests
        run: npm test -- --testPathPattern=e2e.test.js
        env:
          E2E_TESTS_ENABLED: true
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: mscan_test
          DB_USER: postgres
          DB_PASSWORD: postgres
```

---

## ⚠️ Common Issues

### **Issue: Tests failing with "ECONNREFUSED"**
**Solution**: Ensure PostgreSQL is running
```bash
docker-compose up -d postgres
# or
brew services start postgresql
```

### **Issue: Tests failing with "relation does not exist"**
**Solution**: Run migrations
```bash
npm run migrate
```

### **Issue: Tests hanging or timing out**
**Solution**: Increase Jest timeout
```bash
# In test file
jest.setTimeout(30000); // 30 seconds
```

### **Issue: "E2E_TESTS_ENABLED not set"**
**Solution**: Set environment variable
```bash
export E2E_TESTS_ENABLED=true
```

---

## 📚 Related Documentation

- `CURRENT_E2E_TEST_COVERAGE.md` - Full test coverage summary
- `NEW_E2E_TESTS_SUMMARY.md` - New tests implementation details
- `TEMPLATE_E2E_TESTS_SUMMARY.md` - Template tests specifics
- `TEMPLATE_DELETE_UPDATE.md` - Template delete implementation
- `ATTRIBUTES_VS_VARIANTS_VISUAL.md` - Template attributes guide

---

## ✅ Quick Health Check

Run this to verify everything is working:

```bash
# Quick test run (should complete in ~2 minutes)
E2E_TESTS_ENABLED=true npm test -- e2e.test.js -t "Complete Login Flow"
```

If this passes, your environment is correctly configured! 🎉

---

**Last Updated**: 2026-02-13
**Total E2E Tests**: 247 scenarios
**Total Test Files**: 6
