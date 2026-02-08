#!/usr/bin/env node

/**
 * Check which column product_templates table has
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

async function checkColumn() {
  const client = new Client(CONFIG);

  try {
    await client.connect();
    console.log('\n✅ Connected to database\n');

    // Check columns in product_templates table
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'product_templates'
        AND column_name IN ('name', 'template_name')
      ORDER BY column_name
    `);

    console.log('📋 product_templates table columns:');
    console.log('─────────────────────────────────────');

    if (result.rows.length === 0) {
      console.log('❌ Neither "name" nor "template_name" column found!');
      console.log('\n💡 Run: npm run db:setup\n');
    } else {
      result.rows.forEach(row => {
        console.log(`✅ Column: ${row.column_name} (${row.data_type})`);
      });

      console.log('\n📊 Recommendation:');
      const hasName = result.rows.some(r => r.column_name === 'name');
      const hasTemplateName = result.rows.some(r => r.column_name === 'template_name');

      if (hasTemplateName && !hasName) {
        console.log('✅ Database is correct - uses "template_name"');
        console.log('   Your code should use: pt.template_name');
      } else if (hasName && !hasTemplateName) {
        console.log('⚠️  Database uses old column "name"');
        console.log('   Run migration: npm run db:migrate');
      } else if (hasName && hasTemplateName) {
        console.log('⚠️  Both columns exist!');
        console.log('   Run migration: npm run db:migrate');
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

checkColumn();
