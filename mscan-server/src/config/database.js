/**
 * Database Connection Pool
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('📦 Database pool connection established');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

/**
 * Database Health Check
 * Tests database connection with a simple query
 * @returns {Promise<Object>} Health check result with status and details
 */
async function checkDatabaseHealth() {
  const startTime = Date.now();

  try {
    // Try to connect and run a simple query
    const result = await pool.query('SELECT NOW() as current_time, current_database() as database');
    const responseTime = Date.now() - startTime;

    return {
      success: true,
      status: 'healthy',
      database: result.rows[0].database,
      timestamp: result.rows[0].current_time,
      responseTime: `${responseTime}ms`,
      config: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'mscan_db',
        user: process.env.DB_USER || 'postgres'
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      success: false,
      status: 'unhealthy',
      error: error.message,
      code: error.code,
      responseTime: `${responseTime}ms`,
      config: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'mscan_db',
        user: process.env.DB_USER || 'postgres'
      }
    };
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
  checkHealth: checkDatabaseHealth,
};
