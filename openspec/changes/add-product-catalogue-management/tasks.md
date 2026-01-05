# Implementation Tasks

## 1. Database Schema
- [x] 1.1 Create categories table with tenant isolation
- [x] 1.2 Create products table with category_id FK
- [x] 1.3 Add product_id FK to coupons table
- [x] 1.4 Add indexes for performance (tenant_id, category_id, product_id, SKU)
- [x] 1.5 Add unique constraints (tenant+category name, tenant+product SKU)
- [x] 1.6 Drop legacy product_name and product_sku columns from coupons

## 2. Backend API - Categories
- [x] 2.1 Create CategoriesController with CRUD operations
- [x] 2.2 Implement GET /api/categories (list with search, pagination)
- [x] 2.3 Implement GET /api/categories/:id (single category with product count)
- [x] 2.4 Implement POST /api/categories (create with validation)
- [x] 2.5 Implement PUT /api/categories/:id (update with duplicate checks)
- [x] 2.6 Implement DELETE /api/categories/:id (with product reference check)
- [x] 2.7 Add authentication and tenant isolation middleware
- [x] 2.8 Mount routes in server.js

## 3. Backend API - Products
- [x] 3.1 Create ProductsController with CRUD operations
- [x] 3.2 Implement GET /api/products (list with search, pagination, category filter)
- [x] 3.3 Implement GET /api/products/:id (single product)
- [x] 3.4 Implement POST /api/products (create with SKU validation)
- [x] 3.5 Implement PUT /api/products/:id (update with duplicate SKU checks)
- [x] 3.6 Implement DELETE /api/products/:id (with coupon reference check)
- [x] 3.7 Update to use category_id instead of category text field
- [x] 3.8 Add authentication and tenant isolation middleware
- [x] 3.9 Mount routes in server.js

## 4. Backend API - Coupon Integration
- [x] 4.1 Update RewardsController to accept product_id in coupon creation
- [x] 4.2 Remove product_name and product_sku from coupon request body
- [x] 4.3 Update single coupon creation to use product_id
- [x] 4.4 Update batch coupon creation to use product_id per batch
- [x] 4.5 Update coupon INSERT queries to use product_id column

## 5. Frontend Models & Services
- [x] 5.1 Add Category interface to rewards.model.ts
- [x] 5.2 Add Product interface with category_id field
- [x] 5.3 Create CategoriesService with HTTP methods
- [x] 5.4 Create ProductsService with HTTP methods
- [x] 5.5 Update ProductsService to handle category_id

## 6. Frontend - Category Management
- [x] 6.1 Create CategoryListComponent (grid view with icons)
- [x] 6.2 Create category-list.component.html with search and empty state
- [x] 6.3 Create category-list.component.css with card styling
- [x] 6.4 Create CategoryFormComponent (create/edit)
- [x] 6.5 Create category-form.component.html with icon picker
- [x] 6.6 Create category-form.component.css
- [x] 6.7 Add Material Icons collection for category selection
- [x] 6.8 Add delete confirmation modal

## 7. Frontend - Product Management
- [x] 7.1 Create ProductListComponent (grid view)
- [x] 7.2 Create product-list.component.html with search and empty state
- [x] 7.3 Create product-list.component.css matching category page design
- [x] 7.4 Create ProductFormComponent (create/edit)
- [x] 7.5 Create product-form.component.html with category dropdown
- [x] 7.6 Create product-form.component.css
- [x] 7.7 Update ProductFormComponent to load categories
- [x] 7.8 Replace category text input with category dropdown
- [x] 7.9 Add delete confirmation modal

## 8. Frontend - Coupon Integration
- [x] 8.1 Update CouponCreateComponent to load products
- [x] 8.2 Remove product_name and product_sku form controls
- [x] 8.3 Add product_id form control
- [x] 8.4 Replace product text inputs with product dropdown (single mode)
- [x] 8.5 Replace product text inputs with product dropdown (batch mode)
- [x] 8.6 Display product name + SKU in dropdown options

## 9. Frontend - Navigation
- [x] 9.1 Add "Catalogue" parent section to tenant navigation
- [x] 9.2 Add "Add Category" menu item with route
- [x] 9.3 Add "View Categories" menu item with route
- [x] 9.4 Add "Add Product" menu item with route
- [x] 9.5 Add "View Products" menu item with route
- [x] 9.6 Update Material Icons for catalogue section

## 10. Frontend - Routes
- [x] 10.1 Import CategoryListComponent and CategoryFormComponent
- [x] 10.2 Add /tenant/categories route
- [x] 10.3 Add /tenant/categories/create route
- [x] 10.4 Add /tenant/categories/edit/:id route
- [x] 10.5 Import ProductListComponent and ProductFormComponent
- [x] 10.6 Add /tenant/products route
- [x] 10.7 Add /tenant/products/create route
- [x] 10.8 Add /tenant/products/edit/:id route

## 11. Testing & Validation
- [ ] 11.1 Test category CRUD operations via API
- [ ] 11.2 Test product CRUD operations via API
- [ ] 11.3 Test category deletion with products (should fail)
- [ ] 11.4 Test product deletion with coupons (should fail)
- [ ] 11.5 Test duplicate category name per tenant
- [ ] 11.6 Test duplicate product SKU per tenant
- [ ] 11.7 Test creating coupon with product selection
- [ ] 11.8 Verify tenant isolation for categories and products
- [ ] 11.9 Test empty states in UI
- [ ] 11.10 Test search functionality in both lists

## 12. Documentation
- [ ] 12.1 Update API documentation with new endpoints
- [ ] 12.2 Document category schema and fields
- [ ] 12.3 Document product schema and fields
- [ ] 12.4 Document coupon-product relationship
- [ ] 12.5 Create user guide for catalogue management
