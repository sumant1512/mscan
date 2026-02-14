# E2E Tests Organized by User Role

## 🎯 Overview

All E2E tests are now organized by user role for easier testing of specific workflows.

---

## 👑 Super Admin Tests

### **What Super Admin Tests:**
- ✅ Tenant management (CRUD operations)
- ✅ Credit request approval/rejection
- ✅ Template management (view all tenants)
- ✅ Global access to all resources
- ✅ Tenant isolation verification

### **Backend API Tests:**
```bash
cd mscan-server

# Run ALL super admin related tests
npm run test:e2e:super-admin
```

**This command runs:**
- `tenant-admin-e2e.test.js` - Tenant CRUD, credit management (super admin modules)
- `template-e2e.test.js` - Super admin can see all templates

**Modules Covered:**
1. Tenant CRUD operations
2. Credit request approval
3. Credit request rejection
4. Template visibility (all tenants)
5. Verification app visibility (all tenants)
6. Product visibility (all tenants)
7. Category visibility (all tenants)

---

### **Frontend UI Tests:**
```bash
cd mscan-e2e

# Headless mode
npm run test:super-admin:headless

# Headed mode (visible browser)
npm run test:super-admin
```

**This command runs all tests in:**
- `tests/super-admin/` folder

---

## 👤 Tenant Admin Tests

### **What Tenant Admin Tests:**
- ✅ Template management (own tenant only)
- ✅ Verification app management
- ✅ Product management
- ✅ Category management
- ✅ Credit requests
- ✅ Tenant isolation (cannot access other tenants)

### **Backend API Tests:**
```bash
cd mscan-server

# Run ALL tenant admin related tests
npm run test:e2e:tenant-admin
```

**This command runs:**
- `tenant-admin-e2e.test.js` - Credit requests (tenant admin modules)
- `template-e2e.test.js` - Template CRUD and protection logic
- `verification-app-e2e.test.js` - App CRUD and configuration
- `product-e2e.test.js` - Product CRUD, variants, stock management
- `category-e2e.test.js` - Category CRUD, nesting, hierarchy

**Modules Covered:**
1. Template CRUD operations
2. Template protection (cannot delete with products/apps)
3. Verification app CRUD
4. App configuration (QR, rewards)
5. Product CRUD with variants
6. Stock management
7. Category hierarchy
8. Credit request creation
9. Tenant isolation enforcement

---

### **Frontend UI Tests:**
```bash
cd mscan-e2e

# Headless mode
npm run test:tenant-admin:headless

# Headed mode (visible browser)
npm run test:tenant-admin
```

**This command runs all tests in:**
- `tests/tenant-admin/` folder

---

## 🔐 Authentication Tests (Both Roles)

### **Backend API Tests:**
```bash
cd mscan-server

# Run authentication tests
npm run test:e2e:auth
```

**This command runs:**
- `e2e.test.js` - OTP login, token refresh, logout, rate limiting

**Modules Covered:**
1. OTP request and verification
2. Token refresh mechanism
3. Logout flow
4. Rate limiting
5. Customer registration

---

### **Frontend UI Tests:**
```bash
cd mscan-e2e

# Headless mode
npm run test:auth:headless

# Headed mode (visible browser)
npm run test:auth
```

**This command runs all tests in:**
- `tests/auth/` folder

---

## 📊 Complete Test Matrix

### **Backend API E2E Tests (by Role)**

| Test File | Super Admin | Tenant Admin | Auth |
|-----------|-------------|--------------|------|
| **e2e.test.js** | ✅ | ✅ | ✅ |
| **tenant-admin-e2e.test.js** | ✅ (Modules 1-2, 5-7) | ✅ (Modules 3-4) | - |
| **template-e2e.test.js** | ✅ (Module 6: sees all) | ✅ (All modules) | - |
| **verification-app-e2e.test.js** | ✅ (Module 6: sees all) | ✅ (All modules) | - |
| **product-e2e.test.js** | ✅ (Module 7: sees all) | ✅ (All modules) | - |
| **category-e2e.test.js** | ✅ (Module 6: sees all) | ✅ (All modules) | - |

---

### **Test Scenarios by Role**

#### **Super Admin Scenarios (52 tests):**
```
Tenant Management:
  ✅ Create tenant
  ✅ Update tenant
  ✅ Deactivate/reactivate tenant
  ✅ Check slug availability
  ✅ List all tenants
  ✅ Get tenant by ID

Credit Management (Super Admin):
  ✅ View all credit requests
  ✅ Approve credit requests
  ✅ Reject credit requests
  ✅ Block tenant admin from approval
  ✅ View all transactions

Global Visibility:
  ✅ See templates from all tenants
  ✅ See apps from all tenants
  ✅ See products from all tenants
  ✅ See categories from all tenants

Validation:
  ✅ Duplicate email/slug validation
  ✅ Unauthorized access prevention
```

#### **Tenant Admin Scenarios (195+ tests):**
```
Templates (35+ tests):
  ✅ Create template
  ✅ Update template (when no products)
  ✅ Delete template (when no products/apps)
  ✅ Duplicate template
  ✅ Toggle template status
  ✅ Protection logic (block operations with dependencies)
  ✅ Tenant isolation

Verification Apps (40+ tests):
  ✅ Create verification app
  ✅ Update app configuration
  ✅ Configure QR settings
  ✅ Configure reward settings
  ✅ Assign templates to apps
  ✅ Toggle app status
  ✅ Delete app (when no products)
  ✅ Tenant isolation

Products (70+ tests):
  ✅ Create product with template
  ✅ Update product details
  ✅ Manage variants (CRUD)
  ✅ Update attributes
  ✅ Stock management (SET/INCREMENT/DECREMENT)
  ✅ Product-template relationships
  ✅ Product-app relationships
  ✅ Product-category relationships
  ✅ Search and filtering
  ✅ Tenant isolation

Categories (50+ tests):
  ✅ Create category
  ✅ Create nested categories
  ✅ Get category tree
  ✅ Get category breadcrumb
  ✅ Reorder categories
  ✅ Toggle category status
  ✅ Cascade deactivation
  ✅ Product-category relationships
  ✅ Tenant isolation

Credit Requests (Tenant Side):
  ✅ Request credits
  ✅ View own requests
  ✅ View own transactions
  ✅ Cannot approve own requests
```

---

## 🚀 Quick Commands Reference

### **Backend API Tests (mscan-server)**

```bash
# Run ALL E2E tests
npm run test:e2e:all

# Run by ROLE
npm run test:e2e:super-admin      # Super admin tests only
npm run test:e2e:tenant-admin     # Tenant admin tests only
npm run test:e2e:auth             # Authentication tests

# Run by MODULE
npm run test:e2e:tenants          # Tenant & credit management
npm run test:e2e:templates        # Template system
npm run test:e2e:apps             # Verification apps
npm run test:e2e:products         # Product management
npm run test:e2e:categories       # Category system

# Run with OPTIONS
npm run test:e2e:verbose          # Verbose output
npm run test:e2e:coverage         # With coverage report
npm run test:e2e:watch            # Watch mode
```

---

### **Frontend UI Tests (mscan-e2e)**

```bash
# Run ALL UI tests
npm run test:headless             # All tests, no visible browser
npm run test:headed               # All tests, visible browser

# Run by ROLE (Headless)
npm run test:super-admin:headless
npm run test:tenant-admin:headless
npm run test:auth:headless

# Run by ROLE (Headed - visible browser)
npm run test:super-admin          # Super admin with browser
npm run test:tenant-admin         # Tenant admin with browser
npm run test:auth                 # Auth with browser

# Debug & UI modes
npm run test:debug                # Step-through debugging
npm run test:ui                   # Interactive UI mode
npm run report                    # Show test report
```

---

## 📁 File Organization

```
mscan/
├── mscan-server/src/__tests__/              # Backend API E2E Tests
│   ├── e2e.test.js                          # Auth (both roles)
│   ├── tenant-admin-e2e.test.js             # Tenants (super) + Credits
│   ├── template-e2e.test.js                 # Templates (both)
│   ├── verification-app-e2e.test.js         # Apps (tenant)
│   ├── product-e2e.test.js                  # Products (tenant)
│   └── category-e2e.test.js                 # Categories (tenant)
│
└── mscan-e2e/tests/                         # Frontend UI E2E Tests
    ├── auth/                                # Auth (both roles)
    ├── super-admin/                         # Super admin flows
    └── tenant-admin/                        # Tenant admin flows
```

---

## 🎯 When to Use Which Script

### **Use `test:e2e:super-admin` when:**
- Testing tenant management features
- Testing credit approval workflows
- Verifying super admin has global access
- Testing super admin specific features

### **Use `test:e2e:tenant-admin` when:**
- Testing product/template/app/category management
- Testing tenant-specific workflows
- Verifying tenant isolation
- Testing credit request creation

### **Use `test:e2e:all` when:**
- Running full regression tests
- CI/CD pipeline
- Before major releases
- Complete system validation

---

## 📊 Test Execution Time

| Command | Tests | Avg Time |
|---------|-------|----------|
| `test:e2e:auth` | 11 | ~8s |
| `test:e2e:super-admin` | 52 | ~20s |
| `test:e2e:tenant-admin` | 195+ | ~70s |
| `test:e2e:all` | 247+ | ~91s |

---

## ✅ Summary

**Backend API Tests** organized by role:
- ✅ `npm run test:e2e:super-admin` - Super admin features (52 tests)
- ✅ `npm run test:e2e:tenant-admin` - Tenant admin features (195+ tests)
- ✅ `npm run test:e2e:auth` - Authentication (11 tests)

**Frontend UI Tests** organized by role:
- ✅ `npm run test:super-admin` (headed) or `:headless`
- ✅ `npm run test:tenant-admin` (headed) or `:headless`
- ✅ `npm run test:auth` (headed) or `:headless`

**All tests can run individually or together!** 🎉

---

**Last Updated**: 2026-02-13
**Total Backend Tests**: 247+ scenarios
**Total Frontend Tests**: Playwright UI tests
**Organization**: By user role for targeted testing
