#!/usr/bin/env node

/**
 * Apply Migration 014 - Add variant_config and custom_fields
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mscan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = (msg, color = 'reset') => console.log(`${colors[color]}${msg}${colors.reset}`);

async function applyMigration() {
  const client = new Client(CONFIG);

  try {
    log('\n╔═══════════════════════════════════════════════════════╗', 'cyan');
    log('║   Migration 014: Add variant_config & custom_fields  ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════╝\n', 'cyan');

    log('🔌 Connecting to database...', 'cyan');
    await client.connect();
    log(`✅ Connected to: ${CONFIG.database}\n`, 'green');

    log('📝 Reading migration file...', 'cyan');
    const migrationPath = path.join(__dirname, 'migrations', '014_add_variant_config_custom_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    log('🚀 Applying migration...', 'cyan');
    await client.query(sql);

    log('\n✅ Migration 014 applied successfully!', 'green');
    log('   • Added "variant_config" column (JSONB)', 'green');
    log('   • Added "custom_fields" column (JSONB)', 'green');
    log('   • Your schema is now up to date!\n', 'green');

    log('💡 Next step: Restart your server', 'cyan');
    log('   npm start\n', 'cyan');

  } catch (error) {
    log('\n❌ Migration failed!', 'red');
    log(`   Error: ${error.message}\n`, 'red');
    throw error;
  } finally {
    await client.end();
  }
}

applyMigration()
  .then(() => {
    log('✨ Done!\n', 'green');
    process.exit(0);
  })
  .catch((error) => {
    log(`\n💥 Fatal error: ${error.message}\n`, 'red');
    console.error(error);
    process.exit(1);
  });
