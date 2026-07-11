const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function run() {
  const sqlFile = path.resolve(__dirname, '..', 'migrations', 'schema.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error('schema.sql not found:', sqlFile);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlFile, 'utf8');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    multipleStatements: true
  });

  try {
    console.log('Running migrations...');
    await conn.query(sql);
    console.log('Migrations finished.');
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message || err);
    process.exit(1);
  }
}

run();
