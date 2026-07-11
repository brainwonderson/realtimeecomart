const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'realtime'
  });

  try {
    console.log('Running ALTER query to update proposal status enum...');
    await conn.query(`
      ALTER TABLE \`flash_sale_proposals\`
      MODIFY COLUMN \`status\` ENUM('PENDING','APPROVED','REJECTED','EXPIRED') NOT NULL DEFAULT 'PENDING'
    `);
    console.log('Successfully updated status column enum!');
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('ALTER query error:', err.message || err);
    process.exit(1);
  }
}

run();
