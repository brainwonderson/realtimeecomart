const pool = require('../db');

async function runMigration() {
  try {
    console.log('Running migration: add_flash_sale_prices.sql');
    
    await pool.query(`
      ALTER TABLE flash_sale_proposals
      ADD COLUMN original_price DECIMAL(10,2) DEFAULT NULL AFTER message,
      ADD COLUMN flash_sale_price DECIMAL(10,2) DEFAULT NULL AFTER original_price
    `);
    
    console.log('Migration completed successfully!');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist, skipping migration.');
    } else {
      console.error('Migration failed:', err.message);
      throw err;
    }
  } finally {
    await pool.end();
  }
}

runMigration();
