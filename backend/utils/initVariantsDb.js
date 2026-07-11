const pool = require('../db');

async function initVariantsTable() {
  const migrations = [
    // 1. Add colors, sizes, media to products
    {
      check: "SHOW COLUMNS FROM products LIKE 'colors'",
      apply: "ALTER TABLE products ADD COLUMN colors TEXT DEFAULT NULL"
    },
    {
      check: "SHOW COLUMNS FROM products LIKE 'sizes'",
      apply: "ALTER TABLE products ADD COLUMN sizes TEXT DEFAULT NULL"
    },
    {
      check: "SHOW COLUMNS FROM products LIKE 'media'",
      apply: "ALTER TABLE products ADD COLUMN media TEXT DEFAULT NULL"
    },
    // 2. Add selected_color, selected_size to carts
    {
      check: "SHOW COLUMNS FROM carts LIKE 'selected_color'",
      apply: "ALTER TABLE carts ADD COLUMN selected_color VARCHAR(100) DEFAULT NULL"
    },
    {
      check: "SHOW COLUMNS FROM carts LIKE 'selected_size'",
      apply: "ALTER TABLE carts ADD COLUMN selected_size VARCHAR(100) DEFAULT NULL"
    },
    // 3. Add selected_color, selected_size to order_items
    {
      check: "SHOW COLUMNS FROM order_items LIKE 'selected_color'",
      apply: "ALTER TABLE order_items ADD COLUMN selected_color VARCHAR(100) DEFAULT NULL"
    },
    {
      check: "SHOW COLUMNS FROM order_items LIKE 'selected_size'",
      apply: "ALTER TABLE order_items ADD COLUMN selected_size VARCHAR(100) DEFAULT NULL"
    }
  ];

  for (const m of migrations) {
    try {
      const [rows] = await pool.query(m.check);
      if (rows.length === 0) {
        await pool.query(m.apply);
        console.log(`Database migration applied: ${m.apply}`);
      }
    } catch (err) {
      console.error(`Migration step failed for query [${m.apply}]:`, err);
    }
  }
}

module.exports = { initVariantsTable };
