#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config();

const CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mscan_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin'
};

async function checkTagsTable() {
  const client = new Client(CONFIG);
  try {
    await client.connect();

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'tags'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 tags table schema:');
    console.log('═══════════════════════════════════════');

    if (result.rows.length === 0) {
      console.log('❌ Table "tags" not found!');
    } else {
      result.rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row.column_name} (${row.data_type})`);
      });
      console.log(`\n✅ Tags table exists with ${result.rows.length} columns\n`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTagsTable();
