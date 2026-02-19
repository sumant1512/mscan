/**
 * Seed Sample Templates
 * Creates Wall Paint and T-Shirt templates with sample tags
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mscan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
});

async function seedTemplates() {
  const client = await pool.connect();

  try {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║       Seeding Sample Product Templates               ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    // Check if we have at least one tenant
    const tenantCheck = await client.query('SELECT COUNT(*) FROM tenants');
    const tenantCount = parseInt(tenantCheck.rows[0].count);

    if (tenantCount === 0) {
      console.log('⚠️  No tenants found in database!');
      console.log('');
      console.log('📋 You need to create a tenant first before seeding templates.');
      console.log('');
      console.log('Options:');
      console.log('  1. Run the application and create a tenant through the UI');
      console.log('  2. Use the API to create a tenant');
      console.log('  3. Run npm run db:reset to start fresh with full setup\n');
      process.exit(1);
    }

    console.log(`✅ Found ${tenantCount} tenant(s) in database`);

    // Check if templates already exist
    const templateCheck = await client.query('SELECT COUNT(*) FROM product_templates');
    const templateCount = parseInt(templateCheck.rows[0].count);

    if (templateCount > 0) {
      console.log(`\n⚠️  Found ${templateCount} existing template(s)`);
      console.log('');
      console.log('This will add 2 more templates (Wall Paint & T-Shirt).');
      console.log('');

      // Simple prompt (in production, use proper prompts library)
      const args = process.argv.slice(2);
      if (!args.includes('--force') && !args.includes('-f')) {
        console.log('Run with --force to proceed anyway, or Ctrl+C to cancel.\n');
        process.exit(0);
      }
    }

    console.log('\n📁 Reading seed SQL file...');
    const sqlPath = path.join(__dirname, 'seeds', '001_create_sample_templates.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🌱 Seeding templates and tags...\n');

    // Execute the SQL with enhanced notice handling
    await client.query('SET client_min_messages = NOTICE');

    await client.query(sql);

    console.log('\n✅ Sample templates seeded successfully!');

    // Verify the seeded data
    console.log('\n🔍 Verifying seeded data...\n');

    const verifyQuery = `
      SELECT
        pt.template_name,
        pt.industry_type,
        pt.description,
        COUNT(DISTINCT t.id) as tag_count
      FROM product_templates pt
      LEFT JOIN verification_apps va ON pt.tenant_id = va.tenant_id
      LEFT JOIN tags t ON t.verification_app_id = va.id
      WHERE pt.template_name IN ('Wall Paint & Coating', 'T-Shirt & Apparel')
      GROUP BY pt.id, pt.template_name, pt.industry_type, pt.description
      ORDER BY pt.template_name;
    `;

    const verifyResult = await client.query(verifyQuery);

    if (verifyResult.rows.length > 0) {
      console.log('Seeded templates:');
      verifyResult.rows.forEach((row, idx) => {
        console.log(`  ${idx + 1}. ${row.template_name} (${row.industry_type})`);
        console.log(`     Description: ${row.description}`);
        console.log(`     Tags: ${row.tag_count}`);
      });
    }

    // Count total tags
    const tagsQuery = `
      SELECT COUNT(*) as total
      FROM tags t
      WHERE EXISTS (
        SELECT 1 FROM verification_apps va
        WHERE va.id = t.verification_app_id
        AND va.app_name = 'Sample App'
      );
    `;

    const tagsResult = await client.query(tagsQuery);
    const totalTags = parseInt(tagsResult.rows[0].total);

    console.log('\n📊 Summary:');
    console.log(`  • Templates created: ${verifyResult.rows.length}`);
    console.log(`  • Tags created: ${totalTags}`);

    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║            Seeding Complete                          ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('✨ You can now use these templates to create products!\n');

  } catch (error) {
    console.error('\n❌ Error seeding templates:');
    console.error(error.message);

    if (error.code) {
      console.error(`Error Code: ${error.code}`);
    }

    if (error.message.includes('No tenant found')) {
      console.error('\n💡 This error means you need to create a tenant first.');
    } else {
      console.error('\n💡 Troubleshooting:');
      console.error('  1. Make sure the database exists and is set up');
      console.error('  2. Verify database credentials in .env');
      console.error('  3. Ensure you have at least one tenant');
      console.error('  4. Run npm run db:setup if starting fresh\n');
    }

    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
seedTemplates().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
