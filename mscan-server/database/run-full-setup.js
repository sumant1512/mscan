/**
 * Full Setup Runner: executes database/full_setup.sql in one go
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mscan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
});

async function run() {
  const client = await pool.connect();
  try {
    const filePath = path.join(__dirname, 'full_setup.sql');
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log('🚀 Running full_setup.sql...');
    await client.query(sql);
    console.log('✅ Full setup completed successfully');
  } catch (err) {
    console.error('❌ Full setup failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
