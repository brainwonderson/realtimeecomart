const pool = require('../db');

async function main() {
  try {
    const [rows] = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='realtime' AND TABLE_NAME='orders' AND COLUMN_NAME='midtrans_order_id'"
    );
    if (rows.length > 0) {
      console.log('Column midtrans_order_id already exists.');
    } else {
      await pool.query('ALTER TABLE orders ADD COLUMN midtrans_order_id VARCHAR(100) DEFAULT NULL');
      console.log('Column midtrans_order_id added successfully.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

main();
