const pool = require('../db');

async function list() {
  try {
    const [rows] = await pool.query('SELECT id, name, email, created_at FROM users ORDER BY id DESC LIMIT 50');
    console.log('Users:', rows);
    await pool.end();
  } catch (err) {
    console.error('Error querying users:', err.message || err);
    process.exit(1);
  }
}

list();
