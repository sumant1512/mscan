# Database Cleanup Script - Quick Reference

## 🎯 Purpose
Delete ALL tenant data while preserving only Super Admin user(s).

## 🚀 Usage

### Interactive Mode (Recommended)
```bash
cd mscan-server
node database/cleanup-all-tenant-data.js
```

### Non-Interactive Mode (No Confirmation)
```bash
node database/cleanup-all-tenant-data.js --yes
```

### Direct SQL Execution
```bash
psql -U postgres -d mscan_db -f database/cleanup-all-tenant-data.sql
```

## ⚠️ What Gets Deleted

- ✗ All tenants
- ✗ All tenant users (TENANT_ADMIN, TENANT_USER)
- ✗ All coupons
- ✗ All scans
- ✗ All verification apps
- ✗ All credit requests & transactions
- ✗ All tenant credit balances
- ✗ Tenant-related OTPs
- ✗ Tenant-related token blacklist entries
- ✗ Tenant-related audit logs

## ✅ What Gets Preserved

- ✓ Super Admin user(s)
- ✓ Database schema and structure
- ✓ All tables (empty except users)

## 🔒 Safety Features

1. **Transaction-based**: All-or-nothing operation
2. **Confirmation prompt**: Must type "DELETE ALL DATA" to proceed
3. **Data summary**: Shows counts before deletion
4. **Verification**: Checks data after cleanup
5. **Rollback on error**: Automatic rollback if any step fails

## 📊 Example Flow

```
1. Connect to database
2. Count and display current data
3. Show what will be deleted vs preserved
4. Prompt for confirmation
5. Execute cleanup in transaction
6. Verify cleanup success
7. Display remaining users
```

## 🛡️ Recovery

**IMPORTANT**: This operation is **irreversible**!

To prevent accidents:
- Always backup database before cleanup
- Test in development environment first
- Use interactive mode (avoid --yes flag)

### Backup Before Cleanup
```bash
# Backup entire database
pg_dump -U postgres mscan_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore if needed
psql -U postgres -d mscan_db < backup_20260102_143000.sql
```

## 🔧 Troubleshooting

### Script fails to connect
- Check database credentials in environment variables
- Ensure PostgreSQL is running
- Verify database name is correct

### Verification fails
- Check database constraints
- Look for foreign key violations in logs
- Ensure no concurrent connections modifying data

### Some data remains
- Check for custom tables not in cleanup script
- Verify foreign key relationships
- Re-run the script (it's idempotent)

## 📝 Configuration

The script uses these environment variables (or defaults):

```bash
DB_HOST=localhost      # Database host
DB_PORT=5432          # Database port
DB_NAME=mscan_db      # Database name
DB_USER=postgres      # Database user
DB_PASSWORD=postgres  # Database password
```

Set them before running:
```bash
export DB_NAME=my_database
node database/cleanup-all-tenant-data.js
```

## 🎨 Output Colors

The script uses colored output:
- 🔵 Blue: Information/progress
- 🟢 Green: Success/preserved items
- 🟡 Yellow: Warnings/items to delete
- 🔴 Red: Errors/dangerous operations
- 🔷 Cyan: Headers/borders

## 📞 Support

If you encounter issues:
1. Check the database logs
2. Verify all migrations are applied
3. Ensure no other processes are using the database
4. Contact system administrator

## 🔄 Related Scripts

- `migrate.js` - Apply database migrations
- `seed.sql` - Create initial Super Admin user
- `schema.sql` - Create database schema
- `rewards-migration.sql` - Create rewards tables

---

**Created**: January 2, 2026  
**Version**: 1.0.0  
**Author**: System Administrator
