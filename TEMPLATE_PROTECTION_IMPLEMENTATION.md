# Template Protection Implementation

## 📋 Overview

Implemented strict template protection to prevent modification/deletion of templates that have products.

---

## 🎯 Business Rules Implemented

### **1. Templates WITH Products (product_count > 0)**
- ❌ **Cannot be updated** - All fields locked
- ❌ **Cannot be deleted** - Soft delete blocked
- ❌ **Cannot be deactivated** - Status change blocked

### **2. Templates WITHOUT Products (product_count = 0)**
- ✅ **Can be updated** - All fields editable
- ✅ **Can be deleted** - Soft delete allowed
- ✅ **Can be deactivated** - Status change allowed

### **3. Inactive Templates (is_active = false)**
- ✅ **Can be activated back** - Anytime, regardless of product count
- 🔄 Used when template needs temporary disabling

---

## 📁 Files Modified

### **Backend Changes**

#### **1. Database** (`mscan-server/database/full_setup.sql`)
```sql
-- Added index for better performance on product count queries
CREATE INDEX IF NOT EXISTS idx_product_templates_tenant_active
  ON product_templates(tenant_id, is_active);
```

#### **2. Service** (`mscan-server/src/services/template.service.js`)

**Enhanced `getAllTemplates`:**
```javascript
// Now includes product count via LEFT JOIN
SELECT
  pt.*,
  COALESCE(COUNT(p.id), 0)::INTEGER as product_count
FROM product_templates pt
LEFT JOIN products p ON pt.id = p.template_id
GROUP BY pt.id
```

**Enhanced `getTemplateById`:**
```javascript
// Also includes product count
LEFT JOIN products p ON pt.id = p.template_id
GROUP BY pt.id
```

**Updated `updateTemplate`:**
```javascript
// Check for products before allowing update
const usageCheck = await db.query(
  'SELECT COUNT(*) as count FROM products WHERE template_id = $1',
  [templateId]
);

if (parseInt(usageCheck.rows[0].count) > 0) {
  throw new Error('Cannot update template that has products. Please delete all products first or create a new template.');
}
```

**Updated `deleteTemplate`:**
```javascript
// Updated error message
if (parseInt(usageCheck.rows[0].count) > 0) {
  throw new Error('Cannot delete template that has products. Please delete all products first.');
}
```

**Added `toggleTemplateStatus`:**
```javascript
async toggleTemplateStatus(templateId, tenantId) {
  const template = await this.getTemplateById(templateId, tenantId);

  // Block deactivation if has products
  if (template.is_active && template.product_count > 0) {
    throw new Error('Cannot deactivate template that has products. Please delete all products first.');
  }

  // Toggle status
  const newStatus = !template.is_active;
  // Update and return
}
```

#### **3. Controller** (`mscan-server/src/controllers/template.controller.js`)

**Enhanced `getAllTemplates` response:**
```javascript
const transformedTemplates = templates.map(t => ({
  // ... existing fields
  product_count: t.product_count || 0  // Added
}));
```

**Enhanced `updateTemplate` error handling:**
```javascript
if (error.message.includes('Cannot update template')) {
  return res.status(409).json({
    success: false,
    message: error.message
  });
}
```

**Added `toggleTemplateStatus` controller method:**
```javascript
async toggleTemplateStatus(req, res) {
  const { id } = req.params;
  const tenantId = req.user.tenant_id;

  const template = await templateService.toggleTemplateStatus(id, tenantId);
  const action = template.is_active ? 'activated' : 'deactivated';

  res.status(200).json({
    success: true,
    message: `Template ${action} successfully`,
    data: template
  });
}
```

#### **4. Routes** (`mscan-server/src/routes/template.routes.js`)

**Added new endpoint:**
```javascript
/**
 * @route   PATCH /api/templates/:id/toggle-status
 * @desc    Toggle template status (activate/deactivate)
 * @access  Private (Tenant Admin, Super Admin)
 */
router.patch('/:id/toggle-status',
  requireRole(['TENANT_ADMIN', 'SUPER_ADMIN']),
  templateController.toggleTemplateStatus
);
```

---

### **Frontend Changes**

#### **1. Model** (`mscan-client/src/app/models/templates.model.ts`)

**Added to `ProductTemplate` interface:**
```typescript
export interface ProductTemplate {
  // ... existing fields

  // Computed/joined fields
  attribute_count?: number;
  product_count?: number;  // ✅ Added
}
```

#### **2. Service** (`mscan-client/src/app/services/template.service.ts`)

**Removed deprecated methods:**
- ❌ Removed `addAttribute()` (deprecated)
- ❌ Removed `updateAttribute()` (deprecated)
- ❌ Removed `deleteAttribute()` (deprecated)

**Added new method:**
```typescript
/**
 * Toggle template status (activate/deactivate)
 */
toggleTemplateStatus(id: string): Observable<TemplateResponse> {
  return this.http.patch<TemplateResponse>(
    `${this.apiUrl}/${id}/toggle-status`,
    {}
  );
}
```

#### **3. Component** (`mscan-client/src/app/components/templates/template-list.component.ts`)

**Updated `deleteTemplate` with product check:**
```typescript
deleteTemplate(template: ProductTemplate): void {
  if (template.product_count && template.product_count > 0) {
    alert(`Cannot delete template that has ${template.product_count} product(s). Please delete all products first.`);
    return;
  }
  // ... rest of delete logic
}
```

**Added `toggleTemplateStatus` method:**
```typescript
toggleTemplateStatus(template: ProductTemplate): void {
  if (template.product_count && template.product_count > 0 && template.is_active) {
    alert(`Cannot deactivate template that has ${template.product_count} product(s). Please delete all products first.`);
    return;
  }

  const action = template.is_active ? 'deactivate' : 'activate';
  if (!confirm(`Are you sure you want to ${action} template "${template.name}"?`)) {
    return;
  }

  this.templateService.toggleTemplateStatus(template.id).subscribe({
    next: (response) => {
      this.loadTemplates();
      alert(response.message);
    },
    error: (error) => {
      alert(error.error?.message || `Failed to ${action} template`);
    }
  });
}
```

**Added helper methods:**
```typescript
canEditTemplate(template: ProductTemplate): boolean {
  return !template.product_count || template.product_count === 0;
}

canDeleteTemplate(template: ProductTemplate): boolean {
  return !template.is_system_template &&
         (!template.product_count || template.product_count === 0);
}

canDeactivateTemplate(template: ProductTemplate): boolean {
  return !template.product_count || template.product_count === 0;
}
```

#### **4. Template** (`mscan-client/src/app/components/templates/template-list.component.html`)

**Added product count display:**
```html
<span class="meta-item">
  <span class="icon">📦</span> {{ template.product_count || 0 }} products
</span>
```

**Enhanced Edit button:**
```html
<button
  class="btn btn-sm btn-outline"
  [disabled]="!canEditTemplate(template)"
  [title]="canEditTemplate(template) ? 'Edit template' : 'Cannot edit template with products'"
  (click)="editTemplate(template)">
  Edit
</button>
```

**Added Toggle Status button:**
```html
<button
  class="btn btn-sm"
  [ngClass]="template.is_active ? 'btn-warning' : 'btn-success'"
  [disabled]="template.is_active && !canDeactivateTemplate(template)"
  [title]="template.is_active && !canDeactivateTemplate(template)
    ? 'Cannot deactivate template with products'
    : (template.is_active ? 'Deactivate template' : 'Activate template')"
  (click)="toggleTemplateStatus(template)">
  {{ template.is_active ? 'Deactivate' : 'Activate' }}
</button>
```

**Enhanced Delete button:**
```html
<button
  class="btn btn-sm btn-danger"
  [disabled]="!canDeleteTemplate(template)"
  [title]="canDeleteTemplate(template) ? 'Delete template' : 'Cannot delete template with products'"
  (click)="deleteTemplate(template)">
  Delete
</button>
```

---

## 🔄 Data Flow

### **Scenario 1: Trying to Edit Template with Products**

```
1. User clicks Edit button
   ↓
2. Frontend: canEditTemplate() checks product_count
   ↓
3. If product_count > 0:
   - Button is disabled
   - Tooltip shows "Cannot edit template with products"
   ↓
4. If user somehow bypasses (API call):
   - Backend checks product count
   - Returns 409 Conflict
   - Message: "Cannot update template that has products"
```

### **Scenario 2: Trying to Delete Template with Products**

```
1. User clicks Delete button
   ↓
2. Frontend: canDeleteTemplate() checks product_count
   ↓
3. If product_count > 0:
   - Alert shown: "Cannot delete template that has 5 product(s)"
   - Action blocked
   ↓
4. If user somehow bypasses:
   - Backend checks product count
   - Returns 409 Conflict
   - Message: "Cannot delete template that has products"
```

### **Scenario 3: Trying to Deactivate Template with Products**

```
1. User clicks Deactivate button
   ↓
2. Frontend: canDeactivateTemplate() checks product_count
   ↓
3. If product_count > 0:
   - Alert shown: "Cannot deactivate template that has 5 product(s)"
   - Action blocked
   ↓
4. If user somehow bypasses:
   - Backend checks product count
   - Returns 409 Conflict
   - Message: "Cannot deactivate template that has products"
```

### **Scenario 4: Activating Inactive Template**

```
1. User clicks Activate button on inactive template
   ↓
2. Confirmation dialog: "Are you sure you want to activate..."
   ↓
3. User confirms
   ↓
4. PATCH /api/templates/:id/toggle-status
   ↓
5. Backend: Sets is_active = true
   ↓
6. Frontend: Reloads list, shows success
   ✅ Template is now active
```

---

## 📊 API Endpoints

### **GET /api/templates**
**Response includes:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Wall Paint",
      "product_count": 5,  // ✅ NEW
      "is_active": true,
      "attribute_count": 8
    }
  ]
}
```

### **GET /api/templates/:id**
**Response includes:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "template_name": "Wall Paint",
    "product_count": 5,  // ✅ NEW
    "is_active": true,
    "variant_config": {...},
    "custom_fields": [...]
  }
}
```

### **PUT /api/templates/:id** ✅ PROTECTED
**If template has products:**
```json
{
  "success": false,
  "message": "Cannot update template that has products. Please delete all products first or create a new template."
}
```
**Status Code:** 409 Conflict

### **DELETE /api/templates/:id** ✅ PROTECTED
**If template has products:**
```json
{
  "success": false,
  "message": "Cannot delete template that has products. Please delete all products first."
}
```
**Status Code:** 409 Conflict

### **PATCH /api/templates/:id/toggle-status** ✅ NEW
**If deactivating template with products:**
```json
{
  "success": false,
  "message": "Cannot deactivate template that has products. Please delete all products first."
}
```
**Status Code:** 409 Conflict

**Success response:**
```json
{
  "success": true,
  "message": "Template activated successfully",
  "data": {
    "id": "uuid",
    "is_active": true,
    ...
  }
}
```

---

## ✅ Testing Checklist

### **Backend Tests:**
- [ ] GET /api/templates returns product_count
- [ ] PUT /api/templates/:id blocks update if products exist
- [ ] DELETE /api/templates/:id blocks delete if products exist
- [ ] PATCH /api/templates/:id/toggle-status blocks deactivation if products exist
- [ ] PATCH /api/templates/:id/toggle-status allows activation regardless of products
- [ ] Error messages are clear and actionable

### **Frontend Tests:**
- [ ] Template list shows product count
- [ ] Edit button disabled for templates with products
- [ ] Delete button disabled for templates with products
- [ ] Deactivate button disabled for active templates with products
- [ ] Activate button enabled for inactive templates (always)
- [ ] Tooltips show correct messages on disabled buttons
- [ ] API error messages displayed to user
- [ ] UI updates after successful toggle

### **Integration Tests:**
- [ ] Create template → Add product → Try to edit (should fail)
- [ ] Create template → Add product → Try to delete (should fail)
- [ ] Create template → Add product → Try to deactivate (should fail)
- [ ] Create template → Deactivate → Activate back (should work)
- [ ] Create template → Add product → Delete product → Edit template (should work)

---

## 🎯 User Experience

### **Before This Implementation:**
- ❌ Users could modify templates and break existing products
- ❌ Users could delete templates and orphan products
- ❌ No visibility into template usage

### **After This Implementation:**
- ✅ Clear product count displayed on each template
- ✅ Buttons disabled with helpful tooltips
- ✅ Prevents accidental data corruption
- ✅ Clear error messages if protection bypassed
- ✅ Ability to deactivate/reactivate templates without products

---

## 🚀 Usage Examples

### **Example 1: Template with Products**
```
Template: "Wall Paint"
Products: 47 products

UI Display:
🏷️ 8 attributes  📦 47 products  📅 Jan 15, 2025

Buttons:
[View] [Edit - disabled] [Duplicate] [Deactivate - disabled] [Delete - disabled]

Tooltips:
- Edit: "Cannot edit template with products"
- Deactivate: "Cannot deactivate template with products"
- Delete: "Cannot delete template with products"
```

### **Example 2: Inactive Template (No Products)**
```
Template: "Old Template"
Status: Inactive
Products: 0 products

UI Display:
Badge: [Inactive]
🏷️ 5 attributes  📦 0 products  📅 Dec 1, 2024

Buttons:
[View] [Edit - enabled] [Duplicate] [Activate - enabled] [Delete - enabled]

Actions:
- Can edit freely
- Can activate back
- Can delete permanently
```

### **Example 3: Active Template (No Products)**
```
Template: "New Template"
Products: 0 products

UI Display:
🏷️ 3 attributes  📦 0 products  📅 Feb 13, 2025

Buttons:
[View] [Edit - enabled] [Duplicate] [Deactivate - enabled] [Delete - enabled]

Actions:
- Can edit all fields
- Can deactivate
- Can delete
```

---

## 📝 Summary

✅ **Complete protection** - Templates with products cannot be modified/deleted/deactivated
✅ **User-friendly** - Clear product counts and helpful tooltips
✅ **Flexible** - Inactive templates can always be reactivated
✅ **Safe** - Double protection (frontend + backend)
✅ **Clean code** - Removed all deprecated methods as requested
✅ **Database optimized** - Added index for better performance

**No migrations needed** - Changes integrated into `full_setup.sql` for fresh installations! 🎉
