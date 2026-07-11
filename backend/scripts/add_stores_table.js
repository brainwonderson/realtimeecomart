/**
 * Migration: Create stores table
 * Run: node backend/scripts/add_stores_table.js
 */
const pool = require('../db')

async function run() {
  const conn = await pool.getConnection()
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`stores\` (
        \`id\`          INT AUTO_INCREMENT PRIMARY KEY,
        \`seller_id\`   INT NOT NULL UNIQUE,
        \`name\`        VARCHAR(255) NOT NULL,
        \`description\` TEXT,
        \`logo\`        VARCHAR(512),
        \`banner\`      VARCHAR(512),
        \`is_open\`     TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_stores_seller_id\` (\`seller_id\`)
      ) ENGINE=InnoDB;
    `)
    console.log('✅  Table `stores` created (or already exists).')
  } finally {
    conn.release()
    process.exit(0)
  }
}

run().catch(err => { console.error(err); process.exit(1) })
