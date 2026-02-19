/**
 * Apply Tenant Schema Fixes
 * Runs APPLY_TENANT_SCHEMA_FIXES.sql on existing database
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mscan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
});

async function applySchemaFixes() {
  const client = await pool.connect();

  try {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║       Applying Tenant Schema Fixes                   ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('📁 Reading SQL file...');
    const sqlPath = path.join(__dirname, 'APPLY_TENANT_SCHEMA_FIXES.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔧 Applying schema fixes...\n');

    // Execute the SQL with enhanced notice handling
    await client.query('SET client_min_messages = NOTICE');

    const result = await client.query(sql);

    console.log('\n✅ Schema fixes applied successfully!');
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║            Schema Fixes Complete                     ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    // Verify the changes
    console.log('🔍 Verifying changes...\n');

    const verifyQuery = `
      SELECT
        t.id,
        t.tenant_name,
        t.contact_person,
        t.created_by,
        u.full_name as created_by_name,
        u.email as created_by_email
      FROM tenants t
      LEFT JOIN users u ON t.created_by = u.id
      LIMIT 3;
    `;

    const verifyResult = await client.query(verifyQuery);

    if (verifyResult.rows.length > 0) {
      console.log('Sample tenant data:');
      verifyResult.rows.forEach((row, idx) => {
        console.log(`  ${idx + 1}. ${row.tenant_name} (created by: ${row.created_by_name || 'N/A'})`);
      });
    }

    console.log('\n✨ All done!\n');

  } catch (error) {
    console.error('\n❌ Error applying schema fixes:');
    console.error(error.message);

    if (error.code) {
      console.error(`Error Code: ${error.code}`);
    }

    console.error('\n💡 Troubleshooting:');
    console.error('  1. Make sure the database exists');
    console.error('  2. Verify database credentials in .env');
    console.error('  3. Check if you have a super admin user in the database');
    console.error('  4. This script is for EXISTING databases only\n');

    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
applySchemaFixes().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
