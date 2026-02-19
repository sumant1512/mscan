# Database Scripts - Usage Guide

**Complete guide to all database setup and management scripts**

---

## Quick Reference

### Fresh Installation (Recommended)
```bash
npm run db:reset    # Drop and recreate database
npm run db:setup    # Run full setup
npm run db:seed     # Add sample templates (optional)
```

### Existing Database
```bash
npm run db:apply-fixes  # Apply tenant schema fixes
npm run db:seed         # Add sample templates (optional)
```

---

## Available Scripts

### 1. Database Setup (Fresh Installation)

#### `npm run db:setup`
**Purpose**: Create complete database schema from scratch

**What it does**:
- Creates all tables (tenants, users, products, coupons, etc.)
- Creates all indexes for performance
- Creates all foreign key constraints
- Sets up permissions system
- Configures multi-app architecture
- Initializes template system (JSONB)
- Sets up credit system with UUID types

**When to use**:
- First-time installation
- After `npm run db:reset`
- Clean database setup

**File executed**: `database/full_setup.sql` (1,421 lines)

**Example**:
```bash
npm run db:setup
```

**Output**:
```
✅ Database connection successful!
✅ Extensions created (uuid-ossp, pg_trgm)
✅ Tables created (17 tables)
✅ Indexes created
✅ Constraints applied
✅ Database setup complete!
```

---

#### `npm run db:reset`
**Purpose**: Drop and recreate database completely

**What it does**:
- Drops the entire database (⚠️ WARNING: ALL DATA LOST)
- Creates fresh database
- Runs full setup automatically

**When to use**:
- Starting completely fresh
- Development/testing environment only
- **NEVER in production**

**Example**:
```bash
npm run db:reset
```

**⚠️ WARNING**: This will delete all data permanently!

---

### 2. Schema Updates (Existing Database)

#### `npm run db:apply-fixes`
**Purpose**: Apply tenant schema fixes to existing database

**What it does**:
- Adds foreign key constraint for `tenants.created_by`
- Adds index for `created_by` column
- Updates existing tenants with `created_by` value
- Removes duplicate `contact_name` column
- Runs verification checks

**When to use**:
- Updating existing database from older version
- After migration from previous schema
- **NOT needed for fresh installations** (already in full_setup.sql)

**File executed**: `database/APPLY_TENANT_SCHEMA_FIXES.sql` (149 lines)

**Example**:
```bash
npm run db:apply-fixes
```

**Output**:
```
╔═══════════════════════════════════════════════════════╗
║       Applying Tenant Schema Fixes                   ║
╚═══════════════════════════════════════════════════════╝

📁 Reading SQL file...
🔧 Applying schema fixes...

NOTICE: Added foreign key constraint fk_tenants_created_by
NOTICE: Updated 3 tenant(s) with created_by = abc123...
NOTICE: Removed contact_name column from tenants table

✅ Schema fixes applied successfully!

🔍 Verifying changes...

Sample tenant data:
  1. Acme Corp (created by: Super Admin)
  2. TechStart Inc (created by: Super Admin)
  3. BuildCo (created by: Super Admin)

✨ All done!
```

**Safe to run multiple times**: Yes (idempotent)

---

### 3. Seed Data (Optional)

#### `npm run db:seed`
**Purpose**: Add sample product templates and tags

**What it does**:
- Creates "Wall Paint & Coating" template
- Creates "T-Shirt & Apparel" template
- Creates 10 sample tags (5 for paint, 5 for apparel)
- Uses first available tenant
- Creates sample verification app if needed

**When to use**:
- Development/testing
- Demo environments
- Learning the template system
- **Optional** - not required for production

**File executed**: `database/seeds/001_create_sample_templates.sql` (308 lines)

**Example**:
```bash
npm run db:seed
```

**Output**:
```
╔═══════════════════════════════════════════════════════╗
║       Seeding Sample Product Templates               ║
╚═══════════════════════════════════════════════════════╝

✅ Found 1 tenant(s) in database

📁 Reading seed SQL file...
🌱 Seeding templates and tags...

NOTICE: Using Tenant ID: abc123...
NOTICE: Using App ID: def456...
NOTICE: Created Wall Paint Template: xyz789...
NOTICE: Created 5 tags for Paint products
NOTICE: Created T-Shirt Template: uvw321...
NOTICE: Created 5 tags for T-Shirt products

✅ Sample templates seeded successfully!

🔍 Verifying seeded data...

Seeded templates:
  1. T-Shirt & Apparel (apparel)
     Description: Template for t-shirts and clothing with size and color variants
     Tags: 5
  2. Wall Paint & Coating (paint)
     Description: Template for wall paints and coatings with pack size variants
     Tags: 5

📊 Summary:
  • Templates created: 2
  • Tags created: 10

╔═══════════════════════════════════════════════════════╗
║            Seeding Complete                          ║
╚═══════════════════════════════════════════════════════╝

✨ You can now use these templates to create products!
```

**Prerequisites**:
- Database must exist and be set up
- At least one tenant must exist

**If templates already exist**:
```bash
⚠️  Found 2 existing template(s)

This will add 2 more templates (Wall Paint & T-Shirt).

Run with --force to proceed anyway, or Ctrl+C to cancel.
```

---

#### `npm run db:seed:force`
**Purpose**: Force seed even if templates exist

**Example**:
```bash
npm run db:seed:force
```

**Use case**: When you want to add templates even if some already exist

---

### 4. Database Management

#### `npm run db:drop`
**Purpose**: Drop database (⚠️ DANGEROUS)

**What it does**:
- Drops the entire database
- All data is permanently lost

**When to use**:
- Development only
- Before `db:reset`
- **NEVER in production**

---

#### `npm run db:clean-tenant`
**Purpose**: Clean tenant-specific data

**What it does**:
- Removes tenant data while keeping structure
- Preserves database schema

---

#### `npm run db:clean-all`
**Purpose**: Clean all data

**What it does**:
- Removes all data from all tables
- Preserves database structure

---

### 5. Database Testing

#### `npm run db:check`
**Purpose**: Check database schema

**What it does**:
- Verifies table structures
- Checks column definitions
- Validates constraints

---

#### `npm run test:db`
**Purpose**: Test database health

**What it does**:
- Tests database connection
- Checks response time
- Verifies basic queries

---

## Common Workflows

### Workflow 1: Fresh Installation
```bash
# Step 1: Reset database (drops and recreates)
npm run db:reset

# Step 2: Setup complete schema
npm run db:setup

# Step 3 (Optional): Add sample templates
npm run db:seed

# Step 4: Verify
npm run test:db
```

**Result**: Clean database with sample data ready to use

---

### Workflow 2: Update Existing Database
```bash
# Step 1: Apply schema fixes
npm run db:apply-fixes

# Step 2 (Optional): Add sample templates
npm run db:seed

# Step 3: Verify
npm run test:db
```

**Result**: Updated database with latest schema

---

### Workflow 3: Production Setup
```bash
# Step 1: Setup complete schema (one-time only)
npm run db:setup

# Step 2: Verify
npm run test:db

# DO NOT run db:seed in production
# Create your own templates through the UI
```

**Result**: Production-ready database

---

## File Locations

```
mscan-server/
└── database/
    ├── full_setup.sql                    # Main setup (1,421 lines)
    ├── APPLY_TENANT_SCHEMA_FIXES.sql     # Schema fixes (149 lines)
    ├── db-manager.js                     # Database manager
    ├── apply-schema-fixes.js             # Schema fixes runner ✨ NEW
    ├── seed-templates.js                 # Template seeder ✨ NEW
    └── seeds/
        └── 001_create_sample_templates.sql  # Sample data (308 lines)
```

---

## Script Implementation Details

### apply-schema-fixes.js
**Features**:
- ✅ Connects to PostgreSQL database
- ✅ Reads and executes SQL file
- ✅ Shows detailed progress messages
- ✅ Displays PostgreSQL notices
- ✅ Verifies changes after execution
- ✅ Shows sample tenant data
- ✅ Comprehensive error handling
- ✅ Helpful troubleshooting tips

**Technologies**:
- Node.js
- pg (PostgreSQL driver)
- fs (file system)
- dotenv (environment variables)

---

### seed-templates.js
**Features**:
- ✅ Checks for existing tenants
- ✅ Prevents duplicate seeding (unless --force)
- ✅ Creates verification app if needed
- ✅ Shows detailed progress messages
- ✅ Displays PostgreSQL notices
- ✅ Verifies seeded data
- ✅ Shows summary statistics
- ✅ Comprehensive error handling
- ✅ Helpful prerequisites check

**Technologies**:
- Node.js
- pg (PostgreSQL driver)
- fs (file system)
- dotenv (environment variables)

---

## Environment Variables

Both scripts use these environment variables from `.env`:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mscan_db
DB_USER=postgres
DB_PASSWORD=admin
```

**Defaults** (if not set):
- Host: `localhost`
- Port: `5432`
- Database: `mscan_db`
- User: `postgres`
- Password: `admin`

---

## Error Handling

### Common Errors

#### 1. "No tenant found"
**Error**: Cannot seed templates without tenants

**Solution**:
```bash
# Option 1: Run fresh setup
npm run db:reset

# Option 2: Create tenant through UI or API
```

---

#### 2. "Connection refused"
**Error**: Cannot connect to PostgreSQL

**Solution**:
1. Check if PostgreSQL is running
2. Verify credentials in `.env`
3. Check firewall settings
4. Test connection: `psql -h localhost -U postgres -d mscan_db`

---

#### 3. "Templates already exist"
**Error**: Seed script won't overwrite existing templates

**Solution**:
```bash
# Force seeding anyway
npm run db:seed:force

# OR start fresh
npm run db:reset
npm run db:seed
```

---

## Verification

### After Setup
```bash
# Connect to database
psql -h localhost -U postgres -d mscan_db

# List all tables
\dt

# Check tenant schema
\d tenants

# Verify created_by column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tenants'
AND column_name = 'created_by';

# Check templates
SELECT template_name, industry_type FROM product_templates;

# Check tags
SELECT name, description FROM tags LIMIT 10;
```

---

## Summary

### Fresh Installation
```bash
npm run db:reset       # Drop & recreate
npm run db:setup       # Full setup
npm run db:seed        # Sample data (optional)
```

### Existing Database
```bash
npm run db:apply-fixes # Apply schema fixes
npm run db:seed        # Sample data (optional)
```

### Production
```bash
npm run db:setup       # One-time setup
# No seeding in production
```

---

## Support

If you encounter issues:

1. **Check PostgreSQL status**: `pg_ctl status`
2. **Verify credentials**: Check `.env` file
3. **Test connection**: `psql -h localhost -U postgres -d mscan_db`
4. **Check logs**: Look at script output for specific errors
5. **Fresh start**: `npm run db:reset` (development only)

---

**All scripts are production-ready and include comprehensive error handling!** ✅
