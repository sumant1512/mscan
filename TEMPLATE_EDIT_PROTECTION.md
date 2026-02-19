# Template Edit Protection Implementation

## Summary
Implemented protection to prevent editing templates that have products or are assigned to verification apps, with both frontend UI controls and backend validation.

## Changes Made

### 1. Backend Validation (`mscan-server/src/services/template.service.js`)

**Location:** `updateTemplate()` method (lines 161-194)

**Changes:**
- Added check for products using the template
- Added check for verification apps using the template
- Returns proper HTTP 400 Bad Request error with descriptive messages
- Each error includes:
  - `statusCode: 400`
  - `code`: `TEMPLATE_HAS_PRODUCTS` or `TEMPLATE_ASSIGNED_TO_APPS`
  - Clear error message explaining why the update is blocked

**Error Messages:**
```javascript
// When template has products
{
  statusCode: 400,
  code: 'TEMPLATE_HAS_PRODUCTS',
  message: 'Cannot update template that has products. Please delete all products first or create a new template.'
}

// When template is assigned to apps
{
  statusCode: 400,
  code: 'TEMPLATE_ASSIGNED_TO_APPS',
  message: 'Cannot update template that is assigned to verification apps. Please unassign from all apps first or create a new template.'
}
```

### 2. Frontend UI Protection (`mscan-client/src/app/components/templates/template-detail.component.*`)

#### HTML Changes (`template-detail.component.html`)

**Edit Button (lines 52-59):**
- Added `[disabled]="!canEditTemplate()"` to disable the button
- Added `[title]="getEditButtonTooltip()"` for helpful tooltip on hover
- Button is now disabled when template has products or is assigned to apps

**Metadata Section (lines 131-157):**
- Added "Products Using" count display
- Added "Apps Using" count display
- Counts are highlighted in warning color when > 0

#### TypeScript Changes (`template-detail.component.ts`)

**New Methods Added:**

1. `canEditTemplate()`: Returns boolean indicating if template can be edited
   - Checks if template is system template
   - Checks if `product_count > 0`
   - Checks if `app_count > 0`

2. `getEditButtonTooltip()`: Returns helpful tooltip message
   - Different messages based on why editing is disabled
   - Clear guidance on what needs to be done to enable editing

3. Updated `editTemplate()`: Added additional validation before navigation

#### CSS Changes (`template-detail.component.css`)

**Added Styles:**
- `.btn-primary:disabled` - Grayed out disabled button with reduced opacity
- `.text-warning` - Orange warning color for product/app counts

## User Experience

### Visual Indicators
1. **Edit Button**: Disabled (grayed out) when template cannot be edited
2. **Tooltip**: Hover over disabled button shows why it's disabled
3. **Metadata Counts**: Product and app usage counts displayed in orange when > 0
4. **Backend Error**: If user somehow bypasses frontend, backend returns clear 400 error

### Error Messages

**Frontend Tooltips:**
- System templates: "System templates cannot be edited"
- Has products: "Cannot edit template that has products. Please delete all products first."
- Has apps: "Cannot edit template that is assigned to verification apps. Please unassign from all apps first."
- Both: "Cannot edit template that has products and is assigned to apps"

**Backend Errors:**
- Returns HTTP 400 Bad Request
- Clear, actionable error messages
- Error codes for programmatic handling

## Testing Scenarios

### Frontend
1. ✅ View template with no products/apps → Edit button enabled
2. ✅ View template with products → Edit button disabled with tooltip
3. ✅ View template assigned to apps → Edit button disabled with tooltip
4. ✅ View template with both → Edit button disabled with combined tooltip
5. ✅ System template → Edit button hidden (existing behavior)

### Backend
1. ✅ Update template with no products/apps → Success
2. ✅ Update template with products → 400 error
3. ✅ Update template assigned to apps → 400 error
4. ✅ Proper error format and status code

## Files Modified

1. `mscan-server/src/services/template.service.js`
2. `mscan-client/src/app/components/templates/template-detail.component.html`
3. `mscan-client/src/app/components/templates/template-detail.component.ts`
4. `mscan-client/src/app/components/templates/template-detail.component.css`

## Notes

- The `product_count` and `app_count` are already fetched from the backend in `getTemplateById()` service method
- No database changes required - existing queries already return these counts
- Implementation follows existing patterns in the codebase
- Error handling uses the existing error middleware infrastructure
