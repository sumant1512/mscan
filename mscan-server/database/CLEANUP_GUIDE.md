# Database Cleanup - Quick Reference Guide

## 🎯 Three Main Cleanup Commands

Choose the right command based on what you want to delete:

---

### 1️⃣ **Clean Tenant Data Only** (Recommended for Regular Use)
**Keeps: Database, Tables, Super Admin Users**
**Deletes: Only tenant-related data**

```bash
npm run db:cleanup
```

**What Gets Deleted:**
- ✅ Tenants
- ✅ Tenant Users (TENANT_ADMIN, TENANT_USER)
- ✅ Coupons
- ✅ Products
- ✅ Verification Apps
- ✅ Credit Requests
- ✅ All tenant-related data

**What Stays:**
- ✅ Database (mscan_db)
- ✅ All tables (empty)
- ✅ Super Admin users
- ✅ Table structure

**Use When:**
- You want to clean tenant data for testing
- You want to keep Super Admin accounts
- You want a quick reset without recreating database

**Skip Confirmation:**
```bash
npm run db:cleanup:force
```

---

### 2️⃣ **Wipe ALL Data** (Nuclear Option - Tables Stay)
**Keeps: Database, Tables**
**Deletes: EVERYTHING including Super Admin users**

```bash
npm run db:wipe
```

**What Gets Deleted:**
- ✅ ALL Users (including Super Admin)
- ✅ Tenants
- ✅ Coupons
- ✅ Products
- ✅ Verification Apps
- ✅ EVERYTHING - Every single row

**What Stays:**
- ✅ Database (mscan_db)
- ✅ All tables (structure only, completely empty)
- ✅ Indexes, constraints, sequences

**Use When:**
- You want completely empty tables
- You want to remove Super Admin users too
- You want to start 100% fresh but keep table structure

**Skip Confirmation:**
```bash
npm run db:wipe:force
```

---

### 3️⃣ **Destroy Database** (Complete Destruction)
**Keeps: Nothing**
**Deletes: THE ENTIRE DATABASE**

```bash
npm run db:destroy
```

**What Gets Deleted:**
- ✅ The database itself (mscan_db)
- ✅ ALL tables
- ✅ ALL data
- ✅ ALL indexes, constraints, sequences
- ✅ EVERYTHING - Database disappears completely

**What Stays:**
- Nothing. The database is gone.

**Use When:**
- You want to completely remove the database
- You're starting over from absolute zero
- You want to change database structure completely

**Skip Confirmation:**
```bash
npm run db:destroy:force
```

**After Destruction:**
You'll need to:
```bash
# 1. Recreate the database
createdb mscan_db

# 2. Recreate tables
npm run db:reset
```

---

## 📊 Quick Comparison

| Command | Database | Tables | Super Admin | Tenant Data | Use Case |
|---------|----------|--------|-------------|-------------|----------|
| `db:cleanup` | ✅ Stays | ✅ Stays | ✅ Keeps | ❌ Deletes | Regular testing, keep admin |
| `db:wipe` | ✅ Stays | ✅ Stays | ❌ Deletes | ❌ Deletes | Complete fresh start, keep structure |
| `db:destroy` | ❌ Deletes | ❌ Deletes | ❌ Deletes | ❌ Deletes | Total destruction, start over |

---

## 🚀 Common Workflows

### Scenario 1: Testing with Fresh Data (Keep Admin)
```bash
# Clean tenant data, keep Super Admin
npm run db:cleanup

# Result: Empty tables, Super Admin still exists
```

### Scenario 2: Complete Fresh Start (Keep Structure)
```bash
# Wipe everything including Super Admin
npm run db:wipe

# Result: All tables empty, need to recreate Super Admin
```

### Scenario 3: Start from Absolute Zero
```bash
# Destroy entire database
npm run db:destroy

# Recreate database
createdb mscan_db

# Setup fresh
npm run db:reset

# Result: Brand new database, fresh tables
```

### Scenario 4: After db:drop (Tables Missing)
```bash
# Smart reset - detects missing tables and recreates them
npm run db:reset

# Result: Fresh tables, ready to use
```

---

## ⚠️ Safety Levels

### 🟢 **Safe** - `db:cleanup`
- Asks for confirmation
- Keeps Super Admin
- Can recreate tenants easily
- Recommended for regular use

### 🟡 **Caution** - `db:wipe`
- Asks for confirmation: "WIPE ALL DATA"
- Deletes Super Admin too
- Need to recreate all users
- Use when you really want empty tables

### 🔴 **Dangerous** - `db:destroy`
- Asks for confirmation: "DESTROY DATABASE"
- Deletes entire database
- Need to recreate database + tables
- Use only when absolutely necessary

---

## 🔒 Confirmation Requirements

Each command requires typing a specific phrase:

### `db:cleanup`
```
Type "DELETE ALL DATA" to confirm
```

### `db:wipe`
```
Type "WIPE ALL DATA" to confirm
```

### `db:destroy`
```
Type "DESTROY DATABASE" to confirm
```

### Skip Confirmations (Development Only!)
Add `:force` to any command:
```bash
npm run db:cleanup:force   # Skip confirmation
npm run db:wipe:force      # Skip confirmation
npm run db:destroy:force   # Skip confirmation
```

⚠️ **WARNING**: Never use `:force` in production!

---

## 🎓 Decision Tree

**Start here: What do you want to delete?**

```
Just tenant data?
├─ YES → npm run db:cleanup
└─ NO ↓

Everything but keep tables?
├─ YES → npm run db:wipe
└─ NO ↓

Delete the entire database?
└─ YES → npm run db:destroy
```

---

## 📝 What Happens After Each Command

### After `db:cleanup`
✅ Database ready
✅ Tables exist (empty)
✅ Super Admin users exist
➡️ Action: Start adding tenants

### After `db:wipe`
✅ Database ready
✅ Tables exist (empty)
❌ No users exist
➡️ Action: Create Super Admin, then add tenants

### After `db:destroy`
❌ No database
❌ No tables
❌ Nothing exists
➡️ Action: Run `createdb mscan_db` then `npm run db:reset`

---

## 💡 Pro Tips

1. **Regular Testing**: Use `db:cleanup` - it's the safest
2. **Fresh Start**: Use `db:wipe` - keeps structure
3. **Nuclear Option**: Use `db:destroy` - only when needed
4. **After db:drop**: Use `npm run db:reset` - auto-detects and fixes
5. **Development**: Add `:force` to skip confirmations
6. **Production**: NEVER use `:force`, always confirm manually

---

## ❓ FAQ

**Q: Which command should I use most often?**
A: `npm run db:cleanup` - it keeps Super Admin and is safest

**Q: I ran db:drop, what now?**
A: Run `npm run db:reset` - it will detect and recreate tables

**Q: How do I completely start over?**
A: Use `npm run db:wipe` (keeps structure) or `npm run db:destroy` (removes everything)

**Q: Can I undo these commands?**
A: No! All deletions are permanent. Make backups if needed.

**Q: What's the difference between wipe and destroy?**
A: `wipe` keeps tables empty, `destroy` deletes the database itself

---

## 🆘 Emergency Recovery

### "I accidentally deleted everything!"
```bash
# If database still exists (after wipe):
npm run db:reset

# If database was destroyed:
createdb mscan_db
npm run db:reset
```

### "Tables don't exist!"
```bash
npm run db:reset
```

### "I want to start completely fresh"
```bash
npm run db:destroy
createdb mscan_db
npm run db:reset
```

---

**Remember**: With great power comes great responsibility! 💪
Choose the right tool for the job and always double-check before confirming!
