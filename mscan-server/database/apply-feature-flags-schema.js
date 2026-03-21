/**
 * Apply Feature Flags Schema Migration
 * Runs APPLY_FEATURE_FLAGS_SCHEMA.sql on existing database
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

async function applyFeatureFlagsSchema() {
  const client = await pool.connect();

  try {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║       Applying Feature Flags Schema Migration        ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('📁 Reading SQL file...');
    const sqlPath = path.join(__dirname, 'APPLY_FEATURE_FLAGS_SCHEMA.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔧 Applying feature flags schema...\n');

    // Execute the SQL with enhanced notice handling
    await client.query('SET client_min_messages = NOTICE');

    const result = await client.query(sql);

    console.log('\n✅ Feature flags schema applied successfully!');
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║         Feature Flags Schema Migration Complete      ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    // Verify the changes
    console.log('🔍 Verifying changes...\n');

    const verifyQuery = `
      SELECT
        'features' as table_name,
        COUNT(*) as record_count
      FROM features
      UNION ALL
      SELECT
        'tenant_features' as table_name,
        COUNT(*) as record_count
      FROM tenant_features;
    `;

    const verifyResult = await client.query(verifyQuery);

    console.log('📊 Table counts:');
    verifyResult.rows.forEach(row => {
      console.log(`   ${row.table_name}: ${row.record_count} records`);
    });

    console.log('\n🎉 Migration verification complete!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  applyFeatureFlagsSchema()
    .then(() => {
      console.log('\n✅ Feature flags schema migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Feature flags schema migration failed:', error);
      process.exit(1);
    });
}

module.exports = applyFeatureFlagsSchema;