# Database Management Commands

## Quick Reference

### 🚀 Complete Database Reset (Recommended)
**Use this after `db:drop` or whenever you need a fresh database**

```bash
npm run db:reset
```

**What it does:**
- ✅ Detects if tables are missing → Creates them automatically
- ✅ Detects if data exists → Cleans all tenant data
- ✅ Always preserves Super Admin users
- ✅ Interactive confirmation (asks before making changes)

**Skip confirmation:**
```bash
npm run db:reset:force
```

---

## All Available Commands

### Database Setup

#### Create All Tables
```bash
npm run db:setup
```
- Creates all database tables from scratch
- Use after `db:drop` or on a fresh database
- Same as: `node database/run-full-setup.js`

---

### Database Cleanup

#### Clean All Tenant Data (Interactive)
```bash
npm run db:cleanup
```
- Deletes ALL tenant data (tenants, users, coupons, products, etc.)
- Preserves Super Admin users
- Asks for confirmation before proceeding
- Requires tables to already exist

#### Clean All Tenant Data (Force)
```bash
npm run db:cleanup:force
```
- Same as above but skips confirmation
- ⚠️ **DANGEROUS**: Use with caution!

---

### Complete Database Reset

#### Smart Reset (Interactive)
```bash
npm run db:reset
```
- **If tables missing**: Creates all tables
- **If data exists**: Cleans all tenant data
- **Always**: Preserves Super Admin users
- Interactive - asks for confirmation

#### Smart Reset (Force)
```bash
npm run db:reset:force
```
- Same as above but skips all confirmations
- ⚠️ **DANGEROUS**: Use with caution!

---

### Database Drop

#### Drop All Tables
```bash
npm run db:drop
```
- Drops ALL tables from the database
- ⚠️ **Very destructive** - deletes everything including Super Admin users
- Database itself remains but is empty

**After running db:drop, you should run:**
```bash
npm run db:reset
```

---

## Common Workflows

### Scenario 1: Fresh Start After db:drop
```bash
# 1. Drop everything
npm run db:drop

# 2. Recreate and reset
npm run db:reset

# Result: Fresh database with empty tables, ready to use
```

### Scenario 2: Clean Tenant Data (Keep Super Admin)
```bash
# Just clean data, keep tables and Super Admin users
npm run db:cleanup

# Result: Empty tables except Super Admin users remain
```

### Scenario 3: Fresh Database Setup
```bash
# Just create tables (no cleanup needed)
npm run db:setup

# Result: All tables created, empty database
```

### Scenario 4: Quick Reset with Force (Development)
```bash
# Skip all confirmations (be careful!)
npm run db:reset:force

# Result: Instant reset, no questions asked
```

---

## Migration Commands

### Run Migrations
```bash
npm run migrate
```

### Reset Migrations
```bash
npm run migrate:reset
```

### Fresh Migrations
```bash
npm run migrate:fresh
```

### Check Migration Status
```bash
npm run migrate:status
```

---

## Direct Database Commands (Advanced)

### Using Node Scripts
```bash
# Setup
node database/run-full-setup.js

# Cleanup
node database/cleanup-all-tenant-data.js
node database/cleanup-all-tenant-data.js --yes

# Reset (smart)
node database/reset-database.js
node database/reset-database.js --yes

# Migrations
node database/run-migrations.js
```

### Using SQL Files Directly
```bash
# Setup
psql -d mscan_db -f database/full_setup.sql

# Cleanup
psql -d mscan_db -f database/cleanup-all-tenant-data.sql
```

---

## What Each Script Does

### `reset-database.js` ⭐ (NEW - Recommended)
- **Smart detection**: Checks if tables exist
- **Auto-setup**: Creates tables if missing
- **Auto-cleanup**: Cleans data if tables exist
- **Safe**: Always asks for confirmation (unless --yes)
- **Best for**: After db:drop, general database resets

### `cleanup-all-tenant-data.js`
- **Data-only**: Deletes tenant data, keeps tables
- **Preserves**: Super Admin users
- **Requires**: Tables must already exist
- **Best for**: Cleaning data without recreating schema

### `run-full-setup.js`
- **Schema-only**: Creates all tables
- **No data**: Just creates empty tables
- **Best for**: First-time setup, after db:drop

### `drop-all-tables.js`
- **Destructive**: Removes all tables
- **Complete**: Deletes everything
- **Best for**: Starting completely fresh

---

## Tips

1. **After `db:drop`**: Always run `npm run db:reset`
2. **Regular cleanup**: Use `npm run db:cleanup`
3. **Development**: Use `--yes` flags to skip confirmations
4. **Production**: Never use `--yes` flags, always confirm manually
5. **Fresh start**: `db:drop` → `db:reset` → ready to go

---

## Error Recovery

### "relation 'tenants' does not exist"
```bash
# Tables are missing, recreate them:
npm run db:reset
```

### "Database is empty but tables exist"
```bash
# Just create a Super Admin user via the API or direct SQL
# No need to reset
```

### "Cleanup failed, data remains"
```bash
# Try again with force:
npm run db:cleanup:force

# Or reset completely:
npm run db:reset:force
```

---

## Safety Checklist

Before running destructive commands:

- ✅ Check which database you're connected to
- ✅ Backup important data if needed
- ✅ Confirm you're not in production
- ✅ Know what data you're about to lose
- ✅ Have Super Admin credentials ready

---

## Quick Start

**Most Common Use Case:**
```bash
# I just ran db:drop or have a broken database, what do I do?
npm run db:reset

# That's it! Your database is now ready to use.
```
