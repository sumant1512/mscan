#!/usr/bin/env node

/**
 * Drop All Tables Script
 * 
 * This script drops ALL tables and schema from the database.
 * Use with caution - this is a destructive operation!
 * 
 * Usage:
 *   node database/drop-all-tables.js
 */

const { Pool } = require('pg');

// Database configuration from environment or defaults
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mscan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
});

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function dropAllTables() {
  const client = await pool.connect();
  
  try {
    log('\n🗑️  Dropping all tables and schema...', 'yellow');
    
    // Drop all tables in the public schema
    await client.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        -- Disable triggers to avoid constraint issues
        SET session_replication_role = 'replica';
        
        -- Drop all tables
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
        
        -- Drop all views
        FOR r IN (SELECT table_name FROM information_schema.views WHERE table_schema = 'public') LOOP
          EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.table_name) || ' CASCADE';
        END LOOP;
        
        -- Drop all sequences
        FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
          EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
        END LOOP;
        
        -- Drop user-defined functions (skip extension functions)
        FOR r IN (
          SELECT p.proname as routine_name
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
          WHERE n.nspname = 'public'
          AND d.objid IS NULL  -- Exclude extension-owned functions
        ) LOOP
          EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.routine_name) || ' CASCADE';
        END LOOP;
        
        -- Drop all user-defined types (enums, composites)
        FOR r IN (
          SELECT t.typname
          FROM pg_type t
          JOIN pg_namespace n ON t.typnamespace = n.oid
          LEFT JOIN pg_depend d ON d.objid = t.oid AND d.deptype = 'e'
          WHERE n.nspname = 'public'
          AND t.typtype IN ('e', 'c')  -- enums and composite types
          AND d.objid IS NULL  -- Exclude extension-owned types
        ) LOOP
          EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
        
        -- Re-enable triggers
        SET session_replication_role = 'origin';
      END $$;
    `);
    
    log('✓ All tables and schema dropped successfully!', 'green');
    
    // Verify
    const result = await client.query(`
      SELECT COUNT(*) as count 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    const tableCount = parseInt(result.rows[0].count);
    
    if (tableCount === 0) {
      log('✓ Verification: Database is completely clean', 'green');
    } else {
      log(`⚠️  Warning: ${tableCount} table(s) still remain`, 'yellow');
    }
    
  } catch (error) {
    log(`\n✗ Error: ${error.message}`, 'red');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    log('\n╔═══════════════════════════════════════════════════════╗', 'cyan');
    log('║        DROP ALL TABLES - Database Wipe Script        ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════╝', 'cyan');
    
    // Test database connection
    log('\n🔌 Connecting to database...', 'cyan');
    const client = await pool.connect();
    const dbResult = await client.query('SELECT current_database()');
    const dbName = dbResult.rows[0].current_database;
    client.release();
    log(`✓ Connected to database: ${dbName}`, 'green');
    
    // Drop all tables
    await dropAllTables();
    
    log('\n✨ Database wiped successfully! Run migrate to recreate schema.\n', 'green');
    
    process.exit(0);
    
  } catch (error) {
    log(`\n✗ Failed to drop tables: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main();
