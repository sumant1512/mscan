/**
 * Data Migration: Multi-App Architecture
 * 
 * This script:
 * 1. Runs the SQL migration
 * 2. Generates codes and API keys for existing verification apps
 * 3. Creates default app for tenants without apps
 * 4. Assigns existing categories/products to default app
 * 5. Adds constraints
 */

const { Pool } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mscan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
});

// Generate URL-friendly code from app name
function generateCode(appName, existingCodes = []) {
  let code = appName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Handle duplicates
  let finalCode = code;
  let counter = 1;
  while (existingCodes.includes(finalCode)) {
    finalCode = `${code}-${counter}`;
    counter++;
  }
  
  return finalCode;
}

// Generate secure API key
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

async function runMigration() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Starting multi-app architecture migration...\n');
    
    // Step 1: Run SQL migration
    console.log('📝 Step 1: Running SQL schema migration...');
    const sqlPath = path.join(__dirname, 'add-multi-app-architecture.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('✅ Schema migration completed\n');
    
    // Step 2: Update existing verification apps with codes and API keys
    console.log('📝 Step 2: Generating codes and API keys for existing apps...');
    const existingApps = await client.query(`
      SELECT id, tenant_id, app_name, code, api_key 
      FROM verification_apps 
      ORDER BY tenant_id, created_at
    `);
    
    const tenantCodes = {}; // Track codes per tenant to ensure uniqueness
    
    for (const app of existingApps.rows) {
      if (!app.code) {
        const tenantId = app.tenant_id;
        if (!tenantCodes[tenantId]) {
          tenantCodes[tenantId] = [];
        }
        
        const code = generateCode(app.app_name, tenantCodes[tenantId]);
        const apiKey = generateApiKey();
        
        await client.query(`
          UPDATE verification_apps 
          SET code = $1, api_key = $2, is_active = true 
          WHERE id = $3
        `, [code, apiKey, app.id]);
        
        tenantCodes[tenantId].push(code);
        console.log(`   ✅ App "${app.app_name}" -> code: ${code}`);
      }
    }
    console.log(`✅ Updated ${existingApps.rows.length} verification apps\n`);
    
    // Step 3: Create default app for tenants that have categories/products but no app
    console.log('📝 Step 3: Creating default apps for tenants with existing data...');
    
    const tenantsNeedingApp = await client.query(`
      SELECT DISTINCT t.id, t.tenant_name
      FROM tenants t
      WHERE NOT EXISTS (
        SELECT 1 FROM verification_apps WHERE tenant_id = t.id
      )
      AND (
        EXISTS (SELECT 1 FROM categories WHERE tenant_id = t.id)
        OR EXISTS (SELECT 1 FROM products WHERE tenant_id = t.id)
      )
    `);
    
    for (const tenant of tenantsNeedingApp.rows) {
      const code = generateCode(`${tenant.tenant_name}-default`, tenantCodes[tenant.id] || []);
      const apiKey = generateApiKey();
      
      const result = await client.query(`
        INSERT INTO verification_apps (tenant_id, app_name, display_name, code, api_key, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING id
      `, [
        tenant.id,
        'Default App',
        `${tenant.tenant_name} Default`,
        code,
        apiKey
      ]);
      
      if (!tenantCodes[tenant.id]) {
        tenantCodes[tenant.id] = [];
      }
      tenantCodes[tenant.id].push(code);
      
      console.log(`   ✅ Created default app for tenant "${tenant.tenant_name}"`);
    }
    console.log(`✅ Created ${tenantsNeedingApp.rows.length} default apps\n`);
    
    // Step 4: Assign existing categories to default/first app per tenant
    console.log('📝 Step 4: Assigning categories to verification apps...');
    
    const unassignedCategories = await client.query(`
      SELECT c.id, c.tenant_id 
      FROM categories c 
      WHERE c.verification_app_id IS NULL
    `);
    
    for (const category of unassignedCategories.rows) {
      // Get first app for this tenant
      const app = await client.query(`
        SELECT id FROM verification_apps 
        WHERE tenant_id = $1 
        ORDER BY created_at LIMIT 1
      `, [category.tenant_id]);
      
      if (app.rows.length > 0) {
        await client.query(`
          UPDATE categories 
          SET verification_app_id = $1 
          WHERE id = $2
        `, [app.rows[0].id, category.id]);
      }
    }
    console.log(`✅ Assigned ${unassignedCategories.rows.length} categories\n`);
    
    // Step 5: Assign existing products to default/first app per tenant
    console.log('📝 Step 5: Assigning products to verification apps...');
    
    const unassignedProducts = await client.query(`
      SELECT p.id, p.tenant_id 
      FROM products p 
      WHERE p.verification_app_id IS NULL
    `);
    
    for (const product of unassignedProducts.rows) {
      // Get first app for this tenant
      const app = await client.query(`
        SELECT id FROM verification_apps 
        WHERE tenant_id = $1 
        ORDER BY created_at LIMIT 1
      `, [product.tenant_id]);
      
      if (app.rows.length > 0) {
        await client.query(`
          UPDATE products 
          SET verification_app_id = $1 
          WHERE id = $2
        `, [app.rows[0].id, product.id]);
      }
    }
    console.log(`✅ Assigned ${unassignedProducts.rows.length} products\n`);
    
    // Step 6: Add constraints
    console.log('📝 Step 6: Adding database constraints...');
    
    // Check if constraint already exists before adding
    const constraintExists = await client.query(`
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'unique_verification_app_code'
    `);
    
    if (constraintExists.rows.length === 0) {
      await client.query(`
        ALTER TABLE verification_apps 
        ADD CONSTRAINT unique_verification_app_code 
        UNIQUE (tenant_id, code)
      `);
    }
    
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_apps_api_key 
      ON verification_apps(api_key) 
      WHERE api_key IS NOT NULL
    `);
    
    console.log('✅ Constraints added\n');
    
    await client.query('COMMIT');
    
    console.log('🎉 Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Verification apps updated: ${existingApps.rows.length}`);
    console.log(`   - Default apps created: ${tenantsNeedingApp.rows.length}`);
    console.log(`   - Categories assigned: ${unassignedCategories.rows.length}`);
    console.log(`   - Products assigned: ${unassignedProducts.rows.length}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration();
