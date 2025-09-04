// create-admin-insert.js
require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

(async () => {
  const {
    DATABASE_URL,
    PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT,
    ADMIN_USERNAME = 'admin',
    ADMIN_EMAIL = 'admin@example.com',
    ADMIN_PASSWORD = 'admin123',
    PASSWORD_COLUMN = 'password_hash' // set to 'password' if your table uses password
  } = process.env;

  const clientConfig = DATABASE_URL ? { connectionString: DATABASE_URL } : {
    host: PGHOST || 'localhost',
    user: PGUSER || 'postgres',
    password: PGPASSWORD || '',
    database: PGDATABASE || 'postgres',
    port: PGPORT ? parseInt(PGPORT) : 5432,
  };

  const client = new Client(clientConfig);

  try {
    await client.connect();

    // basic checks
    if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 6) {
      throw new Error('ADMIN_PASSWORD must be set and at least 6 characters. Use environment variable ADMIN_PASSWORD.');
    }

    // check duplicates
    const dup = await client.query('SELECT id FROM users WHERE username = $1 OR email = $2', [ADMIN_USERNAME, ADMIN_EMAIL]);
    if (dup.rows.length > 0) {
      console.error('A user with that username or email already exists:', dup.rows);
      process.exit(1);
    }

    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // build parameterized query dynamically using chosen password column
    const columns = ['username', 'email', PASSWORD_COLUMN, 'is_admin', 'created_at'];
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const text = `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id, username, email, is_admin, created_at`;
    const values = [ADMIN_USERNAME, ADMIN_EMAIL, hashed, true, new Date()];

    const res = await client.query(text, values);
    console.log('Admin user created:', res.rows[0]);
    console.log('IMPORTANT: delete this script and rotate the password if necessary.');
  } catch (err) {
    console.error('Failed to create admin:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
