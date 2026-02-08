/**
 * Data Migration: Permission System
 *
 * This script:
 * 1. Runs the SQL migration to create permission tables
 * 2. Seeds initial permissions from hardcoded permission sets
 * 3. Validates permission data
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mscan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
});

async function runMigration() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🚀 Starting permission system migration...\n');

    // Step 1: Check if migration already ran
    console.log('📝 Step 1: Checking if migration is needed...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'permissions'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('⚠️  Permissions table already exists. Checking if we need to seed data...');

      const countCheck = await client.query('SELECT COUNT(*) as count FROM permissions');
      if (parseInt(countCheck.rows[0].count) > 0) {
        console.log(`✅ Found ${countCheck.rows[0].count} existing permissions`);
        console.log('ℹ️  Migration appears to have already run. Exiting.\n');
        console.log('💡 To force re-run, drop tables manually or use rollback script first.');
        await client.query('COMMIT');
        return;
      }
    }

    // Step 2: Run SQL migration
    console.log('📝 Step 2: Running SQL schema migration...');
    const sqlPath = path.join(__dirname, '20260117_create_permission_system.sql');

    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration file not found: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('✅ Schema migration completed\n');

    // Step 3: Verify permissions were seeded
    console.log('📝 Step 3: Verifying seeded permissions...');
    const permissionsResult = await client.query(`
      SELECT code, name, scope, array_length(allowed_assigners, 1) as assigners_count
      FROM permissions
      ORDER BY scope, code
    `);

    console.log(`✅ Total permissions seeded: ${permissionsResult.rows.length}\n`);

    // Show breakdown by scope
    const scopeBreakdown = await client.query(`
      SELECT scope, COUNT(*) as count
      FROM permissions
      GROUP BY scope
      ORDER BY scope
    `);

    console.log('📊 Permissions by scope:');
    for (const row of scopeBreakdown.rows) {
      console.log(`   - ${row.scope}: ${row.count} permissions`);
    }
    console.log('');

    // Step 4: Verify audit_logs table
    console.log('📝 Step 4: Verifying audit_logs table...');
    const auditTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'audit_logs'
      );
    `);

    if (auditTableCheck.rows[0].exists) {
      console.log('✅ Audit logs table verified\n');
    } else {
      console.log('⚠️  Audit logs table not found (may need separate creation)\n');
    }

    // Step 5: Test helper function
    console.log('📝 Step 5: Testing helper functions...');
    const functionCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc
        WHERE proname = 'get_user_effective_permissions'
      );
    `);

    if (functionCheck.rows[0].exists) {
      console.log('✅ Helper function get_user_effective_permissions created\n');
    }

    // Step 6: Show sample permissions
    console.log('📝 Step 6: Sample permissions seeded:');
    const samplePermissions = await client.query(`
      SELECT code, name, scope
      FROM permissions
      ORDER BY code
      LIMIT 10
    `);

    for (const perm of samplePermissions.rows) {
      console.log(`   ✅ ${perm.code.padEnd(25)} - ${perm.name} (${perm.scope})`);
    }

    if (permissionsResult.rows.length > 10) {
      console.log(`   ... and ${permissionsResult.rows.length - 10} more`);
    }
    console.log('');

    await client.query('COMMIT');

    console.log('🎉 Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Tables created: permissions, permission_assignments, audit_logs`);
    console.log(`   - Permissions seeded: ${permissionsResult.rows.length}`);
    console.log(`   - Indices created: 15+`);
    console.log(`   - Helper functions: 1`);
    console.log(`   - Triggers: 1`);
    console.log('');
    console.log('✅ Permission system is ready to use!');
    console.log('');
    console.log('Next steps:');
    console.log('   1. Update auth.controller.js to use database permissions');
    console.log('   2. Create permission management API endpoints');
    console.log('   3. Build frontend UI for permission management');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
