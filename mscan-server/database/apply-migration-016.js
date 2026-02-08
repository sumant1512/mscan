#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mscan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
};

async function applyMigration() {
  const client = new Client(CONFIG);

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', '016_remove_product_sku_description.sql'),
      'utf8'
    );

    console.log('\n📝 Applying migration 016: Remove product_sku and description columns...\n');

    await client.query(migrationSQL);

    console.log('✅ Migration 016 applied successfully!\n');
    console.log('Changes:');
    console.log('  • Removed product_sku column from products table');
    console.log('  • Removed description column from products table');
    console.log('  • Removed unique constraint on (tenant_id, product_sku)');

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
