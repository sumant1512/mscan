/**
 * Apply Tenant Schema Fixes to Existing Database
 *
 * This script applies the tenant schema fixes to an existing database:
 * 1. Removes duplicate contact_name column
 * 2. Adds created_by foreign key constraint
 * 3. Updates existing tenants with created_by
 * 4. Adds index for created_by
 *
 * Usage: node database/apply-tenant-fixes.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function applyFixes() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'mscan',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database:', process.env.DB_NAME);

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'APPLY_TENANT_SCHEMA_FIXES.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('\n📝 Applying tenant schema fixes...\n');

    // Execute the SQL
    const result = await client.query(sql);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Check the notices above for details.');

    // Verify the changes
    console.log('\n🔍 Verifying changes...\n');

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
      console.log('Sample tenant records after migration:');
      console.table(verifyResult.rows);
    } else {
      console.log('No tenants found in database.');
    }

    // Check if contact_name still exists
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tenants' AND column_name = 'contact_name';
    `);

    if (columnCheck.rows.length === 0) {
      console.log('\n✅ SUCCESS: contact_name column has been removed');
    } else {
      console.log('\n⚠️  WARNING: contact_name column still exists');
    }

    // Check created_by population
    const nullCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM tenants
      WHERE created_by IS NULL;
    `);

    const nullCount = parseInt(nullCheck.rows[0].count);
    if (nullCount === 0) {
      console.log('✅ SUCCESS: All tenants have created_by populated');
    } else {
      console.log(`⚠️  WARNING: ${nullCount} tenant(s) still have NULL created_by`);
    }

  } catch (error) {
    console.error('\n❌ Error applying fixes:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the migration
applyFixes()
  .then(() => {
    console.log('\n🎉 All done! You can now restart your server.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
