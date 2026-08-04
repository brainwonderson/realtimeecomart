const express = require('express');
const router = express.Router();
const pool = require('../lib/db');
const { verifyToken } = require('../lib/auth');

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
    if (q) {
      const escapedQ = q.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regexPattern = `\\b${escapedQ}\\b`;
      sql += ' AND (p.title LIKE ? OR p.description REGEXP ?)';
      params.push('%' + q + '%', regexPattern);
    }
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
    res.status(500).json({ error: 'server error' });
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

/* ─── KATEGORI PRODUK ────────────────────────────────────────── */
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name FROM categories WHERE status = 'APPROVED' ORDER BY name ASC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

router.post('/categories', verifyToken, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nama kategori tidak boleh kosong.' });
  }
  const categoryName = name.trim();
  try {
    const [existing] = await pool.query("SELECT id, status FROM categories WHERE name = ?", [categoryName]);
    if (existing.length) {
      const status = existing[0].status;
      if (status === 'APPROVED') {
        return res.status(400).json({ error: `Kategori "${categoryName}" sudah ada.` });
      } else if (status === 'PENDING') {
        return res.status(400).json({ error: `Kategori "${categoryName}" sedang menunggu persetujuan admin.` });
      } else {
        await pool.query(
          "UPDATE categories SET status = 'PENDING', created_by = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?",
          [req.user.id, existing[0].id]
        );
        return res.json({ message: 'Kategori berhasil diajukan kembali.' });
      }
    }

    await pool.query(
      "INSERT INTO categories (name, status, created_by) VALUES (?, 'PENDING', ?)",
      [categoryName, req.user.id]
    );
    res.json({ message: 'Kategori baru berhasil diajukan, menunggu persetujuan admin.' });
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
        "SELECT COUNT(*) AS total_products FROM products WHERE seller_id = ? AND status = 'ACTIVE'",
        [rows[0].seller_id]
      );
      rows[0].store_total_products = countResult[0].total_products;
    } else {
      rows[0].store_total_products = 0;
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
