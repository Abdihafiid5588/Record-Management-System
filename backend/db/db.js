// db.js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false
});

// Set up event handlers
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  // Only log actual errors, not normal shutdown messages
  if (err.code !== 'XX000' && 
      !err.message.includes('shutdown') && 
      !err.message.includes('termination') &&
      !err.message.includes('{:shutdown, :db_termination}')) {
    console.error('❌ Database connection error:', err.message);
  }
});

// Test connection on startup
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection verified at:', result.rows[0].current_time);
  } catch (err) {
    console.error('❌ Database connection test failed:', err.message);
  }
}

// Test connection immediately
testConnection();

module.exports = {
  query: (text, params) => pool.query(text, params),
};
