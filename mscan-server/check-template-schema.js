#!/usr/bin/env node

/**
 * Check product_templates table schema
 */

require('dotenv').config();
const { Client } = require('pg');

const CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mscan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
};

async function checkSchema() {
  const client = new Client(CONFIG);

  try {
    await client.connect();
    console.log('\n✅ Connected to database\n');

    // Check all columns in product_templates table
    const result = await client.query(`
      SELECT
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'product_templates'
      ORDER BY ordinal_position
    `);

    console.log('📋 product_templates table schema:');
    console.log('═══════════════════════════════════════════════════════════');

    if (result.rows.length === 0) {
      console.log('❌ Table "product_templates" not found!');
      console.log('\n💡 Run: npm run db:setup\n');
    } else {
      result.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.column_name}`);
        console.log(`   Type: ${row.data_type}`);
        console.log(`   Nullable: ${row.is_nullable}`);
        if (row.column_default) {
          console.log(`   Default: ${row.column_default.substring(0, 50)}...`);
        }
        console.log('');
      });

      // Check for common expected columns
      const columns = result.rows.map(r => r.column_name);
      console.log('🔍 Expected columns check:');
      console.log('─────────────────────────────────────');

      const expectedColumns = [
        'id',
        'tenant_id',
        'template_name',
        'name',
        'variant_config',
        'custom_fields',
        'industry_type',
        'description'
      ];

      expectedColumns.forEach(col => {
        const exists = columns.includes(col);
        const symbol = exists ? '✅' : '❌';
        console.log(`${symbol} ${col}`);
      });

      console.log('\n💡 Recommendations:');

      if (!columns.includes('variant_config') && !columns.includes('custom_fields')) {
        console.log('⚠️  Old schema detected (migration 003)');
        console.log('   Missing: variant_config, custom_fields');
        console.log('   Run: npm run db:reset (to recreate with new schema)');
      } else if (columns.includes('variant_config') && columns.includes('custom_fields')) {
        console.log('✅ New schema detected (migration 004)');
      } else {
        console.log('⚠️  Mixed schema state detected');
        console.log('   Run: npm run db:reset');
      }
    }

    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

checkSchema();
