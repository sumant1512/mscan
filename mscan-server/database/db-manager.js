#!/usr/bin/env node

/**
 * MScan Database Manager - All-in-One Database Management Script
 *
 * This single script handles ALL database operations:
 *   1. Setup new database (create DB + tables + super admin)
 *   2. Clean tenant data (keep tenants, delete operational data)
 *   3. Clean all data (delete tenants, keep super admin only)
 *   4. Drop database (complete destruction)
 *
 * Usage:
 *   node database/db-manager.js                    (interactive menu)
 *   node database/db-manager.js setup              (setup database)
 *   node database/db-manager.js clean-tenant       (clean tenant data)
 *   node database/db-manager.js clean-all          (clean all except superadmin)
 *   node database/db-manager.js drop               (drop database)
 *
 *   Add --yes to skip confirmations:
 *   node database/db-manager.js clean-all --yes
 */

const { Client, Pool } = require('pg');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mscan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
};

// Colors for terminal output
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper functions
const log = (msg, color = 'reset') => console.log(`${C[color]}${msg}${C.reset}`);
const ask = (question) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(`${C.bright}${C.cyan}${question}${C.reset}`, answer => {
    rl.close();
    resolve(answer.trim());
  }));
};

// ============================================
// 1. SETUP DATABASE
// ============================================
async function setupDatabase() {
  log('\n╔═══════════════════════════════════════════════════════╗', 'cyan');
  log('║              SETUP DATABASE - Fresh Install          ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════╝', 'cyan');

  try {
    // Connect to postgres database to create our database
    const client = new Client({ ...CONFIG, database: 'postgres' });
    await client.connect();
    log('\n✓ Connected to PostgreSQL', 'green');

    // Check if database exists
    const dbCheck = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [CONFIG.database]
    );

    if (dbCheck.rows.length === 0) {
      log(`\n📝 Creating database '${CONFIG.database}'...`, 'blue');
      await client.query(`CREATE DATABASE "${CONFIG.database}"`);
      log(`✓ Database '${CONFIG.database}' created`, 'green');
    } else {
      log(`\n✓ Database '${CONFIG.database}' already exists`, 'green');
    }

    await client.end();

    // Now connect to the created database and run setup
    const dbClient = new Client(CONFIG);
    await dbClient.connect();

    log('\n📝 Creating tables and schema...', 'blue');
    const setupPath = path.join(__dirname, 'full_setup.sql');

    if (!fs.existsSync(setupPath)) {
      throw new Error(`Setup file not found: ${setupPath}`);
    }

    const setupSql = fs.readFileSync(setupPath, 'utf8');
    await dbClient.query(setupSql);
    log('✓ Tables and schema created', 'green');

    // Run migrations
    log('\n📝 Running migrations...', 'blue');
    const migrationsDir = path.join(__dirname, 'migrations');

    if (fs.existsSync(migrationsDir)) {
      const migrations = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql') && /^\d+_/.test(f))
        .sort();

      for (const migration of migrations) {
        try {
          log(`   → ${migration}`, 'cyan');
          const migrationSql = fs.readFileSync(path.join(migrationsDir, migration), 'utf8');
          await dbClient.query(migrationSql);
          log(`   ✓ ${migration}`, 'green');
        } catch (err) {
          log(`   ⚠️  ${migration}: ${err.message}`, 'yellow');
        }
      }
    }

    await dbClient.end();

    log('\n✅ Database setup completed successfully!', 'green');
    log('\n📊 Setup Summary:', 'cyan');
    log('   ✓ Database created', 'green');
    log('   ✓ All tables created', 'green');
    log('   ✓ Migrations applied', 'green');
    log('   ✓ Super Admin user: admin@mscan.com', 'green');
    log('\n💡 Next: Start your server and login!\n', 'cyan');

  } catch (err) {
    log(`\n✗ Error: ${err.message}`, 'red');
    throw err;
  }
}

// ============================================
// 2. CLEAN TENANT DATA
// ============================================
async function cleanTenantData(skipConfirm = false) {
  log('\n╔═══════════════════════════════════════════════════════╗', 'cyan');
  log('║         CLEAN TENANT DATA - Keep Tenant Records      ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════╝', 'cyan');

  const pool = new Pool(CONFIG);

  try {
    // Get counts
    const client = await pool.connect();
    const result = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM tenants) as tenants,
        (SELECT COUNT(*) FROM users WHERE role = 'SUPER_ADMIN') as super_admins,
        (SELECT COUNT(*) FROM users WHERE role != 'SUPER_ADMIN') as tenant_users,
        (SELECT COUNT(*) FROM coupons) as coupons,
        (SELECT COUNT(*) FROM products) as products
    `);
    client.release();

    const counts = result.rows[0];

    log('\n⚠️  This will clean all operational data', 'yellow');
    log('\nWill DELETE:', 'red');
    log(`  • Tenant Users: ${counts.tenant_users}`, 'yellow');
    log(`  • Coupons: ${counts.coupons}`, 'yellow');
    log(`  • Products: ${counts.products}`, 'yellow');
    log(`  • All scans, batches, apps, credits`, 'yellow');

    log('\nWill KEEP:', 'green');
    log(`  • Tenants: ${counts.tenants}`, 'cyan');
    log(`  • Super Admins: ${counts.super_admins}`, 'cyan');

    if (!skipConfirm) {
      const confirm = await ask('\nType "CLEAN" to confirm: ');
      if (confirm !== 'CLEAN') {
        log('\n✗ Cancelled', 'yellow');
        return;
      }
    }

    // Clean data
    const cleanClient = await pool.connect();
    await cleanClient.query('BEGIN');

    log('\n🧹 Cleaning data...', 'blue');

    const tables = [
      'audit_logs', 'scans', 'coupons', 'batches', 'product_tags',
      'products', 'product_templates', 'tags', 'categories',
      'verification_apps', 'credit_transactions', 'tenant_credit_balance',
      'credit_requests'
    ];

    for (const table of tables) {
      try {
        await cleanClient.query(`DELETE FROM ${table}`);
        log(`  ✓ ${table}`, 'green');
      } catch (err) {
        if (err.code !== '42P01') {
          log(`  ⚠️  ${table}: ${err.message}`, 'yellow');
        }
      }
    }

    await cleanClient.query(`DELETE FROM otps WHERE email IN (SELECT email FROM users WHERE role != 'SUPER_ADMIN')`);
    await cleanClient.query(`DELETE FROM token_blacklist WHERE user_id IN (SELECT id FROM users WHERE role != 'SUPER_ADMIN')`);
    await cleanClient.query(`DELETE FROM users WHERE role != 'SUPER_ADMIN'`);

    await cleanClient.query('COMMIT');
    cleanClient.release();

    log('\n✅ Cleanup completed!', 'green');
    log(`   Tenants preserved: ${counts.tenants}`, 'cyan');
    log(`   Super Admins preserved: ${counts.super_admins}\n`, 'cyan');

  } catch (err) {
    log(`\n✗ Error: ${err.message}`, 'red');
    throw err;
  } finally {
    await pool.end();
  }
}

// ============================================
// 3. CLEAN ALL DATA (Keep Super Admin)
// ============================================
async function cleanAllData(skipConfirm = false) {
  log('\n╔═══════════════════════════════════════════════════════╗', 'cyan');
  log('║      CLEAN ALL DATA - Keep Super Admin Users Only    ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════╝', 'cyan');

  const pool = new Pool(CONFIG);

  try {
    // Get counts
    const client = await pool.connect();
    const result = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM tenants) as tenants,
        (SELECT COUNT(*) FROM users WHERE role = 'SUPER_ADMIN') as super_admins,
        (SELECT COUNT(*) FROM users WHERE role != 'SUPER_ADMIN') as tenant_users,
        (SELECT COUNT(*) FROM coupons) as coupons,
        (SELECT COUNT(*) FROM products) as products
    `);
    client.release();

    const counts = result.rows[0];

    log('\n⚠️  WARNING: This will delete ALL data!', 'red');
    log('\nWill DELETE:', 'red');
    log(`  • Tenants: ${counts.tenants}`, 'yellow');
    log(`  • Tenant Users: ${counts.tenant_users}`, 'yellow');
    log(`  • Coupons: ${counts.coupons}`, 'yellow');
    log(`  • Products: ${counts.products}`, 'yellow');
    log(`  • Everything else`, 'yellow');

    log('\nWill KEEP:', 'green');
    log(`  • Super Admins: ${counts.super_admins}`, 'cyan');

    if (!skipConfirm) {
      const confirm = await ask('\nType "DELETE ALL" to confirm: ');
      if (confirm !== 'DELETE ALL') {
        log('\n✗ Cancelled', 'yellow');
        return;
      }
    }

    // Clean data
    const cleanClient = await pool.connect();
    await cleanClient.query('BEGIN');

    log('\n🧹 Deleting all data...', 'blue');

    const tables = [
      'audit_logs', 'scans', 'coupons', 'batches', 'product_tags',
      'products', 'product_templates', 'tags', 'categories',
      'verification_apps', 'credit_transactions', 'tenant_credit_balance',
      'credit_requests'
    ];

    for (const table of tables) {
      try {
        await cleanClient.query(`DELETE FROM ${table}`);
        log(`  ✓ ${table}`, 'green');
      } catch (err) {
        if (err.code !== '42P01') {
          log(`  ⚠️  ${table}: ${err.message}`, 'yellow');
        }
      }
    }

    await cleanClient.query(`DELETE FROM otps WHERE email IN (SELECT email FROM users WHERE role != 'SUPER_ADMIN')`);
    await cleanClient.query(`DELETE FROM token_blacklist WHERE user_id IN (SELECT id FROM users WHERE role != 'SUPER_ADMIN')`);
    await cleanClient.query(`DELETE FROM users WHERE role != 'SUPER_ADMIN'`);
    await cleanClient.query(`DELETE FROM tenants`);

    await cleanClient.query('COMMIT');
    cleanClient.release();

    log('\n✅ Cleanup completed!', 'green');
    log(`   Super Admins preserved: ${counts.super_admins}\n`, 'cyan');

  } catch (err) {
    log(`\n✗ Error: ${err.message}`, 'red');
    throw err;
  } finally {
    await pool.end();
  }
}

// ============================================
// 4. DROP DATABASE
// ============================================
async function dropDatabase(skipConfirm = false) {
  log('\n╔═══════════════════════════════════════════════════════╗', 'red');
  log('║           DROP DATABASE - Complete Destruction        ║', 'red');
  log('╚═══════════════════════════════════════════════════════╝', 'red');

  try {
    const client = new Client({ ...CONFIG, database: 'postgres' });
    await client.connect();

    // Check if database exists
    const dbCheck = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [CONFIG.database]
    );

    if (dbCheck.rows.length === 0) {
      log(`\n✓ Database '${CONFIG.database}' does not exist`, 'green');
      await client.end();
      return;
    }

    log(`\n⚠️  This will COMPLETELY DELETE database: ${CONFIG.database}`, 'red');
    log('   • The database itself', 'yellow');
    log('   • ALL tables and data', 'yellow');
    log('   • Super Admin users', 'yellow');
    log('   • EVERYTHING', 'yellow');

    if (!skipConfirm) {
      const confirm = await ask('\nType "DROP" to confirm: ');
      if (confirm !== 'DROP') {
        log('\n✗ Cancelled', 'yellow');
        await client.end();
        return;
      }
    }

    // Terminate connections
    log('\n🔌 Terminating connections...', 'blue');
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [CONFIG.database]);

    // Drop database
    log(`💥 Dropping database...`, 'red');
    await client.query(`DROP DATABASE "${CONFIG.database}"`);

    await client.end();

    log(`\n✅ Database '${CONFIG.database}' dropped successfully!`, 'green');
    log('\n💡 Next: Run "setup" to recreate\n', 'cyan');

  } catch (err) {
    log(`\n✗ Error: ${err.message}`, 'red');
    throw err;
  }
}

// ============================================
// INTERACTIVE MENU
// ============================================
async function showMenu() {
  log('\n╔═══════════════════════════════════════════════════════╗', 'cyan');
  log('║           MScan Database Manager v1.0                 ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════╝', 'cyan');
  log('\nChoose an option:', 'bright');
  log('  1. Setup Database (create fresh database)', 'green');
  log('  2. Clean Tenant Data (keep tenants, delete operational data)', 'yellow');
  log('  3. Clean All Data (delete tenants, keep super admin)', 'yellow');
  log('  4. Drop Database (complete destruction)', 'red');
  log('  5. Exit', 'cyan');

  const choice = await ask('\nEnter choice (1-5): ');

  switch (choice) {
    case '1':
      await setupDatabase();
      break;
    case '2':
      await cleanTenantData();
      break;
    case '3':
      await cleanAllData();
      break;
    case '4':
      await dropDatabase();
      break;
    case '5':
      log('\n👋 Goodbye!\n', 'cyan');
      process.exit(0);
    default:
      log('\n✗ Invalid choice', 'red');
  }
}

// ============================================
// MAIN
// ============================================
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const skipConfirm = args.includes('--yes');

  try {
    if (!command) {
      // Interactive menu
      await showMenu();
    } else {
      // Command line
      switch (command) {
        case 'setup':
          await setupDatabase();
          break;
        case 'clean-tenant':
          await cleanTenantData(skipConfirm);
          break;
        case 'clean-all':
          await cleanAllData(skipConfirm);
          break;
        case 'drop':
          await dropDatabase(skipConfirm);
          break;
        default:
          log(`\n✗ Unknown command: ${command}`, 'red');
          log('\nUsage:', 'cyan');
          log('  node db-manager.js                  (interactive menu)', 'cyan');
          log('  node db-manager.js setup            (setup database)', 'cyan');
          log('  node db-manager.js clean-tenant     (clean tenant data)', 'cyan');
          log('  node db-manager.js clean-all        (clean all data)', 'cyan');
          log('  node db-manager.js drop             (drop database)', 'cyan');
          log('\nAdd --yes to skip confirmations\n', 'cyan');
          process.exit(1);
      }
    }

    process.exit(0);

  } catch (err) {
    log(`\n✗ Fatal error: ${err.message}`, 'red');
    console.error(err);
    process.exit(1);
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  log('\n\n✗ Cancelled by user (Ctrl+C)\n', 'yellow');
  process.exit(0);
});

// Run
main();
