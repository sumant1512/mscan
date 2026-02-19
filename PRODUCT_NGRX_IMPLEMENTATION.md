# Product NgRx Implementation & View Feature

## Summary
Implemented comprehensive NgRx state management for products with **template-based dynamic schemas** and added a view/detail page with proper edit mode fixes.

## 🔑 Key Architecture: Template-Based Dynamic Product Schema
Products in this system have **flexible schemas** that change based on their associated template. Each template defines different fields, variants, and custom attributes.

**Example:**
- Paint Template → has Size, Finish, Coverage, Drying Time
- Electronics Template → has Color, Storage, Warranty, Model Number
- Each product's schema adapts to its template

See [TEMPLATE_BASED_PRODUCT_SCHEMA.md](./TEMPLATE_BASED_PRODUCT_SCHEMA.md) for detailed documentation.

## Changes Made

### 1. NgRx Store for Products
Created complete NgRx store structure following the existing pattern:

**Files Created:**
- `mscan-client/src/app/store/products/products.models.ts` - Product state and flexible data models
  - **Flexible Schema Support**: Product model uses `[key: string]: any` to support template-based dynamic fields
  - **Core Type Safety**: Essential fields remain strongly typed
  - **Backward Compatible**: Includes legacy fields (image_url, product_sku, description)
- `mscan-client/src/app/store/products/products.actions.ts` - NgRx actions (load, create, update, delete)
- `mscan-client/src/app/store/products/products.reducer.ts` - State reducer
- `mscan-client/src/app/store/products/products.selectors.ts` - State selectors
- `mscan-client/src/app/store/products/products.effects.ts` - Side effects for API calls
- `mscan-client/src/app/store/products/products.facade.ts` - Facade service for easy state access
- `mscan-client/src/app/store/products/index.ts` - Barrel export file

**Store Integration:**
- Updated `app.state.ts` to include products state
- Updated `app.reducers.ts` to include products reducer
- Updated `app.effects.ts` to include products effects

### 2. Product Detail/View Component
Created a new read-only view component for product details:

**Files Created:**
- `mscan-client/src/app/components/products/product-detail.component.ts`
- `mscan-client/src/app/components/products/product-detail.component.html`
- `mscan-client/src/app/components/products/product-detail.component.css`

**Features:**
- Displays all product information in read-only mode
- Shows product images (thumbnail and gallery)
- Displays variants, custom fields, and description sections
- Shows tags, app, and template information
- Includes "Edit" button (permission-based)
- Responsive design with clean UI

### 3. Product List Component Updates
**Updated Files:**
- `mscan-client/src/app/components/products/product-list.component.ts`
- `mscan-client/src/app/components/products/product-list.component.html`
- `mscan-client/src/app/components/products/product-list.component.css`

**Changes:**
- Migrated from direct ProductsService to ProductsFacade (NgRx)
- Added "View" button with icon for each product
- Updated to use observables (products$, loading$, error$)
- Added success message display
- Enhanced button styling with Material Icons
- Improved product actions layout

### 4. Product Form Component Updates (Edit Mode Fix)
**Updated File:**
- `mscan-client/src/app/components/products/template-product-form.component.ts`

**Key Fixes:**
- Migrated from ProductsService to ProductsFacade
- Fixed race condition in edit mode by using `combineLatestWith`
- Product data now properly waits for template to load before populating form
- Separated `populateFormWithProduct()` method for cleaner code
- Proper cleanup on component destroy
- Better error handling and success messages

**Edit Mode Flow:**
1. Component detects edit mode from route params
2. Loads product via NgRx (`productsFacade.loadProduct()`)
3. Waits for both product AND template to be loaded
4. Populates form with existing product data
5. Form fields are now correctly pre-filled with existing values

### 5. Routing Updates
**Updated File:**
- `mscan-client/src/app/app.routes.ts`

**Changes:**
- Added import for ProductDetailComponent
- Added route: `{ path: 'products/:id', component: ProductDetailComponent }`
- Maintained existing create and edit routes

## Routes Structure
```
/tenant/products              → Product List
/tenant/products/create       → Create Product (requires create_product permission)
/tenant/products/:id          → View Product Details (read-only)
/tenant/products/edit/:id     → Edit Product (requires edit_product permission)
```

## Button Actions in Product List
1. **View** (Blue) - Always visible, navigates to product detail view
2. **Edit** (Gray) - Visible if user has `edit_product` permission
3. **Delete** (Red) - Visible if user has `delete_product` permission

## Benefits

### NgRx Implementation Benefits:
- **Centralized State**: Single source of truth for product data
- **Better Performance**: Reduced API calls with caching
- **Predictable State**: Clear action → reducer → state flow
- **Better Testing**: Easier to test with isolated state management
- **Consistent Pattern**: Follows existing store pattern (templates, verification-apps, etc.)

### Edit Mode Fix:
- **Resolved Race Condition**: Template loads before form population
- **Proper Data Binding**: All fields correctly pre-filled in edit mode
- **Better UX**: No flickering or empty fields when editing
- **Cleaner Code**: Separated concerns with dedicated methods

### View Feature:
- **Read-Only Access**: Users can view product details without edit permissions
- **Complete Information**: Shows all product data including images, variants, specs
- **Better Navigation**: Clear separation between view and edit modes
- **Permission-Based**: Edit button only shown if user has permission

## Usage

### For Developers:
```typescript
// Inject ProductsFacade in any component
constructor(private productsFacade: ProductsFacade) {}

// Load all products
this.productsFacade.loadProducts({ search: 'paint', app_id: 'app123' });

// Load single product
this.productsFacade.loadProduct('product-id');

// Subscribe to products
this.productsFacade.products$.subscribe(products => {
  console.log(products);
});

// Create product
this.productsFacade.createProduct(productRequest);

// Update product
this.productsFacade.updateProduct(productId, productRequest);

// Delete product
this.productsFacade.deleteProduct(productId);
```

### For Users:
1. Navigate to Products page
2. Click "View" to see product details (read-only)
3. Click "Edit" to modify product (opens form with pre-filled data)
4. Click "Delete" to remove product (with confirmation)

## Testing Checklist
- [ ] Create new product - works correctly
- [ ] View product details - displays all information
- [ ] Edit existing product - form pre-fills with current values
- [ ] Update product - saves changes correctly
- [ ] Delete product - removes product successfully
- [ ] Permissions - buttons show/hide based on user permissions
- [ ] Loading states - spinners display during API calls
- [ ] Error handling - errors display properly
- [ ] Success messages - confirmations show after actions

## Notes

### Product Model Architecture
- **Flexible Schema**: Product interface uses `[key: string]: any` to support template-based dynamic fields
  - Different templates = different product schemas
  - Paint products have different fields than Electronics products
  - Schema adapts based on the associated template

- **Backward Compatibility**:
  - Legacy Product model in `rewards.model.ts` still used by CouponCreate
  - New Product model includes legacy fields (image_url, product_sku, description)
  - Old products without templates continue to work

- **Type Safety Balance**:
  - Core fields are strongly typed (product_name, template_id, etc.)
  - Template-specific fields are accessed via optional chaining
  - Example: `product.attributes?.custom_fields?.brand`

### Best Practices
- All components should prefer using ProductsFacade over ProductsService for new features
- The edit mode fix resolves the issue where products weren't displaying in edit format
- Always use optional chaining when accessing template-specific fields
- See [TEMPLATE_BASED_PRODUCT_SCHEMA.md](./TEMPLATE_BASED_PRODUCT_SCHEMA.md) for detailed architecture

## Migration Path
Components currently using ProductsService directly should gradually migrate to ProductsFacade:
1. Inject ProductsFacade instead of ProductsService
2. Use observables from facade instead of direct API calls
3. Dispatch actions for create/update/delete operations
4. Subscribe to state for data and loading/error states
