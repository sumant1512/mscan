# Database Setup

## Prerequisites
- PostgreSQL 14+ installed and running
- Database `mscan_db` created

## Create Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE mscan_db;

# Exit psql
\q
```

## Database Management Scripts

### Quick Reference

```bash
# One-shot full setup (fresh DB)
npm run migrate:full

# Complete reset (drop all tables + recreate schema)
npm run db:reset

# Clean data only (keep tables, delete data, preserve Super Admin)
npm run db:cleanup

# Drop all tables and schema (no recreate)
npm run db:drop
```

### Detailed Usage

#### 🚀 Initial Setup

**First-time database setup:**

```bash
# Using consolidated SQL (Recommended)
npm run migrate:full
```

**What it does:**
- Creates all database tables
- Sets up indexes and constraints
- Creates triggers and functions
- Seeds Super Admin user (`admin@mscan.com`)
- Includes product/catalog, batches, analytics, mobile tables

#### 🔄 Complete Reset

**Drop everything and start fresh:**

```bash
npm run db:drop
npm run migrate:full
```

**What it does:**
1. Drops all tables, views, sequences, functions, and types
2. Recreates entire schema from scratch
3. Seeds Super Admin user

**Use when:**
- You want a completely fresh database
- Schema has changed significantly
- Starting a new development cycle

#### 🧹 Clean Data Only

**Delete all tenant data but keep schema:**

```bash
# Interactive mode (with confirmation)
npm run db:cleanup

# Force mode (no confirmation - BE CAREFUL!)
npm run db:cleanup:force
```

**What gets DELETED:**
- All tenants
- All tenant users (TENANT_ADMIN, TENANT_USER)
- All coupons and scans
- All verification apps
- All credit requests and transactions
- All tenant-related audit logs and OTPs

**What gets PRESERVED:**
- Super Admin user(s)
- Database schema and tables
- Extensions (uuid-ossp)

**Use when:**
- You want to keep the schema but remove all data
- Testing with clean data
- Clearing development data

#### 💥 Drop All Tables

**Drop all tables without recreating:**

```bash
npm run db:drop
```

**What it does:**
- Drops all user-created tables, views, sequences
- Removes user-defined functions and types
- Preserves PostgreSQL extensions

**Use when:**
- You want to manually rebuild the schema
- Troubleshooting schema issues
- Preparing for a different migration strategy

## Database Schema

### Tables

1. **tenants** - Stores customer/tenant company information
2. **users** - All user accounts (Super Admin, Tenant Admin, Tenant Users)
3. **otps** - One-time passwords for email authentication
4. **token_blacklist** - Invalidated JWT tokens
5. **audit_logs** - System activity audit trail
6. **credit_requests** - Credit allocation requests from tenants
7. **tenant_credit_balance** - Credit balance for each tenant
8. **credit_transactions** - Credit transaction history
9. **verification_apps** - Verification applications for tenants
10. **coupons** - Coupon/voucher records
11. **scans** - Coupon scan history

## Script Comparison

| Script | Tables | Data | Super Admin | Use Case |
|--------|--------|------|-------------|----------|
| `migrate:full` | ✅ Create | ✅ Seed | ✅ Create | First-time setup |
| `db:cleanup` | ✅ Keep | ❌ Delete | ✅ Keep | Clear data, keep schema |
| `db:drop` | ❌ Drop | ❌ Delete | ❌ Delete | Manual schema rebuild |

## Configuration

All scripts use these environment variables (or defaults):

```bash
DB_HOST=localhost      # Database host
DB_PORT=5432          # Database port
DB_NAME=mscan_db      # Database name
DB_USER=postgres      # Database user
DB_PASSWORD=admin     # Database password
```

Set them before running scripts:

```bash
export DB_PASSWORD=my_password
npm run migrate:full
```

## Troubleshooting

### Migration fails with "relation already exists"

**Solution:** Drop and rerun consolidated setup:
```bash
npm run db:drop
npm run migrate:full
```

### Password authentication failed

**Solution:** Set the correct password:
```bash
export DB_PASSWORD=your_password
npm run migrate:full
```

### Cannot drop function (extension error)

This is normal. The drop script automatically skips extension-owned objects like `uuid-ossp` functions.

### Want to verify what will be deleted?

Use the interactive cleanup mode:
```bash
npm run db:cleanup
# Shows summary and asks for confirmation
```

## Safety Features

### Interactive Confirmation

The cleanup script requires typing "DELETE ALL DATA" to proceed:

```
Type "DELETE ALL DATA" to confirm: DELETE ALL DATA
```

### Transaction-based

All operations use database transactions:
- Success: All changes committed
- Error: All changes rolled back

### Verification Checks

Scripts verify operations completed successfully and show summaries.

## Related Files

- `full_setup.sql` - Consolidated one-shot schema + migrations + seed
- `rewards-migration.sql` - Rewards system tables
- `run-full-setup.js` - Node runner for consolidated SQL
- `cleanup-all-tenant-data.js` - Data cleanup script
- `cleanup-all-tenant-data.sql` - SQL cleanup script
- `drop-all-tables.js` - Drop tables script
- `CLEANUP_GUIDE.md` - Detailed cleanup documentation

## Support

For detailed cleanup documentation, see [CLEANUP_GUIDE.md](./CLEANUP_GUIDE.md)

## Default Super Admin

- **Email**: admin@mscan.com
- **Role**: SUPER_ADMIN
- Use this email to login with OTP

## Verify Setup

```bash
# Connect to database
psql -U postgres -d mscan_db

# Check tables
\dt

# Check users
SELECT email, full_name, role FROM users;

# Exit
\q
```

