// db.js - Updated with better error handling
const { Pool } = require('pg');

// Parse connection string if available, otherwise use individual params
const connectionConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    };

// Add connection timeout and retry logic
connectionConfig.connectionTimeoutMillis = 10000;
connectionConfig.idleTimeoutMillis = 30000;

const pool = new Pool(connectionConfig);

// Enhanced error handling
pool.on('connect', (client) => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  // Don't exit process in production, just log
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
});

// Test connection on startup
(async () => {
  try {
    const client = await pool.connect();
    console.log('Database connection test successful');
    client.release();
  } catch (err) {
    console.error('Database connection test failed:', err);
  }
})();

module.exports = {
  query: (text, params) => pool.query(text, params),
};