# Capability: Catalogue - Categories Management

## Purpose
Provide tenant-isolated category management for organizing products into hierarchical classifications. Categories support Material Icons for visual representation, active/inactive status control, and prevent deletion when products are assigned to ensure referential integrity.

## Requirements

## ADDED Requirements

### Requirement: Category CRUD Operations
The system SHALL provide complete Create, Read, Update, Delete operations for product categories with tenant isolation.

#### Scenario: Create category successfully
- **WHEN** tenant user creates a category with name "Electronics" and icon "devices"
- **THEN** system creates category with unique ID
- **AND** category is associated with tenant
- **AND** category is marked as active by default

#### Scenario: Prevent duplicate category names per tenant
- **WHEN** tenant user tries to create category with name that already exists for their tenant
- **THEN** system returns error "A category with this name already exists"
- **AND** category is not created

#### Scenario: Allow same category name across different tenants
- **WHEN** Tenant A has category "Electronics"
- **AND** Tenant B creates category "Electronics"
- **THEN** system allows creation
- **AND** both tenants have isolated "Electronics" categories

#### Scenario: Update category information
- **WHEN** tenant user updates category name from "Electronics" to "Electronic Devices"
- **THEN** system updates the category
- **AND** validates name uniqueness for the tenant
- **AND** updates updated_at timestamp

#### Scenario: Delete category without products
- **WHEN** tenant user deletes category that has no products
- **THEN** system deletes category successfully
- **AND** returns success message

#### Scenario: Prevent category deletion with products
- **WHEN** tenant user tries to delete category that has 3 products
- **THEN** system returns error "Cannot delete category with 3 product(s)"
- **AND** category is not deleted
- **AND** products remain unchanged

### Requirement: Category Listing with Search
The system SHALL provide paginated category listing with search and filtering capabilities.

#### Scenario: List all categories for tenant
- **WHEN** tenant user requests category list
- **THEN** system returns categories for that tenant only
- **AND** includes product_count for each category (computed field)
- **AND** orders by category name ascending
- **AND** includes pagination metadata

#### Scenario: Search categories by name
- **WHEN** tenant user searches for "elec"
- **THEN** system returns categories with names matching "elec" (case-insensitive)
- **AND** matches "Electronics", "Electrical", etc.
- **AND** does not return categories from other tenants

#### Scenario: View single category with product count
- **WHEN** tenant user views category details for ID 5
- **THEN** system returns category information
- **AND** includes count of products in that category
- **AND** only if category belongs to requesting tenant

### Requirement: Category Icons
The system SHALL support Material Icons for visual category representation.

#### Scenario: Select icon from predefined list
- **WHEN** tenant user creates category with icon "shopping_cart"
- **THEN** system stores icon name
- **AND** frontend displays Material Icon with name "shopping_cart"

#### Scenario: Use default icon when not specified
- **WHEN** tenant user creates category without specifying icon
- **THEN** system uses "category" as default icon
- **AND** frontend displays default category icon

### Requirement: Category Active Status
The system SHALL support active/inactive status for categories to control visibility.

#### Scenario: Create active category by default
- **WHEN** tenant user creates category without specifying status
- **THEN** system sets is_active to true

#### Scenario: Deactivate category
- **WHEN** tenant user sets category is_active to false
- **THEN** system updates status
- **AND** category does not appear in product form dropdowns
- **AND** existing products keep their category_id

#### Scenario: Filter active categories
- **WHEN** product form loads category dropdown
- **THEN** system returns only active categories
- **AND** inactive categories are excluded

### Requirement: Tenant Isolation
The system SHALL enforce strict tenant isolation for all category operations.

#### Scenario: Prevent cross-tenant category access
- **WHEN** Tenant A user tries to access Tenant B's category
- **THEN** system returns "Category not found"
- **AND** does not expose category data

#### Scenario: Prevent cross-tenant category modification
- **WHEN** Tenant A user tries to update Tenant B's category
- **THEN** system returns error
- **AND** category remains unchanged

#### Scenario: List categories filtered by tenant
- **WHEN** authenticated tenant user requests category list
- **THEN** system automatically filters by tenant_id from JWT token
- **AND** returns only categories belonging to that tenant
