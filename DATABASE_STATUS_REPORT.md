# Database Setup Files - Status Report

**Date**: 2026-02-15
**Status**: ✅ CONSOLIDATED

---

## Current Database Files

### 1. Main Setup File (RECOMMENDED FOR FRESH INSTALLATIONS)
**File**: `mscan-server/database/full_setup.sql`
- **Size**: 1,421 lines
- **Purpose**: Complete database setup for fresh installations
- **Contents**:
  - ✅ Extensions (uuid-ossp, pg_trgm)
  - ✅ Enums (batch_status)
  - ✅ Trigger functions (update_updated_at_column)
  - ✅ All tables (tenants, users, products, coupons, scans, etc.)
  - ✅ All indexes
  - ✅ All foreign keys
  - ✅ All constraints
  - ✅ Permissions system
  - ✅ Multi-app architecture
  - ✅ Template system (JSONB)
  - ✅ Tags system
  - ✅ Credit system
  - ✅ Inventory management

**Usage**:
```bash
# For fresh database setup
npm run db:reset  # Drops and recreates database
npm run db:setup  # Runs full_setup.sql
```

---

### 2. Migration File for Existing Databases
**File**: `mscan-server/database/APPLY_TENANT_SCHEMA_FIXES.sql`
- **Size**: 149 lines
- **Purpose**: Apply fixes to existing databases (NOT for fresh installations)
- **Contents**:
  - Adds foreign key constraint for tenants.created_by
  - Adds index for created_by
  - Updates existing tenants with created_by
  - Removes duplicate contact_name column
  - Verification checks

**Usage**:
```bash
# Only run this on existing databases that need updates
psql -h localhost -U postgres -d mscan_db -f database/APPLY_TENANT_SCHEMA_FIXES.sql
```

**⚠️ IMPORTANT**: This is ONLY for existing databases. Fresh installations should use `full_setup.sql`.

---

### 3. Seed Data (Optional)
**File**: `mscan-server/database/seeds/001_create_sample_templates.sql`
- **Size**: 308 lines
- **Purpose**: Create sample product templates and tags for testing/demo
- **Contents**:
  - Wall Paint & Coating template
  - T-Shirt & Apparel template
  - 10 sample tags (5 for paint, 5 for apparel)

**Usage**:
```bash
# Optional - only for demo/testing
psql -h localhost -U postgres -d mscan_db -f database/seeds/001_create_sample_templates.sql
```

---

## NPM Scripts (New) ✅

### Added Scripts for Easy Execution

**1. Apply Schema Fixes**
```bash
npm run db:apply-fixes
```
- Runs `APPLY_TENANT_SCHEMA_FIXES.sql`
- JavaScript wrapper with error handling
- Shows detailed progress and verification
- **File**: `database/apply-schema-fixes.js`

**2. Seed Sample Templates**
```bash
npm run db:seed
```
- Runs `seeds/001_create_sample_templates.sql`
- Creates Wall Paint & T-Shirt templates
- Creates 10 sample tags
- JavaScript wrapper with error handling
- Shows detailed progress and verification
- **File**: `database/seed-templates.js`

**3. Force Seed (if templates exist)**
```bash
npm run db:seed:force
```
- Same as `db:seed` but skips existence check
- Useful for re-seeding

### All Database Scripts
```bash
npm run db:setup          # Full setup (fresh installation)
npm run db:reset          # Drop and recreate database
npm run db:apply-fixes    # Apply schema fixes (existing DB) ✨ NEW
npm run db:seed           # Seed sample templates ✨ NEW
npm run db:seed:force     # Force seed ✨ NEW
npm run db:drop           # Drop database
npm run db:clean-tenant   # Clean tenant data
npm run db:clean-all      # Clean all data
npm run db:check          # Check schema
npm run test:db           # Test database health
```

---

## Deleted Migration Files ✅

The following migration files have been **deleted** and their changes are now **consolidated** into `full_setup.sql`:

### Previously Deleted (20 migration files):
1. ✅ `003_dynamic_product_attributes.sql` - Now in full_setup.sql
2. ✅ `004_seed_system_templates.sql` - Now in full_setup.sql
3. ✅ `004_template_based_products.sql` - Now in full_setup.sql
4. ✅ `005_add_performance_indexes.sql` - Now in full_setup.sql
5. ✅ `006_add_inventory_management.sql` - Now in full_setup.sql
6. ✅ `007_rename_default_template_id_to_template_id.sql` - Now in full_setup.sql
7. ✅ `008_standardize_template_field_names.sql` - Now in full_setup.sql
8. ✅ `009_add_attributes_jsonb_to_products.sql` - Now in full_setup.sql
9. ✅ `010_create_wall_paint_template.sql` - Now in seeds/001_create_sample_templates.sql
10. ✅ `011_simplify_wall_paint_template.sql` - Now in full_setup.sql
11. ✅ `012_add_verification_app_id_to_products.sql` - Now in full_setup.sql
12. ✅ `013_standardize_template_name_column.sql` - Now in full_setup.sql
13. ✅ `014_add_variant_config_custom_fields.sql` - Now in full_setup.sql
14. ✅ `015_create_tags_table.sql` - Now in full_setup.sql
15. ✅ `016_remove_product_sku_description.sql` - Now in full_setup.sql
16. ✅ `017_add_products_attributes_column.sql` - Now in full_setup.sql
17. ✅ `20260117_create_permission_system.sql` - Now in full_setup.sql
18. ✅ `20260117_rollback_permission_system.sql` - Not needed
19. ✅ `add-multi-app-architecture.sql` - Now in full_setup.sql
20. ✅ `fix-category-unique-constraint.sql` - Now in full_setup.sql

### Associated Migration Scripts (Also Deleted):
- ✅ `apply-migration-013.js`
- ✅ `apply-migration-014.js`
- ✅ `apply-migration-015.js`
- ✅ `apply-migration-016.js`
- ✅ `apply-migration-017.js`
- ✅ `check-products-schema.js`
- ✅ `MIGRATIONS_README.md`
- ✅ `run-migration-013.sh`
- ✅ Various `run-*.js` files

---

## Database Schema Summary

### Tables in full_setup.sql (Complete List):

#### Core Tables
1. **tenants** - Multi-tenant architecture
2. **users** - User authentication and authorization
3. **permissions** - Permission system
4. **permission_assignments** - User/tenant permission mappings

#### Verification & Apps
5. **verification_apps** - Verification application configurations
6. **products** - Product catalog with JSONB attributes
7. **product_templates** - JSONB-based product templates
8. **tags** - Tag system for categorization
9. **product_tags** - Many-to-many relationship

#### Rewards & Coupons
10. **coupons** - Coupon management (3 discount types)
11. **scans** - QR code scan tracking with location
12. **batches** - Batch generation
13. **campaigns** - Campaign management

#### Credits
14. **credit_requests** - Credit request workflow (UUID-based)
15. **credit_transactions** - Transaction history (UUID-based)

#### Inventory (if enabled)
16. **inventory** - Stock management
17. **inventory_transactions** - Inventory movement history

### Key Features

#### UUID Primary Keys ✅
All tables use UUID primary keys (not integers):
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- Prevents sequential ID guessing
- Better for distributed systems

#### JSONB Fields ✅
- `product_templates.variant_config` - Dynamic variant configuration
- `product_templates.custom_fields` - Custom field definitions
- `products.attributes` - Product-specific attributes
- Flexible schema for different product types

#### Snake_Case Naming ✅
All columns use snake_case:
- `full_name` (not fullName)
- `scanned_at` (not scan_timestamp)
- `latitude`/`longitude` (not location_lat/location_lng)
- Consistent with PostgreSQL conventions

#### Proper Indexes ✅
Performance indexes on:
- Foreign keys
- Search fields (email, tenant_id)
- Timestamp fields (created_at, updated_at)
- JSONB fields (GIN indexes)

#### Constraints ✅
- Foreign key constraints with ON DELETE actions
- Check constraints for enums
- Unique constraints
- NOT NULL constraints

---

## Recommendation: Use Single Setup File ✅

### For Fresh Installations
**Use**: `full_setup.sql`

```bash
# Complete setup from scratch
npm run db:reset   # Drops database if exists
npm run db:setup   # Creates database and runs full_setup.sql

# Optional: Add sample templates for testing/demo
npm run db:seed
```

This single file contains **everything**:
- All schema changes from all migrations
- All performance optimizations
- All bug fixes
- Complete and tested schema

### For Existing Databases
**Use**: `APPLY_TENANT_SCHEMA_FIXES.sql` (only if needed)

```bash
# Apply schema fixes to existing database
npm run db:apply-fixes

# Optional: Add sample templates
npm run db:seed
```

This file only contains:
- Tenant schema fixes (created_by, contact_name)
- Can be run safely on existing databases
- Idempotent (safe to run multiple times)

---

## No Update Queries Needed ✅

**Good News**: There are **NO** separate update queries.

All changes are either:
1. **In full_setup.sql** - For fresh installations
2. **In APPLY_TENANT_SCHEMA_FIXES.sql** - For existing databases (optional)

The migration approach has been **consolidated** into a single setup file.

---

## Verification

### Check Current Schema
```bash
# Connect to database
psql -h localhost -U postgres -d mscan_db

# List all tables
\dt

# Check table structure
\d tenants
\d users
\d products
\d coupons

# Verify UUID types
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'credit_requests'
AND column_name IN ('id', 'requested_by', 'processed_by');
```

Expected output for UUID verification:
```
  column_name  | data_type
---------------+-----------
 id            | uuid
 requested_by  | uuid
 processed_by  | uuid
```

---

## Summary

✅ **Database Setup Files**: 3 total
1. `full_setup.sql` - Main setup (1,421 lines) - **USE THIS FOR FRESH INSTALLATIONS**
2. `APPLY_TENANT_SCHEMA_FIXES.sql` - Migration for existing DBs (149 lines) - **OPTIONAL**
3. `seeds/001_create_sample_templates.sql` - Sample data (308 lines) - **OPTIONAL**

✅ **Migration Files**: 0 (all consolidated into full_setup.sql)

✅ **Update Queries**: 0 (everything in setup files)

✅ **Schema Status**: Complete and production-ready

✅ **UUID Types**: All ID fields properly typed as UUID

✅ **Naming Convention**: Consistent snake_case throughout

---

## Next Steps

1. **For Fresh Installation**:
   ```bash
   npm run db:reset
   npm run db:setup
   ```

2. **Optional - Add Sample Data**:
   ```bash
   psql -h localhost -U postgres -d mscan_db -f database/seeds/001_create_sample_templates.sql
   ```

3. **Verify Setup**:
   ```bash
   npm run db:test  # Or check health endpoint
   curl http://localhost:3000/health
   ```

Your database setup is **clean, consolidated, and production-ready**! ✅
