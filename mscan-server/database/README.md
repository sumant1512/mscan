# Database Management - Simple Guide

This directory contains **ONE SCRIPT** to manage your entire database: `db-manager.js`

## Quick Start

### NPM Scripts (Easiest!)

```bash
# Interactive menu
npm run db

# Setup database
npm run db:setup

# Clean tenant data (with confirmation)
npm run db:clean-tenant

# Clean all data (with confirmation)
npm run db:clean-all

# Drop database (with confirmation)
npm run db:drop

# Complete reset (drop + setup, no confirmation)
npm run db:reset
```

### Interactive Mode

```bash
npm run db
# or
node database/db-manager.js
```

You'll see a menu:
```
1. Setup Database (create fresh database)
2. Clean Tenant Data (keep tenants, delete operational data)
3. Clean All Data (delete tenants, keep super admin)
4. Drop Database (complete destruction)
5. Exit
```

Just type a number and press Enter!

---

## Command Line Mode

### 1. Setup Database (First Time or After Drop)

```bash
npm run db:setup
# or
node database/db-manager.js setup
```

**What it does:**
- Creates the database if it doesn't exist
- Creates all tables
- Runs all migrations
- Creates Super Admin user (email: admin@mscan.com)

**Use this when:**
- Setting up for the first time
- After dropping the database

---

### 2. Clean Tenant Data (Keep Tenant Records)

```bash
npm run db:clean-tenant
# or
node database/db-manager.js clean-tenant
# or skip confirmation:
node database/db-manager.js clean-tenant --yes
```

**What it DELETES:**
- All tenant users
- All products, coupons, scans
- All operational data

**What it KEEPS:**
- Tenant records
- Super Admin users

**Use this when:**
- You want to reset data but keep tenant accounts

---

### 3. Clean All Data (Keep Super Admin Only)

```bash
npm run db:clean-all
# or
node database/db-manager.js clean-all
# or skip confirmation:
node database/db-manager.js clean-all --yes
```

**What it DELETES:**
- ALL tenants
- ALL users (except super admin)
- ALL data

**What it KEEPS:**
- Super Admin users ONLY

**Use this when:**
- You want a fresh start but keep your admin account

---

### 4. Drop Database (Complete Destruction)

```bash
npm run db:drop
# or
node database/db-manager.js drop
# or skip confirmation:
node database/db-manager.js drop --yes
```

**What it DELETES:**
- The entire database
- EVERYTHING

**What it KEEPS:**
- Nothing

**Use this when:**
- You want to completely remove everything

---

## Common Workflows

### Complete Fresh Start (One Command!)
```bash
npm run db:reset
```

Or manually:
```bash
npm run db:drop
npm run db:setup
```

### Reset All Data (Keep Super Admin)
```bash
npm run db:clean-all
```

### Reset Operational Data (Keep Tenants)
```bash
npm run db:clean-tenant
```

---

## Quick Comparison

| Command | Database | Tables | Tenants | Super Admin | Data |
|---------|----------|--------|---------|-------------|------|
| `setup` | ✅ Create | ✅ Create | - | ✅ Create | - |
| `clean-tenant` | ✅ Keep | ✅ Keep | ✅ Keep | ✅ Keep | ❌ Delete |
| `clean-all` | ✅ Keep | ✅ Keep | ❌ Delete | ✅ Keep | ❌ Delete |
| `drop` | ❌ Drop | ❌ Drop | ❌ Delete | ❌ Delete | ❌ Delete |

---

## Configuration

The script uses these environment variables (with defaults):

```bash
DB_HOST=localhost        # Database host
DB_PORT=5432            # PostgreSQL port
DB_NAME=mscan_db        # Database name
DB_USER=postgres        # Database user
DB_PASSWORD=admin       # Database password
```

To change:
```bash
export DB_PASSWORD=mypassword
node database/db-manager.js setup
```

---

## Safety Features

- ✅ Interactive confirmations (type specific words to confirm)
- ✅ Shows what will be deleted/kept before proceeding
- ✅ Use `--yes` flag to skip confirmations
- ✅ Color-coded output for easy reading
- ✅ Graceful Ctrl+C handling

---

## Other Files in This Directory

- `full_setup.sql` - The main SQL schema file (used by db-manager.js)
- `migrations/` - Database migration files (automatically run by db-manager.js)
- `CLEANUP_GUIDE.md` - Detailed cleanup documentation (if needed)

---

## Default Super Admin

After running `setup`, you get:
- **Email**: admin@mscan.com
- **Role**: SUPER_ADMIN
- Login with this email using OTP

---

## Troubleshooting

### "Database does not exist"
Run: `node database/db-manager.js setup`

### "Password authentication failed"
Set password: `export DB_PASSWORD=yourpassword`

### Want to see what will be deleted?
Run without `--yes` flag to see a summary first

---

## That's It!

Just use `db-manager.js` for everything. No more confusion! 🎉
