# Template E2E Tests - Implementation Summary

## 📋 Overview

Comprehensive E2E test suite for the **recently updated template system** covering all protection logic, hard delete functionality, and tenant isolation.

**Test File**: `mscan-server/src/__tests__/template-e2e.test.js`
**Lines of Code**: 850+
**Total Scenarios**: 35+
**Test Modules**: 9

---

## 🎯 What Was Tested

### **Recently Updated Features Covered:**

1. ✅ **Hard Delete** (not soft delete)
   - Template completely removed from database
   - Cannot retrieve deleted template (404)
   - Not just marked as `is_active = false`

2. ✅ **Product Count Tracking**
   - `product_count` field included in responses
   - Updates when products are added/removed
   - Blocks operations when `product_count > 0`

3. ✅ **App Count Tracking**
   - `app_count` field included in responses
   - Updates when apps are assigned/unassigned
   - Blocks deletion when `app_count > 0`

4. ✅ **Template Protection Logic**
   - Cannot update template when has products
   - Cannot delete template when has products
   - Cannot delete template when assigned to apps
   - Cannot deactivate template when has products
   - Can always activate inactive template

5. ✅ **System Template Protection**
   - Cannot delete system templates (403 Forbidden)
   - Cannot update system templates (403 Forbidden)

---

## 📊 Test Modules Breakdown

### **Module 1: Template CRUD (5 tests)**
```
✅ Create template with attributes and variants
✅ Get all templates for tenant
✅ Get template by ID with full details
✅ Update template (when no products exist)
✅ Duplicate template
```

**Key Validations:**
- Template includes `product_count = 0` initially
- Template includes `app_count = 0` initially
- Template includes `attribute_count` based on attributes
- Template belongs to correct tenant

---

### **Module 2: Template Protection - Products (5 tests)**
```
✅ Show updated product_count after product creation
✅ Block update when template has products (409 Conflict)
✅ Block delete when template has products (409 Conflict)
✅ Block deactivate when template has products (409 Conflict)
✅ Verify template not soft deleted (still exists in DB)
```

**Key Validations:**
- Error: "Cannot update template that has products"
- Error: "Cannot delete template that has products"
- Error: "Cannot deactivate template that has products"
- Template remains `is_active = true` in database

---

### **Module 3: Template Protection - Verification Apps (3 tests)**
```
✅ Show updated app_count after app assignment
✅ Block delete when template assigned to apps (409 Conflict)
✅ List templates with app_count included
```

**Key Validations:**
- Error: "Cannot delete template that is assigned to verification apps"
- `app_count` field present in list and detail endpoints

---

### **Module 4: Hard Delete Verification (3 tests)**
```
✅ Permanently delete template (200 OK)
✅ Template completely removed from database (0 rows)
✅ Cannot retrieve deleted template (404 Not Found)
✅ Deleted template not in list
```

**Key Validations:**
- `DELETE FROM product_templates` (not `UPDATE is_active = false`)
- Database query returns 0 rows for deleted template
- GET requests return 404, not inactive template

---

### **Module 5: Template Activation/Deactivation (4 tests)**
```
✅ Deactivate template when no products exist
✅ Show deactivated template in list (with include_inactive flag)
✅ Activate deactivated template
✅ Block deactivate when template has products
```

**Key Validations:**
- Deactivation sets `is_active = false`
- Activation sets `is_active = true`
- Cannot deactivate when `product_count > 0`

---

### **Module 6: Tenant Isolation (6 tests)**
```
✅ Tenant A cannot see Tenant B templates in list
✅ Tenant A cannot get Tenant B template by ID (404)
✅ Tenant A cannot update Tenant B template (404)
✅ Tenant A cannot delete Tenant B template (404)
✅ Tenant B sees only own templates
✅ Super admin sees templates from all tenants
```

**Key Validations:**
- Complete data isolation between tenants
- 404 errors (not 403) for cross-tenant access
- Super admin has global visibility

---

### **Module 7: System Template Protection (3 tests)**
```
✅ Cannot delete system template (403 Forbidden)
✅ Cannot update system template (403 Forbidden)
✅ System template remains in database
```

**Key Validations:**
- Error: "System templates cannot be deleted"
- Error: "System templates cannot be modified"
- `is_system_template = true` templates are protected

---

### **Module 8: Validation & Error Handling (5 tests)**
```
✅ Reject template creation without name (400 Bad Request)
✅ Reject invalid attribute data type (400 Bad Request)
✅ Return 404 for non-existent template ID
✅ Reject unauthenticated requests (401 Unauthorized)
✅ Reject requests with invalid token (401 Unauthorized)
```

**Key Validations:**
- Required field validation
- Data type validation
- Authentication and authorization checks

---

### **Module 9: Template Search and Filtering (3 tests)**
```
✅ Search templates by name keyword
✅ Filter active templates only
✅ Support pagination (page & limit)
```

**Key Validations:**
- Search results contain only matching names
- `active_only` flag filters correctly
- Pagination metadata included in response

---

## 🔧 How to Run Tests

### **Run All Template E2E Tests:**
```bash
E2E_TESTS_ENABLED=true npm test -- template-e2e.test.js
```

### **Run Specific Module:**
```bash
E2E_TESTS_ENABLED=true npm test -- template-e2e.test.js -t "Module 1"
```

### **Run Specific Test:**
```bash
E2E_TESTS_ENABLED=true npm test -- template-e2e.test.js -t "Should permanently delete template"
```

---

## 📁 Test Data Setup

Each test suite automatically:

1. **Creates**:
   - Super Admin (gets token via OTP)
   - Tenant A + Tenant A Admin (gets token)
   - Tenant B + Tenant B Admin (gets token)

2. **Uses**:
   - Real database connection
   - Actual API endpoints
   - Complete authentication flow

3. **Cleans Up**:
   - All created templates
   - All created products
   - All created verification apps
   - All test tenants and users

**No manual cleanup required!**

---

## 🎨 API Endpoints Tested

### **Template CRUD:**
```
POST   /api/templates                    - Create template
GET    /api/templates                    - List templates
GET    /api/templates/:id                - Get template by ID
PUT    /api/templates/:id                - Update template
DELETE /api/templates/:id                - Delete template (hard delete)
POST   /api/templates/:id/duplicate      - Duplicate template
PATCH  /api/templates/:id/status         - Activate/Deactivate template
```

### **Query Parameters:**
```
GET /api/templates?search=keyword        - Search by name
GET /api/templates?active_only=true      - Filter active only
GET /api/templates?include_inactive=true - Include inactive templates
GET /api/templates?page=1&limit=10       - Pagination
```

---

## 📊 Expected API Responses

### **Success - Create Template (201 Created):**
```json
{
  "success": true,
  "template": {
    "id": "uuid",
    "name": "Electronics Template",
    "description": "Template for electronic products",
    "tenant_id": "uuid",
    "attribute_count": 3,
    "product_count": 0,
    "app_count": 0,
    "is_active": true,
    "is_system_template": false,
    "created_at": "2026-02-13T..."
  }
}
```

### **Success - List Templates (200 OK):**
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Electronics Template",
      "product_count": 0,
      "app_count": 0,
      "is_active": true
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1
  }
}
```

### **Error - Template Has Products (409 Conflict):**
```json
{
  "success": false,
  "message": "Cannot delete template that has products. Please delete all products first."
}
```

### **Error - Template Assigned to Apps (409 Conflict):**
```json
{
  "success": false,
  "message": "Cannot delete template that is assigned to verification apps. Please unassign from all apps first."
}
```

### **Error - System Template (403 Forbidden):**
```json
{
  "success": false,
  "message": "System templates cannot be deleted"
}
```

### **Error - Not Found (404):**
```json
{
  "success": false,
  "message": "Template not found"
}
```

---

## ✅ Verification Checklist

All tests verify the **recently updated features**:

- [x] Hard delete actually removes template from database
- [x] `product_count` field present in all responses
- [x] `app_count` field present in all responses
- [x] Cannot update template when `product_count > 0`
- [x] Cannot delete template when `product_count > 0`
- [x] Cannot delete template when `app_count > 0`
- [x] Cannot deactivate template when `product_count > 0`
- [x] Can activate inactive template
- [x] System templates cannot be deleted (403)
- [x] System templates cannot be updated (403)
- [x] Tenant isolation (cannot access other tenant's templates)
- [x] Super admin can see all tenants' templates
- [x] Search by name works correctly
- [x] Active/inactive filtering works
- [x] Pagination works correctly
- [x] Proper error messages for all scenarios
- [x] Proper HTTP status codes (200, 201, 400, 401, 403, 404, 409)

---

## 🔍 Database Queries Tested

Tests verify these database operations:

### **Product Count Check:**
```sql
SELECT COUNT(*) as count
FROM products
WHERE template_id = $1
```

### **App Count Check:**
```sql
SELECT COUNT(*) as count
FROM verification_apps
WHERE template_id = $1
```

### **Hard Delete:**
```sql
DELETE FROM product_templates
WHERE id = $1 AND tenant_id = $2
RETURNING id
```

### **Verification After Delete:**
```sql
SELECT * FROM product_templates WHERE id = $1
-- Should return 0 rows (not 1 row with is_active = false)
```

---

## 🎯 Coverage Statistics

| Category | Count | Status |
|----------|-------|--------|
| **Test Modules** | 9 | ✅ Complete |
| **Total Test Cases** | 35+ | ✅ Complete |
| **API Endpoints** | 7 | ✅ Complete |
| **Error Scenarios** | 10+ | ✅ Complete |
| **Success Scenarios** | 15+ | ✅ Complete |
| **Validation Checks** | 20+ | ✅ Complete |
| **Isolation Tests** | 6 | ✅ Complete |
| **Protection Tests** | 8 | ✅ Complete |

---

## 🚀 Integration with CI/CD

### **GitHub Actions Example:**
```yaml
- name: Run Template E2E Tests
  run: |
    E2E_TESTS_ENABLED=true npm test -- template-e2e.test.js
  env:
    DB_HOST: localhost
    DB_PORT: 5432
    DB_NAME: mscan_test
    DB_USER: postgres
    DB_PASSWORD: password
```

### **Local Development:**
```bash
# Start database
docker-compose up -d postgres

# Run migration
npm run migrate

# Run E2E tests
E2E_TESTS_ENABLED=true npm test -- template-e2e.test.js
```

---

## 📝 Test Maintenance Notes

### **When to Update Tests:**

1. **New Template Features Added**:
   - Add new test module
   - Follow existing module pattern

2. **API Response Changes**:
   - Update expected response objects
   - Update validation assertions

3. **New Validation Rules**:
   - Add to Module 8 (Validation & Error Handling)
   - Verify error messages and status codes

4. **Database Schema Changes**:
   - Update queries in beforeAll/afterAll
   - Verify field names in assertions

---

## 🎉 Summary

This comprehensive E2E test suite ensures:

✅ **Recently updated template features are fully tested**
✅ **Hard delete functionality works as expected**
✅ **Product and app count tracking is accurate**
✅ **Protection logic prevents unauthorized operations**
✅ **Tenant isolation is maintained**
✅ **System templates are protected**
✅ **Error handling is robust**
✅ **API responses are consistent**

**Total Coverage: 35+ scenarios across 9 modules** 🎯

---

## 📚 Related Documentation

- `TEMPLATE_DELETE_UPDATE.md` - Template delete implementation details
- `TEMPLATE_ATTRIBUTES_GUIDE.md` - Template attributes usage guide
- `ATTRIBUTES_VS_VARIANTS_VISUAL.md` - Visual guide for attributes vs variants
- `CURRENT_E2E_TEST_COVERAGE.md` - Overall E2E test coverage summary

---

**Last Updated**: 2026-02-13
**Test File**: `mscan-server/src/__tests__/template-e2e.test.js`
**Status**: ✅ All Tests Passing
