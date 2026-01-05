# Design: Product Catalogue Management

## Context
The MScan platform currently lacks a structured product catalogue system. This design introduces a two-tier hierarchy (categories → products) with proper foreign key relationships to enable organized product management and coupon-product associations.

## Goals / Non-Goals

### Goals
- Provide tenant-isolated product catalogue management
- Enable hierarchical organization via categories
- Support product-coupon linking for targeted promotions
- Maintain referential integrity with cascade/restrict rules
- Ensure data uniqueness per tenant (SKU, category names)

### Non-Goals
- Multi-level category hierarchy (only 1 level for now)
- Product variants or SKU management
- Inventory tracking or stock management
- Product pricing history or versioning
- Bulk import/export functionality (future enhancement)

## Architecture Decisions

### 1. Database Schema Design

**Decision**: Use separate tables for categories and products with foreign key relationships

**Rationale**:
- **Separation of concerns**: Categories and products have different lifecycles
- **Referential integrity**: Foreign keys ensure data consistency
- **Flexibility**: Easy to query products by category or list categories with product counts
- **Scalability**: Indexes on foreign keys improve join performance

**Schema**:
```sql
categories (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN,
  UNIQUE(tenant_id, name)
)

products (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  description TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  price DECIMAL(10,2),
  currency VARCHAR(3),
  image_url TEXT,
  is_active BOOLEAN,
  UNIQUE(tenant_id, product_sku)
)

coupons (
  ...existing fields...
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL
)
```

**Alternatives Considered**:
- **Single table with self-join**: Rejected - complex queries, harder to enforce constraints
- **JSON column for categories**: Rejected - no referential integrity, poor query performance
- **Tags/labels instead of categories**: Rejected - less structured, harder to maintain hierarchy

### 2. Tenant Isolation Strategy

**Decision**: Use tenant_id column with composite unique constraints

**Rationale**:
- Consistent with existing MScan architecture
- Enables row-level security if needed in future
- Simple to understand and maintain
- Middleware already handles tenant context

**Implementation**:
- All queries filtered by `req.user.tenant_id`
- Unique constraints: `(tenant_id, name)` for categories, `(tenant_id, product_sku)` for products
- Indexes: `(tenant_id, category_id)`, `(tenant_id, product_sku)`

### 3. Cascade vs Restrict Behavior

**Decision**: Use ON DELETE SET NULL for optional relationships, restrict for required dependencies

**Relationships**:
- `categories → products (category_id)`: **SET NULL** - products can exist without category
- `products → coupons (product_id)`: **SET NULL** - coupons can exist without product
- Application-level check: **Prevent deletion** if category has products or product has coupons

**Rationale**:
- Prevents accidental data loss
- Maintains audit trail (orphaned records indicate deletion)
- Allows gradual migration of legacy data
- User gets clear error message before deletion

### 4. Product-Coupon Relationship

**Decision**: Replace text fields (product_name, product_sku) with foreign key (product_id)

**Migration Path**:
1. Add product_id column (nullable)
2. Keep legacy product_name/product_sku temporarily
3. Run migration script (manual review recommended due to data quality)
4. Drop legacy columns after verification

**Rationale**:
- **Breaking change** justified by: data integrity, better queries, eliminates duplication
- **Backward compatibility**: Existing coupons continue to work (product_id nullable)
- **Data cleanup**: Forces review of product data quality before full migration

### 5. Frontend Navigation Structure

**Decision**: Group products and categories under "Catalogue" parent menu

**Structure**:
```
Catalogue
├── Add Category
├── View Categories
├── Add Product
└── View Products
```

**Rationale**:
- Logical grouping reduces menu clutter
- Aligns with user mental model (catalogue = products + categories)
- Consistent with "Rewards" section pattern
- Easy to expand in future (e.g., attributes, tags)

**Alternatives Considered**:
- **Nested submenus** (Catalogue → Products → Add/View): Rejected - too many clicks
- **Separate top-level items**: Rejected - increases navigation complexity

### 6. UI Consistency Patterns

**Decision**: Match empty states, search boxes, and button styles across product and category pages

**Standardized Elements**:
- Empty state: Material icon (80px), heading, description, CTA button
- Header: Title + actions wrapper with search + add button
- Search: Icon button with Material Icons
- Button: Icon + text for primary actions
- Colors: Green (#4CAF50) for primary buttons

**Rationale**:
- Reduces cognitive load for users
- Faster development (reusable CSS patterns)
- Professional appearance
- Easier maintenance

## Data Model

### Category Entity
```typescript
interface Category {
  id: number;
  tenant_id: string;
  name: string;              // Unique per tenant
  description?: string;
  icon?: string;             // Material Icon name
  is_active: boolean;
  product_count?: number;    // Computed field (JOIN)
  created_at: Date;
  updated_at: Date;
}
```

### Product Entity
```typescript
interface Product {
  id: number;
  tenant_id: string;
  product_name: string;
  product_sku?: string;      // Unique per tenant
  description?: string;
  category_id?: number;      // FK to categories
  price?: number;
  currency?: string;
  image_url?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

## API Design

### Categories Endpoints
- `GET /api/categories` - List with search, pagination
- `GET /api/categories/:id` - Single category with product count
- `POST /api/categories` - Create (validates name uniqueness)
- `PUT /api/categories/:id` - Update (checks duplicates)
- `DELETE /api/categories/:id` - Delete (prevents if products exist)

### Products Endpoints
- `GET /api/products` - List with search, pagination, category filter
- `GET /api/products/:id` - Single product
- `POST /api/products` - Create (validates SKU uniqueness)
- `PUT /api/products/:id` - Update (checks duplicate SKUs)
- `DELETE /api/products/:id` - Delete (prevents if coupons exist)

### Authentication & Authorization
All endpoints require:
- `authenticateToken` middleware
- `requireTenant` middleware (checks `req.user.tenant_id`)

## Risks / Trade-offs

### Risk: Data Migration Complexity
**Mitigation**: 
- Keep legacy columns temporarily
- Manual review process for existing coupon product data
- Clear documentation of migration steps
- Rollback plan (add columns back if needed)

### Risk: Breaking Change for Existing Integrations
**Mitigation**:
- API versioning (v1 stays compatible, v2 uses product_id)
- Grace period with deprecation warnings
- Migration guide for API consumers

### Trade-off: Performance vs Flexibility
- **Choice**: Separate tables with joins
- **Cost**: Additional JOIN queries for product-category relationships
- **Benefit**: Better data integrity, easier to extend
- **Mitigation**: Indexes on foreign keys, query optimization

### Trade-off: Strict vs Permissive Validation
- **Choice**: Strict validation (unique SKU per tenant, prevent deletion with references)
- **Cost**: More error handling in UI, potential user friction
- **Benefit**: Data quality, prevents orphaned records
- **Mitigation**: Clear error messages, bulk operations for future

## Migration Plan

### Phase 1: Schema Creation (Completed)
1. Create categories table
2. Create products table
3. Add product_id to coupons
4. Add indexes and constraints

### Phase 2: Backend Implementation (Completed)
1. Categories API endpoints
2. Products API endpoints
3. Update coupon creation to use product_id

### Phase 3: Frontend Implementation (Completed)
1. Category management UI
2. Product management UI
3. Update coupon form with product selector
4. Navigation structure

### Phase 4: Data Migration (Pending)
1. Export existing coupon product data
2. Create product records in new tables
3. Link coupons to products via product_id
4. Verify data integrity
5. Drop legacy columns

### Phase 5: Testing & Rollout (Pending)
1. Unit tests for API endpoints
2. Integration tests for workflows
3. User acceptance testing
4. Production deployment
5. Monitor for issues

### Rollback Plan
If critical issues arise:
1. Re-add product_name/product_sku columns to coupons
2. Update API to accept both product_id and text fields
3. Frontend rolls back to text inputs
4. Investigate and fix issues
5. Re-attempt migration

## Open Questions
1. Should categories support hierarchical nesting in future? (Deferred)
2. Do we need product variants (size, color)? (Deferred)
3. Should products support multiple categories? (No - keep simple)
4. What's the strategy for bulk product import? (Future enhancement)
