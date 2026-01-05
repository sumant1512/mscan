# Tenant Coupons Specification (Product Integration)

## MODIFIED Requirements

### Requirement: Coupon Creation with Product Association
The system SHALL allow coupons to be linked to products from the catalogue instead of storing product information as text.

**Changes**:
- Added product_id foreign key to link coupons to products table
- Removed product_name and product_sku text fields
- Updated coupon creation API to accept product_id

#### Scenario: Create coupon linked to product
- **WHEN** tenant user creates coupon with product_id 15
- **THEN** system creates coupon with product_id FK reference
- **AND** coupon displays product information from products table

#### Scenario: Create coupon without product
- **WHEN** tenant user creates coupon without specifying product_id
- **THEN** system allows creation
- **AND** product_id is null

#### Scenario: Select product from dropdown in coupon form (single mode)
- **WHEN** tenant user opens coupon creation form
- **THEN** form displays dropdown of active products with "Name (SKU)" format
- **AND** selecting product sets product_id in form

#### Scenario: Select product per batch in multi-batch mode
- **WHEN** tenant user creates multiple coupon batches
- **THEN** each batch can have different product_id
- **AND** dropdown shows same product list for each batch

#### Scenario: Handle deleted product
- **WHEN** product linked to coupon is deleted
- **THEN** coupon.product_id is set to NULL
- **AND** coupon remains in database
- **AND** displays "Product Removed" or similar indicator

### Requirement: Batch Coupon Creation with Products
The system SHALL support product selection in batch coupon generation.

#### Scenario: Create batch with product assignment
- **WHEN** tenant creates batch of 50 coupons for product_id 12
- **THEN** all 50 coupons in batch are linked to product_id 12
- **AND** batch metadata includes product information

#### Scenario: Create multi-batch with different products
- **WHEN** tenant creates 3 batches: Batch 1 (20 coupons, product_id 5), Batch 2 (30 coupons, product_id 8), Batch 3 (10 coupons, no product)
- **THEN** system creates all batches correctly
- **AND** each coupon has appropriate product_id

## REMOVED Requirements

### Requirement: Product Name and SKU as Text Fields
**Reason**: Replaced with foreign key relationship to products table for better data integrity and normalization.

**Migration**: Existing coupons with text-based product data need manual review. Legacy columns were dropped after product_id column was added.

#### Former Scenario: Store product name with coupon (REMOVED)
- This functionality is replaced by product_id FK relationship
- Product information is now retrieved via JOIN query

#### Former Scenario: Store product SKU with coupon (REMOVED)
- This functionality is replaced by product_id FK relationship
- SKU is accessed through products table
