# Change: Add Product Catalogue Management System

## Why
The system needs a structured way to organize and manage products and their categories. Currently, there is no centralized product catalog, making it difficult for tenants to maintain product information, categorize items, and link products to coupons. A proper catalogue system will enable better product organization, inventory tracking, and coupon-product associations.

## What Changes
- Add **Categories Management** capability for organizing products into hierarchical classifications
- Add **Product Catalog** capability for managing product information (name, SKU, description, pricing, images)
- Add **Catalogue Navigation** in tenant UI grouping both products and categories
- Link products to categories via foreign key relationships
- Link coupons to products for targeted promotions
- **BREAKING**: Remove legacy text-based product fields (product_name, product_sku) from coupons table in favor of product_id FK

## Impact
### Affected Components
- **Database**: New tables (categories, products), modified coupons table
- **Backend**: New API endpoints for categories and products CRUD operations
- **Frontend**: New UI components for catalogue management, updated navigation structure
- **Coupons**: Modified to reference products instead of storing product info directly

### Affected Specs
- New: `catalogue-categories` - Category management capability
- New: `catalogue-products` - Product management capability  
- Modified: `tenant-coupons` - Product linkage in coupons

### Migration Required
- Database migration to create categories and products tables
- Database migration to drop product_name and product_sku columns from coupons
- Existing coupons with product text fields need manual review (no auto-migration due to data quality concerns)
