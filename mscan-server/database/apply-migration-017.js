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
      path.join(__dirname, 'migrations', '017_add_products_attributes_column.sql'),
      'utf8'
    );

    console.log('\n📝 Applying migration 017: Add attributes JSONB column to products...\n');

    await client.query(migrationSQL);

    console.log('✅ Migration 017 applied successfully!\n');
    console.log('Changes:');
    console.log('  • Added attributes JSONB column to products table');
    console.log('  • Created GIN index on attributes column for efficient queries');
    console.log('  • Products can now store dynamic attributes based on templates');

  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
