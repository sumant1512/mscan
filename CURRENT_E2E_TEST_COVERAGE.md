# Current E2E Test Coverage Summary

## 📊 Overview

Total Test Files: 24
Main E2E Tests: 6 comprehensive files

---

## 🧪 Test File 1: `e2e.test.js` (405 lines)

### **Module: Complete OTP Login Flow**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Complete Login Flow** | Request OTP → Verify → Access Dashboard | ✅ Covered |
| **OTP Expiration** | Manually expire OTP and verify rejection | ✅ Covered |
| **OTP Attempt Limits** | Try wrong OTP 3 times, block 4th attempt | ✅ Covered |
| **Token Refresh** | Refresh access token successfully | ✅ Covered |
| **Token Invalidation** | Old access token invalid after refresh | ✅ Covered |
| **Logout Flow** | Logout and invalidate all tokens | ✅ Covered |
| **Customer Registration** | Register new customer and tenant | ✅ Covered |
| **Rate Limiting** | Enforce OTP request rate limits | ✅ Covered |

**Scenarios Tested:**
1. ✅ Request OTP for existing user
2. ✅ Verify OTP with correct code
3. ✅ Load user context with access token
4. ✅ Access protected resources
5. ✅ OTP expiration handling
6. ✅ OTP attempt limits (3 max)
7. ✅ Token refresh mechanism
8. ✅ Old token invalidation after refresh
9. ✅ Logout invalidates both tokens
10. ✅ Customer registration creates user + tenant
11. ✅ Rate limiting prevents spam (3 requests max)

---

## 🧪 Test File 2: `tenant-admin-e2e.test.js` (680 lines)

### **Module 1: Tenant CRUD (Super Admin)**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Create Tenant A** | Create first tenant with all fields | ✅ Covered |
| **Create Tenant B** | Create second tenant for isolation tests | ✅ Covered |
| **Duplicate Email** | Reject tenant with duplicate email | ✅ Covered |
| **Duplicate Subdomain** | Reject tenant with duplicate slug | ✅ Covered |
| **List All Tenants** | Get all tenants with pagination | ✅ Covered |
| **Get Tenant By ID** | Fetch single tenant with admin details | ✅ Covered |
| **Update Tenant** | Update tenant information | ✅ Covered |
| **Deactivate Tenant** | Set tenant status to inactive | ✅ Covered |
| **Reactivate Tenant** | Reactivate deactivated tenant | ✅ Covered |
| **Check Slug Availability** | Verify subdomain slug is available/taken | ✅ Covered |
| **Unauthorized Access** | Reject requests without auth | ✅ Covered |

**Scenarios Tested:**
1. ✅ POST /api/tenants - Create tenant
2. ✅ POST /api/tenants - Duplicate email validation
3. ✅ POST /api/tenants - Duplicate slug validation
4. ✅ GET /api/tenants - List all tenants
5. ✅ GET /api/tenants/:id - Get tenant details
6. ✅ PUT /api/tenants/:id - Update tenant
7. ✅ PATCH /api/tenants/:id/status - Deactivate
8. ✅ PATCH /api/tenants/:id/status - Reactivate
9. ✅ GET /api/tenants/check-slug/:slug - Availability check
10. ✅ Unauthenticated request rejection

---

### **Module 2: Tenant Admin Login**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Login as Tenant A** | OTP flow for tenant A admin | ✅ Covered |
| **Login as Tenant B** | OTP flow for tenant B admin | ✅ Covered |
| **User Context** | Verify correct tenant context in JWT | ✅ Covered |

**Scenarios Tested:**
1. ✅ Tenant admin login via OTP
2. ✅ Subdomain routing with Host header
3. ✅ User context includes tenant_id
4. ✅ Role verification (TENANT_ADMIN)

---

### **Module 3: Credit Management**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Get Initial Balance** | Check balance starts at 0 | ✅ Covered |
| **Request Credits** | Tenant admin requests credits | ✅ Covered |
| **Duplicate Request** | Reject duplicate pending request | ✅ Covered |
| **Minimum Amount** | Reject request < 100 credits | ✅ Covered |
| **Super Admin Block** | Super admin cannot request credits | ✅ Covered |
| **List Requests (Admin)** | Super admin sees all requests | ✅ Covered |
| **List Requests (Tenant)** | Tenant admin sees only own | ✅ Covered |
| **Approve Request** | Super admin approves credit request | ✅ Covered |
| **Updated Balance** | Balance reflects approval | ✅ Covered |
| **Credit Transactions** | Transaction history recorded | ✅ Covered |
| **Reject Request** | Super admin rejects with reason | ✅ Covered |

**Scenarios Tested:**
1. ✅ GET /api/credits/balance - Initial balance
2. ✅ POST /api/credits/request - Create request
3. ✅ POST /api/credits/request - Duplicate validation
4. ✅ POST /api/credits/request - Minimum amount validation
5. ✅ POST /api/credits/request - Role restriction
6. ✅ GET /api/credits/requests - List (super admin)
7. ✅ GET /api/credits/requests - List (tenant admin)
8. ✅ POST /api/credits/approve/:id - Approve request
9. ✅ GET /api/credits/balance - Updated balance
10. ✅ GET /api/credits/transactions - Transaction history
11. ✅ POST /api/credits/reject/:id - Reject request

---

### **Module 4: Tenant User Management**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Cross-Tenant Creation** | Block user creation across tenants | ✅ Covered |
| **Unauthenticated Access** | Require auth for user management | ✅ Covered |
| **Missing Required Fields** | Validate required user fields | ✅ Covered |

**Scenarios Tested:**
1. ✅ POST /api/v1/tenants/:id/users - Cross-tenant block
2. ✅ GET /api/v1/tenants/:id/users - Auth requirement
3. ✅ POST /api/v1/tenants/:id/users - Field validation

---

### **Module 5: Tenant Isolation**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Credit Request Isolation** | Tenant B cannot see Tenant A requests | ✅ Covered |
| **Transaction Isolation** | Tenant B cannot see Tenant A transactions | ✅ Covered |
| **Super Admin Access** | Super admin sees all tenant data | ✅ Covered |

**Scenarios Tested:**
1. ✅ Data isolation between tenants
2. ✅ Super admin has global access
3. ✅ Tenant admin restricted to own data

---

### **Module 6: Authentication Edge Cases**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Invalid Token** | Reject requests with invalid JWT | ✅ Covered |
| **Missing Auth Header** | Reject requests without Authorization | ✅ Covered |
| **Missing Refresh Token** | Reject refresh without token | ✅ Covered |
| **Invalid Refresh Token** | Reject refresh with bad token | ✅ Covered |
| **Role-Based Access** | Tenant admin blocked from super admin routes | ✅ Covered |
| **Logout** | Successful logout flow | ✅ Covered |

**Scenarios Tested:**
1. ✅ Invalid JWT token rejection
2. ✅ Missing Authorization header
3. ✅ Missing refresh token
4. ✅ Invalid refresh token
5. ✅ Role-based route protection
6. ✅ Logout invalidates tokens

---

### **Module 7: Validation & Error Handling**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Missing Required Fields** | Tenant creation validation | ✅ Covered |
| **Invalid Slug Format** | Reject bad subdomain format | ✅ Covered |
| **Non-Existent Resource** | 404 for missing tenant | ✅ Covered |
| **Invalid Credit Amount** | Reject negative amounts | ✅ Covered |

**Scenarios Tested:**
1. ✅ Required field validation
2. ✅ Slug format validation
3. ✅ 404 error handling
4. ✅ Business rule validation (negative amounts)

---

## 🧪 Test File 3: `template-e2e.test.js` (850+ lines)

### **Module 1: Template CRUD (Tenant Admin)**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Create Template** | Create template with attributes and variants | ✅ Covered |
| **Get All Templates** | List all templates for tenant | ✅ Covered |
| **Get Template By ID** | Fetch single template with details | ✅ Covered |
| **Update Template** | Update template when no products exist | ✅ Covered |
| **Duplicate Template** | Create copy of existing template | ✅ Covered |

**Scenarios Tested:**
1. ✅ POST /api/templates - Create template
2. ✅ GET /api/templates - List all templates
3. ✅ GET /api/templates/:id - Get template details
4. ✅ PUT /api/templates/:id - Update template
5. ✅ POST /api/templates/:id/duplicate - Duplicate template
6. ✅ Verify product_count = 0 initially
7. ✅ Verify app_count = 0 initially
8. ✅ Verify attribute_count tracked correctly

---

### **Module 2: Template Protection - Products**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Product Count Tracking** | Show updated product_count after product creation | ✅ Covered |
| **Block Update** | Cannot update template when has products | ✅ Covered |
| **Block Delete** | Cannot delete template when has products | ✅ Covered |
| **Block Deactivate** | Cannot deactivate template when has products | ✅ Covered |
| **Verify Not Soft Deleted** | Template still exists in database (not soft deleted) | ✅ Covered |

**Scenarios Tested:**
1. ✅ Create product with template_id
2. ✅ GET /api/templates/:id shows product_count = 1
3. ✅ PUT /api/templates/:id returns 409 Conflict
4. ✅ DELETE /api/templates/:id returns 409 Conflict
5. ✅ PATCH /api/templates/:id/status returns 409 Conflict
6. ✅ Error message: "Cannot update template that has products"
7. ✅ Error message: "Cannot delete template that has products"
8. ✅ Error message: "Cannot deactivate template that has products"
9. ✅ Template remains active in database

---

### **Module 3: Template Protection - Verification Apps**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **App Count Tracking** | Show updated app_count after app assignment | ✅ Covered |
| **Block Delete** | Cannot delete template when assigned to apps | ✅ Covered |
| **List With App Count** | Templates list includes app_count | ✅ Covered |

**Scenarios Tested:**
1. ✅ Create verification_app with template_id
2. ✅ GET /api/templates/:id shows app_count = 1
3. ✅ DELETE /api/templates/:id returns 409 Conflict
4. ✅ Error message: "Cannot delete template that is assigned to verification apps"
5. ✅ GET /api/templates includes app_count for all templates

---

### **Module 4: Hard Delete Verification**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Permanent Delete** | Template completely removed from database | ✅ Covered |
| **Cannot Retrieve** | 404 when trying to get deleted template | ✅ Covered |
| **Not In List** | Deleted template does not appear in list | ✅ Covered |

**Scenarios Tested:**
1. ✅ DELETE /api/templates/:id succeeds (200 OK)
2. ✅ Database query shows 0 rows for deleted template
3. ✅ Template NOT just marked as is_active = false
4. ✅ GET /api/templates/:id returns 404 Not Found
5. ✅ GET /api/templates does not include deleted template

---

### **Module 5: Template Activation/Deactivation**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Deactivate Template** | Deactivate when no products exist | ✅ Covered |
| **Show Deactivated** | Deactivated template appears in list | ✅ Covered |
| **Activate Template** | Reactivate deactivated template | ✅ Covered |
| **Block Deactivate** | Cannot deactivate when has products | ✅ Covered |

**Scenarios Tested:**
1. ✅ PATCH /api/templates/:id/status - Deactivate (200 OK)
2. ✅ Template is_active = false in response
3. ✅ GET /api/templates?include_inactive=true shows deactivated
4. ✅ PATCH /api/templates/:id/status - Activate (200 OK)
5. ✅ Template is_active = true in response
6. ✅ PATCH with products returns 409 Conflict

---

### **Module 6: Tenant Isolation**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Template Isolation** | Tenant A cannot see Tenant B templates | ✅ Covered |
| **Cannot Get Cross-Tenant** | Tenant A cannot get Tenant B template by ID | ✅ Covered |
| **Cannot Update Cross-Tenant** | Tenant A cannot update Tenant B template | ✅ Covered |
| **Cannot Delete Cross-Tenant** | Tenant A cannot delete Tenant B template | ✅ Covered |
| **Own Templates Only** | Tenant B sees only own templates | ✅ Covered |
| **Super Admin Access** | Super admin sees templates from all tenants | ✅ Covered |

**Scenarios Tested:**
1. ✅ Create template for Tenant A
2. ✅ Create template for Tenant B
3. ✅ Tenant A GET /api/templates does not include Tenant B templates
4. ✅ Tenant A GET /api/templates/:tenantBId returns 404
5. ✅ Tenant A PUT /api/templates/:tenantBId returns 404
6. ✅ Tenant A DELETE /api/templates/:tenantBId returns 404
7. ✅ Tenant B sees only own templates in list
8. ✅ Super admin sees templates from both tenants

---

### **Module 7: System Template Protection**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Block Delete** | Cannot delete system templates | ✅ Covered |
| **Block Update** | Cannot update system templates | ✅ Covered |
| **Verify Exists** | System template remains in database | ✅ Covered |

**Scenarios Tested:**
1. ✅ Create system template (is_system_template = true)
2. ✅ DELETE /api/templates/:id returns 403 Forbidden
3. ✅ Error message: "System templates cannot be deleted"
4. ✅ PUT /api/templates/:id returns 403 Forbidden
5. ✅ Error message: "System templates cannot be modified"
6. ✅ System template still exists in database

---

### **Module 8: Validation & Error Handling**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Missing Name** | Reject template creation without name | ✅ Covered |
| **Invalid Data Type** | Reject invalid attribute data type | ✅ Covered |
| **Non-Existent Template** | 404 for non-existent template ID | ✅ Covered |
| **Unauthenticated** | Reject requests without auth | ✅ Covered |
| **Invalid Token** | Reject requests with invalid token | ✅ Covered |

**Scenarios Tested:**
1. ✅ POST /api/templates without name returns 400
2. ✅ POST /api/templates with invalid data_type returns 400
3. ✅ GET /api/templates/:fakeId returns 404
4. ✅ GET /api/templates without Authorization returns 401
5. ✅ GET /api/templates with invalid token returns 401

---

### **Module 9: Template Search and Filtering**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Search By Name** | Filter templates by name keyword | ✅ Covered |
| **Filter Active Only** | Show only active templates | ✅ Covered |
| **Pagination** | Support page and limit parameters | ✅ Covered |

**Scenarios Tested:**
1. ✅ GET /api/templates?search=Electronics
2. ✅ Search results contain only matching names
3. ✅ GET /api/templates?active_only=true
4. ✅ All results have is_active = true
5. ✅ GET /api/templates?page=1&limit=2
6. ✅ Response includes pagination metadata

---

## 🧪 Test File 4: `verification-app-e2e.test.js` (650+ lines)

### **Module 1: Verification App CRUD**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Create App** | Create verification app with template | ✅ Covered |
| **Get All Apps** | List all apps for tenant | ✅ Covered |
| **Get App By ID** | Fetch single app with details | ✅ Covered |
| **Update App** | Update app configuration | ✅ Covered |
| **Block Template Change** | Cannot change template after creation | ✅ Covered |
| **Delete App** | Delete verification app | ✅ Covered |

**Scenarios Tested:**
1. ✅ POST /api/verification-apps - Create app
2. ✅ GET /api/verification-apps - List all apps
3. ✅ GET /api/verification-apps/:id - Get app details
4. ✅ PUT /api/verification-apps/:id - Update app
5. ✅ PUT with template change returns 400
6. ✅ DELETE /api/verification-apps/:id - Delete app

---

### **Module 2: Template Assignment**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Template App Count** | Template shows updated app_count | ✅ Covered |
| **Create Without Template** | Allow app creation without template | ✅ Covered |
| **Invalid Template** | Reject non-existent template | ✅ Covered |
| **Cross-Tenant Template** | Block template from another tenant | ✅ Covered |

**Scenarios Tested:**
1. ✅ Template app_count reflects assignments
2. ✅ Create app with template_id = null
3. ✅ Invalid template_id returns 404
4. ✅ Cross-tenant template assignment blocked

---

### **Module 3: App Configuration**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **QR Settings** | Configure QR code settings | ✅ Covered |
| **Reward Settings** | Configure reward settings | ✅ Covered |
| **Disable Rewards** | Disable reward feature | ✅ Covered |
| **Multiple Settings** | Configure QR and rewards together | ✅ Covered |

**Scenarios Tested:**
1. ✅ Set QR config (type, prefix, expiry)
2. ✅ Set reward config (type, points, coupons)
3. ✅ Disable rewards (enabled: false)
4. ✅ Update multiple configs at once

---

### **Module 4: App Activation/Deactivation**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Deactivate App** | Set app to inactive | ✅ Covered |
| **Show Inactive** | Deactivated app in list with flag | ✅ Covered |
| **Activate App** | Reactivate deactivated app | ✅ Covered |
| **Filter Active** | Show only active apps | ✅ Covered |

**Scenarios Tested:**
1. ✅ PATCH /api/verification-apps/:id/status - Deactivate
2. ✅ Inactive app visible with include_inactive=true
3. ✅ PATCH /api/verification-apps/:id/status - Activate
4. ✅ GET with active_only=true filters correctly

---

### **Module 5: Product-App Relationships**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Product Count** | App shows product_count | ✅ Covered |
| **Block Delete With Products** | Cannot delete app with products | ✅ Covered |
| **Delete After Cleanup** | Allow delete after removing products | ✅ Covered |

**Scenarios Tested:**
1. ✅ product_count updated when products assigned
2. ✅ DELETE returns 409 when has products
3. ✅ DELETE succeeds after products removed

---

### **Modules 6-8: Tenant Isolation, Validation, Search (30+ tests total)**

All standard patterns tested:
- ✅ Cross-tenant access prevention
- ✅ Super admin global access
- ✅ Required field validation
- ✅ Duplicate name validation (per tenant)
- ✅ Invalid QR config rejection
- ✅ Search by name
- ✅ Filter by template
- ✅ Pagination support

---

## 🧪 Test File 5: `product-e2e.test.js` (1000+ lines)

### **Module 1: Product CRUD with Template**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Create Product** | Create product with template, variants, attributes | ✅ Covered |
| **Get All Products** | List all products for tenant | ✅ Covered |
| **Get Product By ID** | Fetch product with full details | ✅ Covered |
| **Update Product** | Update product details and attributes | ✅ Covered |
| **Update Stock** | Set, increment, decrement stock | ✅ Covered |
| **Block Negative Stock** | Prevent stock going negative | ✅ Covered |

**Scenarios Tested:**
1. ✅ POST /api/products - Create with template, variants, attributes
2. ✅ GET /api/products - List all products
3. ✅ GET /api/products/:id - Get product with template and category
4. ✅ PUT /api/products/:id - Update product
5. ✅ PATCH /api/products/:id/stock - SET operation
6. ✅ PATCH /api/products/:id/stock - INCREMENT operation
7. ✅ PATCH /api/products/:id/stock - DECREMENT operation
8. ✅ Negative stock returns 400

---

### **Module 2: Product Variants**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Get All Variants** | List all variants for product | ✅ Covered |
| **Get Variant By ID** | Fetch specific variant | ✅ Covered |
| **Update Variant** | Update variant price and stock | ✅ Covered |
| **Add Variant** | Add new variant to product | ✅ Covered |
| **Delete Variant** | Remove variant from product | ✅ Covered |
| **Block Duplicate** | Prevent duplicate variant options | ✅ Covered |

**Scenarios Tested:**
1. ✅ GET /api/products/:id/variants - List variants
2. ✅ GET /api/products/:id/variants/:vid - Get variant
3. ✅ PUT /api/products/:id/variants/:vid - Update variant
4. ✅ POST /api/products/:id/variants - Add variant
5. ✅ DELETE /api/products/:id/variants/:vid - Delete variant
6. ✅ Duplicate variant options returns 409

---

### **Module 3: Product Attributes**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Required Attributes** | Validate required attributes from template | ✅ Covered |
| **Update Attributes** | Update product attribute values | ✅ Covered |
| **Filter By Attribute** | Search products by attribute value | ✅ Covered |

**Scenarios Tested:**
1. ✅ Missing required attribute returns 400
2. ✅ Update attributes via PUT /api/products/:id
3. ✅ GET /api/products?attribute=Brand:Samsung

---

### **Modules 4-10: Relationships, Categories, Search, Validation (60+ tests total)**

- ✅ Template product_count tracking
- ✅ App product_count tracking
- ✅ Product-template validation
- ✅ Product-app assignment
- ✅ Product-category relationships
- ✅ Category product_count
- ✅ Tenant isolation (cross-tenant blocking)
- ✅ Super admin global access
- ✅ Search by name and SKU
- ✅ Filter by price range
- ✅ Filter by stock availability
- ✅ Sort by price (asc/desc)
- ✅ Pagination support
- ✅ Product deletion
- ✅ Template count updates after deletion
- ✅ Required field validation
- ✅ Duplicate SKU validation (per tenant)
- ✅ Negative price/stock rejection
- ✅ 404 for non-existent resources

---

## 🧪 Test File 6: `category-e2e.test.js` (800+ lines)

### **Module 1: Category CRUD**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Create Root Category** | Create category without parent | ✅ Covered |
| **Get All Categories** | List all categories for tenant | ✅ Covered |
| **Get Category By ID** | Fetch single category | ✅ Covered |
| **Update Category** | Update category details | ✅ Covered |
| **Delete Category** | Delete category without children | ✅ Covered |

**Scenarios Tested:**
1. ✅ POST /api/categories - Create root category
2. ✅ GET /api/categories - List all categories
3. ✅ GET /api/categories/:id - Get category
4. ✅ PUT /api/categories/:id - Update category
5. ✅ DELETE /api/categories/:id - Delete category

---

### **Module 2: Nested Categories**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Create Child** | Create category with parent | ✅ Covered |
| **Create Grandchild** | Create 3-level hierarchy | ✅ Covered |
| **Get Tree** | Get category tree structure | ✅ Covered |
| **Get Children** | Get all children of category | ✅ Covered |
| **Get Path** | Get breadcrumb path to category | ✅ Covered |
| **Block Circular Reference** | Prevent circular parent-child | ✅ Covered |
| **Block Delete With Children** | Cannot delete category with children | ✅ Covered |
| **Move Category** | Change parent of category | ✅ Covered |
| **Make Root** | Remove parent from category | ✅ Covered |

**Scenarios Tested:**
1. ✅ Create category with parent_id
2. ✅ Category level calculated correctly
3. ✅ GET /api/categories?tree=true - Tree structure
4. ✅ GET /api/categories/:id/children - Child list
5. ✅ GET /api/categories/:id/path - Breadcrumb
6. ✅ Circular reference returns 400
7. ✅ DELETE with children returns 409
8. ✅ Update parent_id to move category
9. ✅ Set parent_id = null to make root

---

### **Module 3: Category Ordering**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Respect Display Order** | Categories sorted by display_order | ✅ Covered |
| **Update Display Order** | Change display_order | ✅ Covered |
| **Batch Reorder** | Reorder multiple categories at once | ✅ Covered |

**Scenarios Tested:**
1. ✅ Categories returned in display_order
2. ✅ PUT /api/categories/:id - Update display_order
3. ✅ POST /api/categories/reorder - Batch update

---

### **Module 4: Category Activation/Deactivation**

| Test Scenario | Description | Status |
|---------------|-------------|--------|
| **Deactivate Category** | Set category to inactive | ✅ Covered |
| **Hide Inactive** | Inactive not in default list | ✅ Covered |
| **Show With Flag** | Show inactive with include_inactive=true | ✅ Covered |
| **Activate Category** | Reactivate category | ✅ Covered |
| **Cascade Deactivation** | Deactivate children recursively | ✅ Covered |

**Scenarios Tested:**
1. ✅ PATCH /api/categories/:id/status - Deactivate
2. ✅ Inactive categories hidden by default
3. ✅ GET with include_inactive=true shows all
4. ✅ PATCH /api/categories/:id/status - Activate
5. ✅ Cascade option deactivates all descendants

---

### **Modules 5-8: Products, Isolation, Validation, Search (30+ tests total)**

- ✅ Category product_count tracking
- ✅ Block delete with products
- ✅ Get products by category
- ✅ Tenant isolation (cross-tenant blocking)
- ✅ Super admin global access
- ✅ Required field validation
- ✅ Duplicate name validation (same parent)
- ✅ Allow duplicate names (different parent)
- ✅ Invalid parent rejection
- ✅ Negative display_order rejection
- ✅ Search by name
- ✅ Filter root categories only
- ✅ Filter by level
- ✅ Pagination support

---

## 📋 Other Test Files (Not E2E)

| File | Type | Lines | Purpose |
|------|------|-------|---------|
| auth.integration.test.js | Integration | 530 | Auth flow integration |
| user.integration.test.js | Integration | 511 | User CRUD integration |
| coupon-lifecycle.test.js | Integration | 413 | Coupon workflow |
| permission.integration.test.js | Integration | 406 | Permission system |
| catalogue.test.js | Integration | 373 | Product catalog |
| permission.middleware.test.js | Unit | 354 | Permission middleware |
| batch-coupons.test.js | Integration | 346 | Batch coupon creation |
| otp.service.test.js | Unit | 317 | OTP service logic |
| public-scan.test.js | Integration | 283 | Public scan endpoint |
| slug-generator.service.test.js | Unit | 272 | Slug generation |
| auth-subdomain.integration.test.js | Integration | 223 | Subdomain auth |
| subdomain.middleware.test.js | Unit | 215 | Subdomain routing |
| tenant-subdomain.integration.test.js | Integration | 198 | Tenant subdomain |
| publicScan.integration.test.js | Integration | 94 | Public scan flow |
| mobileAuth.integration.test.js | Integration | 80 | Mobile auth |
| email.service.test.js | Unit | 69 | Email service |

---

## ❌ Features NOT Covered by E2E Tests

### **Product Images** (Partial coverage)
- ⚠️ Product image upload (needs file upload testing)
- ⚠️ Product image deletion
- ⚠️ Multiple images per product

### **Rewards/Coupons** (Only lifecycle tests exist, not full E2E)
- ❌ End-to-end coupon redemption flow
- ❌ Coupon generation with products
- ❌ QR code scanning flow

### **Mobile API**
- ❌ Mobile app authentication
- ❌ Mobile product scanning
- ❌ Mobile coupon redemption

### **Dashboard/Analytics**
- ❌ Dashboard statistics
- ❌ Reports generation
- ❌ Analytics endpoints

---

## 📊 Coverage Summary

| Module | Tests | Coverage |
|--------|-------|----------|
| **Authentication** | 15+ | ✅ Excellent |
| **Tenant Management** | 11 | ✅ Excellent |
| **Credit System** | 11 | ✅ Excellent |
| **Template System** | 35+ | ✅ Excellent |
| **Verification Apps** | 40+ | ✅ Excellent |
| **Products** | 70+ | ✅ Excellent |
| **Categories** | 50+ | ✅ Excellent |
| **User Management** | 3 | ⚠️ Basic |
| **Product Images** | 0 | ⚠️ Partial |
| **Rewards (E2E)** | 0 | ❌ None |
| **Mobile API (E2E)** | 0 | ❌ None |

---

## 🎯 Recommendation

**Priority for New E2E Tests:**
1. ~~**Template System**~~ - ✅ **COMPLETED** (35+ scenarios)
2. ~~**Verification Apps**~~ - ✅ **COMPLETED** (40+ scenarios)
3. ~~**Product Management**~~ - ✅ **COMPLETED** (70+ scenarios)
4. ~~**Categories**~~ - ✅ **COMPLETED** (50+ scenarios)
5. **Product Images** - File upload/deletion testing
6. **Rewards/Coupons** - End-to-end redemption flow
7. **Mobile API** - Customer-facing features

---

## 📝 Notes

- E2E tests require `E2E_TESTS_ENABLED=true` environment variable
- Tests use real database connection
- Comprehensive cleanup in afterEach/afterAll hooks
- Tests cover happy paths and error cases
- Excellent coverage of authentication and authorization
- ✅ **NEW**: Comprehensive template system coverage (35+ scenarios)
- ✅ **NEW**: Template protection logic fully tested (products + apps)
- ✅ **NEW**: Hard delete verification (not soft delete)
- ✅ **NEW**: Tenant isolation across all modules
- ✅ **NEW**: Verification app system fully tested (40+ scenarios)
- ✅ **NEW**: Product management with variants and attributes (70+ scenarios)
- ✅ **NEW**: Category hierarchy and nesting (50+ scenarios)
- ✅ **NEW**: Product-template-app relationships fully tested
- ✅ **NEW**: Stock management and variant operations
- ✅ **NEW**: Category tree structure and ordering
- ⚠️ Partial coverage for product images (needs file upload testing)
- Missing coverage for rewards/coupons E2E flow and mobile API
