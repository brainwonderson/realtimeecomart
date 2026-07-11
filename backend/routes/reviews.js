const express = require('express');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/product/:productId', async (req, res) => {
  const productId = req.params.productId;
  try {
    const [rows] = await pool.query(
      'SELECT r.id, r.rating, r.comment, r.created_at, u.name AS user_name FROM reviews r LEFT JOIN users u ON u.id = r.user_id WHERE r.product_id = ? ORDER BY r.created_at DESC',
      [productId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.post('/product/:productId', verifyToken, async (req, res) => {
  const productId = req.params.productId;
  const { rating, comment, orderId = null } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1-5' });
  try {
    const [existing] = await pool.query('SELECT id FROM reviews WHERE user_id = ? AND product_id = ?', [req.user.id, productId]);
    if (existing.length) return res.status(400).json({ error: 'you already reviewed this product' });
    await pool.query('INSERT INTO reviews (user_id, product_id, order_id, rating, comment) VALUES (?,?,?,?,?)', [req.user.id, productId, orderId, rating, comment || '']);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

module.exports = router;
