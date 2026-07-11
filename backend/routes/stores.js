/**
 * Public store routes — no auth required
 * Mounted at /api/stores
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/stores — search/list stores
router.get('/', async (req, res) => {
  const { q, limit = 40 } = req.query;
  try {
    let sql = `
      SELECT s.*, u.name AS seller_name
      FROM stores s
      LEFT JOIN users u ON u.id = s.seller_id
    `;
    const params = [];
    if (q) {
      sql += ` WHERE EXISTS (
        SELECT 1 FROM products p
        WHERE p.seller_id = s.seller_id
          AND p.status = 'ACTIVE'
          AND (p.title LIKE ? OR p.description LIKE ?)
      )`;
      params.push(`%${q}%`, `%${q}%`);
    }
    sql += ' LIMIT ?';
    params.push(Number(limit));

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/stores/:id — profil publik toko
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await pool.query(
      `SELECT s.*, u.name AS seller_name
       FROM stores s
       LEFT JOIN users u ON u.id = s.seller_id
       WHERE s.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Toko tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/stores/:id/products — produk aktif dari toko
router.get('/:id/products', async (req, res) => {
  const id = req.params.id;
  const { sort = 'newest', limit = 40, offset = 0 } = req.query;
  try {
    // Cari seller_id dari store id
    const [storeRows] = await pool.query('SELECT seller_id FROM stores WHERE id = ?', [id]);
    if (!storeRows.length) return res.status(404).json({ error: 'Toko tidak ditemukan' });

    const sellerId = storeRows[0].seller_id;
    let sql = `
      SELECT id, seller_id, title, price, stock, image, description, category, status, created_at
      FROM products
      WHERE seller_id = ? AND status = 'ACTIVE'
    `;
    const params = [sellerId];
    if (sort === 'price_asc')  sql += ' ORDER BY price ASC';
    else if (sort === 'price_desc') sql += ' ORDER BY price DESC';
    else                            sql += ' ORDER BY created_at DESC';
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
