const express = require('express');
const router = express.Router();
const pool = require('../lib/db');

const demoProducts = [
  { id: 1, title: 'Wireless Headphone', price: 299000, image: 'https://picsum.photos/seed/headphone/400/400', description: 'Headphone nirkabel dengan kualitas suara jernih.', category: 'Audio', seller_id: null, store_name: null, store_id: null },
  { id: 2, title: 'Smart Watch',        price: 499000, image: 'https://picsum.photos/seed/watch/400/400',     description: 'Jam pintar untuk aktivitas harian.', category: 'Wearables', seller_id: null, store_name: null, store_id: null },
  { id: 3, title: 'Backpack',           price: 199000, image: 'https://picsum.photos/seed/bag/400/400',       description: 'Tas ransel simple untuk kebutuhan kerja dan kuliah.', category: 'Bag', seller_id: null, store_name: null, store_id: null }
];

// GET /api/products — list with search, category filter, sorting
router.get('/', async (req, res) => {
  const { q, category, sort = 'newest', limit = 40, offset = 0 } = req.query;
  try {
    let sql = `
      SELECT p.id, p.seller_id, p.title, p.price, p.original_price, p.stock, p.image, p.description,
             p.category, p.status, p.created_at, p.colors, p.sizes, p.media,
             s.id AS store_id, s.name AS store_name, s.logo AS store_logo, s.is_open AS store_is_open,
             u.name AS seller_name
      FROM products p
      LEFT JOIN stores s ON s.seller_id = p.seller_id
      LEFT JOIN users u  ON u.id = p.seller_id
      WHERE p.status = 'ACTIVE'
    `;
    const params = [];
    if (q) { sql += ' AND (p.title LIKE ? OR p.description LIKE ?)'; params.push('%' + q + '%', '%' + q + '%'); }
    if (category) { sql += ' AND p.category = ?'; params.push(category); }
    if (sort === 'price_asc')  sql += ' ORDER BY p.price ASC';
    else if (sort === 'price_desc') sql += ' ORDER BY p.price DESC';
    else if (sort === 'popular')    sql += ' ORDER BY p.stock DESC, p.created_at DESC';
    else                            sql += ' ORDER BY p.created_at DESC';
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.json(demoProducts);
  }
});

// GET /api/products/:id — single product with store info
router.get('/flash-sale', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pr.id, pr.seller_id, pr.title, pr.price, pr.stock, pr.image, pr.category, pr.status,
              f.original_price, f.flash_sale_price,
              e.id AS event_id, e.name AS event_title, e.start_at, e.end_at
       FROM flash_sale_proposals f
       JOIN products pr ON pr.id = f.product_id
       JOIN flash_sale_events e ON e.id = f.event_id
       WHERE f.status = 'APPROVED'
         AND e.is_active = 1
         AND e.start_at <= NOW()
         AND e.end_at >= NOW()
         AND pr.status = 'ACTIVE'
       ORDER BY e.start_at DESC, f.created_at DESC
       LIMIT 20`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

router.get('/flash-sale/events', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, `name` AS title, start_at, end_at, is_active, created_by FROM flash_sale_events WHERE is_active = 1 AND end_at >= NOW() ORDER BY start_at ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.seller_id, p.title, p.price, p.original_price, p.stock, p.image, p.description,
              p.category, p.status, p.created_at, p.colors, p.sizes, p.media,
              s.id AS store_id, s.name AS store_name, s.description AS store_description,
              s.logo AS store_logo, s.banner AS store_banner, s.is_open AS store_is_open, s.created_at AS store_created_at,
              u.name AS seller_name
       FROM products p
       LEFT JOIN stores s ON s.seller_id = p.seller_id
       LEFT JOIN users u  ON u.id = p.seller_id
       WHERE p.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'not found' });

    // Hitung jumlah produk aktif dari toko ini
    if (rows[0].store_id) {
      const [countResult] = await pool.query(
        'SELECT COUNT(*) AS total_products FROM products WHERE seller_id = ? AND status = "ACTIVE"',
        [rows[0].seller_id]
      );
      rows[0].store_total_products = countResult[0].total_products;
    } else {
      rows[0].store_total_products = 0;
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    const demo = demoProducts.find(p => String(p.id) === String(id));
    if (demo) return res.json(demo);
    res.status(404).json({ error: 'not found' });
  }
});

module.exports = router;
