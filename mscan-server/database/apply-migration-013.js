#!/usr/bin/env node

/**
 * Apply Migration 013 - Standardize template_name column
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
    log('║   Migration 013: Standardize template_name Column    ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════╝\n', 'cyan');

    log('🔌 Connecting to database...', 'cyan');
    await client.connect();
    log(`✅ Connected to: ${CONFIG.database}\n`, 'green');

    log('📝 Reading migration file...', 'cyan');
    const migrationPath = path.join(__dirname, 'migrations', '013_standardize_template_name_column.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    log('🚀 Applying migration...', 'cyan');
    await client.query(sql);

    log('\n✅ Migration 013 applied successfully!', 'green');
    log('   • Column "name" renamed to "template_name" (if needed)', 'green');
    log('   • Unique constraint standardized', 'green');
    log('   • Your database is now consistent!\n', 'green');

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
