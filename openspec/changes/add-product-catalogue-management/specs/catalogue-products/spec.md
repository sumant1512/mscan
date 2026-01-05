# Catalogue Products Specification

## ADDED Requirements

### Requirement: Product CRUD Operations
The system SHALL provide complete Create, Read, Update, Delete operations for products with tenant isolation.

#### Scenario: Create product successfully
- **WHEN** tenant user creates product with name "iPhone 15", SKU "APL-IP15-001", price 999.99
- **THEN** system creates product with unique ID
- **AND** product is associated with tenant
- **AND** product is marked as active by default

#### Scenario: Create product without SKU
- **WHEN** tenant user creates product without specifying SKU
- **THEN** system allows creation
- **AND** product_sku is null

#### Scenario: Prevent duplicate SKU per tenant
- **WHEN** tenant user tries to create product with SKU that already exists for their tenant
- **THEN** system returns error "A product with this SKU already exists"
- **AND** product is not created

#### Scenario: Allow same SKU across different tenants
- **WHEN** Tenant A has product with SKU "PROD-001"
- **AND** Tenant B creates product with SKU "PROD-001"
- **THEN** system allows creation
- **AND** both tenants have isolated products with same SKU

#### Scenario: Update product information
- **WHEN** tenant user updates product price from 999.99 to 899.99
- **THEN** system updates the product
- **AND** validates SKU uniqueness if SKU is changed
- **AND** updates updated_at timestamp

#### Scenario: Delete product without coupons
- **WHEN** tenant user deletes product that has no coupons
- **THEN** system deletes product successfully
- **AND** returns success message

#### Scenario: Prevent product deletion with coupons
- **WHEN** tenant user tries to delete product that is linked to 5 coupons
- **THEN** system returns error indicating coupons reference this product
- **AND** product is not deleted
- **AND** coupons remain unchanged

### Requirement: Product-Category Association
The system SHALL allow products to be associated with categories.

#### Scenario: Create product with category
- **WHEN** tenant user creates product with category_id 3
- **THEN** system links product to category
- **AND** category_id is stored as foreign key

#### Scenario: Create product without category
- **WHEN** tenant user creates product without specifying category
- **THEN** system allows creation
- **AND** category_id is null

#### Scenario: Update product category
- **WHEN** tenant user changes product category from "Electronics" to "Accessories"
- **THEN** system updates category_id
- **AND** product appears in new category list

#### Scenario: Handle deleted category
- **WHEN** category is deleted
- **THEN** products with that category_id have category_id set to NULL
- **AND** products remain in database

### Requirement: Product Listing with Search and Filters
The system SHALL provide paginated product listing with search, category filtering, and sorting.

#### Scenario: List all products for tenant
- **WHEN** tenant user requests product list
- **THEN** system returns products for that tenant only
- **AND** includes pagination metadata
- **AND** orders by product_name ascending by default

#### Scenario: Search products by name or SKU
- **WHEN** tenant user searches for "phone"
- **THEN** system returns products with name or SKU containing "phone" (case-insensitive)
- **AND** matches "iPhone", "Smartphone", etc.

#### Scenario: Filter products by category
- **WHEN** tenant user filters by category_id 5
- **THEN** system returns only products in that category
- **AND** does not return products from other categories or tenants

#### Scenario: View single product details
- **WHEN** tenant user views product details for ID 10
- **THEN** system returns complete product information
- **AND** only if product belongs to requesting tenant

### Requirement: Product Pricing and Currency
The system SHALL support product pricing with multiple currencies.

#### Scenario: Set product price with currency
- **WHEN** tenant user sets product price to 999.99 with currency "USD"
- **THEN** system stores price as DECIMAL(10,2)
- **AND** stores currency as 3-character code

#### Scenario: Use default currency
- **WHEN** tenant user sets price without specifying currency
- **THEN** system defaults to "USD"

#### Scenario: Support multiple currencies
- **WHEN** tenant creates products with currencies USD, EUR, GBP, INR
- **THEN** system accepts all standard 3-letter currency codes

### Requirement: Product Images
The system SHALL support product image URLs for visual representation.

#### Scenario: Add product with image URL
- **WHEN** tenant user creates product with image_url "https://example.com/product.jpg"
- **THEN** system stores image URL
- **AND** frontend displays image in product card

#### Scenario: Create product without image
- **WHEN** tenant user creates product without image_url
- **THEN** system allows creation
- **AND** frontend displays placeholder icon

### Requirement: Product Active Status
The system SHALL support active/inactive status for products to control availability.

#### Scenario: Create active product by default
- **WHEN** tenant user creates product without specifying status
- **THEN** system sets is_active to true

#### Scenario: Deactivate product
- **WHEN** tenant user sets product is_active to false
- **THEN** system updates status
- **AND** product does not appear in coupon creation dropdowns
- **AND** existing coupons keep their product_id

### Requirement: Tenant Isolation
The system SHALL enforce strict tenant isolation for all product operations.

#### Scenario: Prevent cross-tenant product access
- **WHEN** Tenant A user tries to access Tenant B's product
- **THEN** system returns "Product not found"
- **AND** does not expose product data

#### Scenario: Prevent cross-tenant product modification
- **WHEN** Tenant A user tries to update Tenant B's product
- **THEN** system returns error
- **AND** product remains unchanged

#### Scenario: List products filtered by tenant
- **WHEN** authenticated tenant user requests product list
- **THEN** system automatically filters by tenant_id from JWT token
- **AND** returns only products belonging to that tenant

### Requirement: Product Description
The system SHALL support optional text descriptions for products.

#### Scenario: Add product description
- **WHEN** tenant user creates product with description "Latest model with advanced features"
- **THEN** system stores description as TEXT field
- **AND** displays in product details view

#### Scenario: Update product description
- **WHEN** tenant user updates product description
- **THEN** system saves new description
- **AND** updated_at timestamp is updated
