#!/usr/bin/env node

/**
 * Cleanup All Tenant Data Script
 * 
 * This script deletes ALL tenant-related data while preserving
 * only the Super Admin user(s).
 * 
 * WARNING: This is a DESTRUCTIVE operation!
 * 
 * Usage:
 *   node database/cleanup-all-tenant-data.js
 * 
 * Or with confirmation bypass (BE CAREFUL!):
 *   node database/cleanup-all-tenant-data.js --yes
 */

const { Pool } = require('pg');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Database configuration from environment or defaults
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mscan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
});

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logBox(title, lines) {
  const maxLength = Math.max(title.length, ...lines.map(l => l.length)) + 4;
  const border = '═'.repeat(maxLength);
  
  console.log(`${colors.cyan}╔${border}╗${colors.reset}`);
  console.log(`${colors.cyan}║${colors.bold} ${title.padEnd(maxLength - 2)} ${colors.reset}${colors.cyan}║${colors.reset}`);
  console.log(`${colors.cyan}╠${border}╣${colors.reset}`);
  
  lines.forEach(line => {
    console.log(`${colors.cyan}║${colors.reset} ${line.padEnd(maxLength - 2)} ${colors.cyan}║${colors.reset}`);
  });
  
  console.log(`${colors.cyan}╚${border}╝${colors.reset}`);
}

async function getDataCounts() {
  const client = await pool.connect();
  
  try {
    const counts = {};
    
    // Count tenants
    const tenantResult = await client.query('SELECT COUNT(*) as count FROM tenants');
    counts.tenants = parseInt(tenantResult.rows[0].count);
    
    // Count users by role
    const userResult = await client.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `);
    
    counts.superAdmins = 0;
    counts.tenantUsers = 0;
    
    userResult.rows.forEach(row => {
      if (row.role === 'SUPER_ADMIN') {
        counts.superAdmins = parseInt(row.count);
      } else {
        counts.tenantUsers += parseInt(row.count);
      }
    });
    
    // Count rewards data (may not exist in all installations)
    try {
      const couponResult = await client.query('SELECT COUNT(*) as count FROM coupons');
      counts.coupons = parseInt(couponResult.rows[0].count);
      
      const scanResult = await client.query('SELECT COUNT(*) as count FROM scans');
      counts.scans = parseInt(scanResult.rows[0].count);
      
      const appResult = await client.query('SELECT COUNT(*) as count FROM verification_apps');
      counts.verificationApps = parseInt(appResult.rows[0].count);
      
      const creditResult = await client.query('SELECT COUNT(*) as count FROM credit_requests');
      counts.creditRequests = parseInt(creditResult.rows[0].count);
    } catch (err) {
      // Tables might not exist yet
      counts.coupons = 0;
      counts.scans = 0;
      counts.verificationApps = 0;
      counts.creditRequests = 0;
    }
    
    return counts;
    
  } finally {
    client.release();
  }
}

async function displaySummary(counts) {
  const toDelete = [
    `Tenants: ${counts.tenants}`,
    `Tenant Users: ${counts.tenantUsers}`,
    `Coupons: ${counts.coupons}`,
    `Scans: ${counts.scans}`,
    `Verification Apps: ${counts.verificationApps}`,
    `Credit Requests: ${counts.creditRequests}`
  ];
  
  const toPreserve = [
    `Super Admin Users: ${counts.superAdmins}`
  ];
  
  console.log('\n');
  logBox('⚠️  WARNING: DESTRUCTIVE OPERATION', [
    'This will permanently delete ALL tenant data!',
    'Only Super Admin users will be preserved.'
  ]);
  
  console.log('\n');
  log('Records to be DELETED:', 'red');
  toDelete.forEach(line => log(`  • ${line}`, 'yellow'));
  
  console.log('\n');
  log('Records to be PRESERVED:', 'green');
  toPreserve.forEach(line => log(`  • ${line}`, 'cyan'));
  
  console.log('\n');
}

async function promptConfirmation() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(
      `${colors.bold}${colors.red}Type "DELETE ALL DATA" to confirm: ${colors.reset}`,
      (answer) => {
        rl.close();
        resolve(answer.trim() === 'DELETE ALL DATA');
      }
    );
  });
}

async function executeCleanup() {
  const sqlFile = path.join(__dirname, 'cleanup-all-tenant-data.sql');
  
  if (!fs.existsSync(sqlFile)) {
    throw new Error(`SQL file not found: ${sqlFile}`);
  }
  
  const sql = fs.readFileSync(sqlFile, 'utf8');
  const client = await pool.connect();
  
  try {
    log('\n🔄 Executing cleanup...', 'blue');
    
    // Execute the cleanup SQL
    await client.query(sql);
    
    log('✓ Cleanup completed successfully!', 'green');
    
  } finally {
    client.release();
  }
}

async function verifyCleanup() {
  log('\n🔍 Verifying cleanup...', 'blue');
  
  const counts = await getDataCounts();
  
  if (counts.tenants > 0 || counts.tenantUsers > 0) {
    log('✗ Verification failed! Some tenant data remains.', 'red');
    return false;
  }
  
  if (counts.superAdmins === 0) {
    log('✗ Verification failed! No Super Admin users found!', 'red');
    return false;
  }
  
  log('✓ Verification passed!', 'green');
  log(`  • All tenant data deleted`, 'green');
  log(`  • ${counts.superAdmins} Super Admin user(s) preserved`, 'green');
  
  return true;
}

async function displayRemainingUsers() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT email, full_name, role, is_active, created_at
      FROM users
      ORDER BY created_at
    `);
    
    if (result.rows.length > 0) {
      console.log('\n');
      logBox('👥 REMAINING USERS', ['']);
      console.log('');
      
      result.rows.forEach(user => {
        const active = user.is_active ? '✓' : '✗';
        const date = new Date(user.created_at).toLocaleString();
        log(`${active} ${user.email}`, user.role === 'SUPER_ADMIN' ? 'green' : 'yellow');
        log(`   ${user.full_name} | ${user.role} | ${date}`, 'cyan');
      });
      
      console.log('');
    }
    
  } finally {
    client.release();
  }
}

async function main() {
  try {
    log('\n╔═══════════════════════════════════════════════════════╗', 'cyan');
    log('║   CLEANUP ALL TENANT DATA - Database Reset Script    ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════╝', 'cyan');
    
    // Test database connection
    log('\n🔌 Connecting to database...', 'blue');
    const client = await pool.connect();
    const dbResult = await client.query('SELECT current_database()');
    const dbName = dbResult.rows[0].current_database;
    client.release();
    log(`✓ Connected to database: ${dbName}`, 'green');
    
    // Get current data counts
    log('\n📊 Analyzing current data...', 'blue');
    const counts = await getDataCounts();
    
    // Check if there's any data to delete
    const hasData = counts.tenants > 0 || counts.tenantUsers > 0 || 
                    counts.coupons > 0 || counts.scans > 0;
    
    if (!hasData) {
      log('\n✓ No tenant data found. Database is already clean!', 'green');
      await displayRemainingUsers();
      process.exit(0);
    }
    
    // Display summary
    await displaySummary(counts);
    
    // Check for --yes flag
    const skipConfirmation = process.argv.includes('--yes');
    
    if (!skipConfirmation) {
      // Prompt for confirmation
      const confirmed = await promptConfirmation();
      
      if (!confirmed) {
        log('\n✗ Cleanup cancelled by user.', 'yellow');
        process.exit(0);
      }
    } else {
      log('\n⚠️  Skipping confirmation (--yes flag detected)', 'yellow');
    }
    
    // Execute cleanup
    await executeCleanup();
    
    // Verify cleanup
    const verified = await verifyCleanup();
    
    if (!verified) {
      log('\n✗ Cleanup verification failed!', 'red');
      process.exit(1);
    }
    
    // Display remaining users
    await displayRemainingUsers();
    
    log('\n✨ All done! Database has been reset successfully.', 'green');
    log('   Only Super Admin users remain.\n', 'green');
    
    process.exit(0);
    
  } catch (error) {
    log(`\n✗ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n\n✗ Cleanup cancelled by user (Ctrl+C)', 'yellow');
  pool.end();
  process.exit(0);
});

// Run the script
main();
