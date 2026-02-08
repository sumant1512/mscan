#!/usr/bin/env node

/**
 * Apply Migration 015 - Create tags table
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
    log('║        Migration 015: Create tags table              ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════╝\n', 'cyan');

    log('🔌 Connecting to database...', 'cyan');
    await client.connect();
    log(`✅ Connected to: ${CONFIG.database}\n`, 'green');

    log('📝 Reading migration file...', 'cyan');
    const migrationPath = path.join(__dirname, 'migrations', '015_create_tags_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    log('🚀 Applying migration...', 'cyan');
    await client.query(sql);

    log('\n✅ Migration 015 applied successfully!', 'green');
    log('   • Created "tags" table', 'green');
    log('   • Added indexes for performance', 'green');
    log('   • Added unique constraint on (verification_app_id, name)', 'green');
    log('   • Tags are now available for product organization!\n', 'green');

    log('💡 Next step: Restart your server', 'cyan');
    log('   npm start\n', 'cyan');

  } catch (error) {
    log('\n❌ Migration failed!', 'red');
    log(`   Error: ${error.message}\n`, 'red');

    if (error.message.includes('already exists')) {
      log('ℹ️  Table may already exist. This is safe to ignore.', 'yellow');
      process.exit(0);
    }

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
