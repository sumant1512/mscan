# Database NPM Scripts - Quick Reference

All database operations are now available as npm scripts! 🎉

## 📋 All Available Scripts

| Command | What It Does | Confirmation? |
|---------|-------------|---------------|
| `npm run db` | **Interactive menu** (easiest!) | ✅ Yes |
| `npm run db:setup` | Create database + tables + super admin | ❌ No |
| `npm run db:clean-tenant` | Delete operational data, keep tenants | ✅ Yes |
| `npm run db:clean-all` | Delete all data, keep super admin | ✅ Yes |
| `npm run db:drop` | Drop entire database | ✅ Yes |
| `npm run db:reset` | Drop + Setup (complete fresh start) | ❌ No |

---

## 🚀 Most Common Commands

### First Time Setup
```bash
npm run db:setup
```

### Interactive Menu (When Unsure)
```bash
npm run db
```

### Complete Fresh Start
```bash
npm run db:reset
```

### Clean Data But Keep Tenants
```bash
npm run db:clean-tenant
```

### Clean Everything But Keep Super Admin
```bash
npm run db:clean-all
```

---

## 💡 Quick Examples

### Start Fresh Every Morning
```bash
npm run db:reset
npm start
```

### Clean Test Data After Testing
```bash
npm run db:clean-all
```

### Reset Operational Data
```bash
npm run db:clean-tenant
```

---

## 🔄 Workflow Examples

### Development Workflow
```bash
# Morning - fresh start
npm run db:reset
npm start

# During development - test with clean data
npm run db:clean-all

# End of day - no cleanup needed
```

### Testing Workflow
```bash
# Before tests
npm run db:clean-all

# Run tests
npm test

# After tests - clean again
npm run db:clean-all
```

### Demo Workflow
```bash
# Prepare clean demo
npm run db:reset

# Add demo tenants and data...

# After demo - reset
npm run db:reset
```

---

## ⚙️ What Each Script Does

### `npm run db`
- Opens interactive menu
- Choose from 5 options
- Best for beginners

### `npm run db:setup`
- Creates database (if not exists)
- Creates all tables
- Runs migrations
- Creates Super Admin (admin@mscan.com)

### `npm run db:clean-tenant`
- **DELETES**: All tenant users, products, coupons, scans
- **KEEPS**: Tenant records, Super Admin
- Asks for confirmation (type "CLEAN")

### `npm run db:clean-all`
- **DELETES**: ALL tenants, ALL data
- **KEEPS**: Super Admin only
- Asks for confirmation (type "DELETE ALL")

### `npm run db:drop`
- **DELETES**: Entire database
- **KEEPS**: Nothing
- Asks for confirmation (type "DROP")

### `npm run db:reset`
- Drops database (no confirmation)
- Sets up fresh database
- **USE WITH CAUTION!**

---

## 🛡️ Safety Features

✅ Most scripts require confirmation
✅ Shows what will be deleted before proceeding
✅ `db:reset` is the only auto-confirm script
✅ Press Ctrl+C to cancel anytime

---

## 📝 Notes

- All scripts are defined in `package.json`
- They call `database/db-manager.js` internally
- You can still use `node database/db-manager.js` directly if needed
- Use `--yes` flag to skip confirmations (direct node calls only)

---

## 🆘 Troubleshooting

**Command not found?**
Make sure you're in `/mscan-server` directory

**Permission denied?**
Make sure `db-manager.js` is executable:
```bash
chmod +x database/db-manager.js
```

**Database connection error?**
Check your `.env` file or environment variables

---

## 🎯 Remember

**One command to rule them all:**
```bash
npm run db
```

Then just follow the menu! 😊
