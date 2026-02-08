# Database Migrations Guide

This guide explains how to manage database migrations for the MScan project.

## Available Commands

### 1. Run Pending Migrations
```bash
npm run migrate
```
- Runs only new migrations that haven't been executed yet
- Safe to run multiple times (idempotent)
- Tracks which migrations have been run in the `migrations` table

### 2. Reset Database
```bash
npm run migrate:reset
```
- **⚠️ WARNING: Destructive operation!**
- Drops the entire database
- Creates a fresh database
- Runs all migrations from scratch
- Use when you want a completely clean slate

### 3. Fresh Migration
```bash
npm run migrate:fresh
```
- **⚠️ WARNING: Deletes all data!**
- Truncates all tables (keeps database structure)
- Clears migration tracking
- Re-runs all migrations
- Faster than reset (doesn't drop/recreate DB)

### 4. Check Migration Status
```bash
npm run migrate:status
```
- Shows which migrations have been executed
- Shows pending migrations
- Non-destructive, safe to run anytime

### 5. Legacy Migration (Old Script)
```bash
npm run migrate:legacy
```
- Runs the old migration script
- Kept for backward compatibility
- Use the new `npm run migrate` instead

## Migration Workflow

### Initial Setup
```bash
npm run migrate
```
This will:
1. Create database user if needed
2. Create database if needed
3. Run base setup (full_setup.sql)
4. Run all migration files

### Adding New Migrations

1. **Create a new migration file:**
   ```bash
   cd mscan-server/database/migrations
   touch 010_your_migration_name.sql
   ```

2. **Write your migration SQL:**
   ```sql
   -- Migration: Your migration description
   -- Version: 010
   -- Date: 2026-01-26
   
   -- Use DO $$ blocks for conditional logic
   DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'your_table' AND column_name = 'your_column'
     ) THEN
       ALTER TABLE your_table ADD COLUMN your_column TEXT;
       RAISE NOTICE 'Added your_column to your_table';
     ELSE
       RAISE NOTICE 'your_column already exists';
     END IF;
   END $$;
   ```

3. **Run the migration:**
   ```bash
   npm run migrate
   ```

### Best Practices

#### ✅ DO:
- Make migrations idempotent (safe to run multiple times)
- Use `IF NOT EXISTS` / `IF EXISTS` checks
- Add clear comments and descriptions
- Test migrations on development first
- Number migrations sequentially (001, 002, etc.)
- Use descriptive file names

#### ❌ DON'T:
- Modify existing migration files after they've been run in production
- Use `DROP TABLE` without `IF EXISTS`
- Forget to handle existing data when adding constraints
- Run `migrate:reset` or `migrate:fresh` in production

## Migration File Naming

Format: `NNN_descriptive_name.sql`

Examples:
- `001_create_users_table.sql`
- `002_add_email_verification.sql`
- `003_create_products_table.sql`

## Troubleshooting

### Migration fails with "already exists" error
The migration is not idempotent. Add conditional checks:
```sql
-- Instead of:
ALTER TABLE foo ADD COLUMN bar TEXT;

-- Use:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'foo' AND column_name = 'bar'
  ) THEN
    ALTER TABLE foo ADD COLUMN bar TEXT;
  END IF;
END $$;
```

### Want to start fresh in development
```bash
npm run migrate:reset
```

### Check what's been run
```bash
npm run migrate:status
```

### Migration tracking table is corrupted
```bash
# Drop migrations table and re-run
psql -U postgres mscan_db -c "DROP TABLE migrations;"
npm run migrate
```

## Migration Tracking

Migrations are tracked in the `migrations` table:
```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Each migration is recorded when successfully executed, preventing duplicate runs.

## Examples

### Example 1: Adding a new column
```sql
-- Migration: Add user preferences column
-- Version: 011

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'preferences'
  ) THEN
    ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added preferences column to users';
  ELSE
    RAISE NOTICE 'preferences column already exists';
  END IF;
END $$;
```

### Example 2: Creating a new table
```sql
-- Migration: Create notifications table
-- Version: 012

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
```

### Example 3: Data migration
```sql
-- Migration: Migrate old format to new format
-- Version: 013

DO $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Update data only if needed
  UPDATE products
  SET attributes = jsonb_set(attributes, '{migrated}', 'true'::jsonb)
  WHERE attributes IS NOT NULL
    AND attributes->>'migrated' IS NULL;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE 'Migrated % products', affected_rows;
END $$;
```

## Environment Variables

Configure in `.env` file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mscan_db
DB_USER=postgres
DB_PASSWORD=admin
```

## See Also

- [Full database schema](./full_setup.sql)
- [Main documentation](../docs/DATABASE_DESIGN.md)
- [API documentation](../docs/API_REFERENCE.md)
