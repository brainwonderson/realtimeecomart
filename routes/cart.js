const express = require('express');
const router = express.Router();
const pool = require('../lib/db');

// For simplicity, cart is stored in `carts` table per user
router.get('/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
  const [rows] = await pool.query(
    "SELECT c.id, c.product_id, c.quantity, c.selected_color, c.selected_size, COALESCE(p.title, CONCAT('Product #', c.product_id)) AS title, COALESCE(p.price, 0) AS price, COALESCE(p.image, '') AS image, COALESCE(p.category, '') AS category FROM carts c LEFT JOIN products p ON p.id = c.product_id WHERE c.user_id = ? ORDER BY c.created_at DESC",
    [userId]
  );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:err.message, code: err.code, sql: err.sql });
  }
});

router.post('/:userId', async (req, res) => {
  const userId = req.params.userId;

  console.log("USER ID:", userId);
  console.log("BODY:", req.body);

  const { productId, quantity = 1, selectedColor = null, selectedSize = null } = req.body;

  try {
    const [existing] = await pool.query(
      "SELECT id, quantity FROM carts WHERE user_id = ? AND product_id = ? AND COALESCE(selected_color, '') = COALESCE(?, '') AND COALESCE(selected_size, '') = COALESCE(?, '')",
      [userId, productId, selectedColor, selectedSize]
    );

    if (existing.length) {
      await pool.query(
        'UPDATE carts SET quantity = ? WHERE id = ?',
        [existing[0].quantity + quantity, existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO carts (user_id, product_id, quantity, selected_color, selected_size) VALUES (?,?,?,?,?)',
        [userId, productId, quantity, selectedColor, selectedSize]
      );
    }

    res.json({ ok: true });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
      code: err.code,
      sql: err.sql
    });
  }
});

router.patch('/item/:cartItemId', async (req, res) => {
  const { cartItemId } = req.params;
  const { quantity } = req.body;
  const parsedQuantity = Number(quantity);

  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
    return res.status(400).json({ error: 'invalid quantity' });
  }

  try {
    await pool.query('UPDATE carts SET quantity = ? WHERE id = ?', [parsedQuantity, cartItemId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.delete('/item/:cartItemId', async (req, res) => {
  const { cartItemId } = req.params;
  try {
    await pool.query('DELETE FROM carts WHERE id = ?', [cartItemId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

module.exports = router;
