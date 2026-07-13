const express = require('express');
const pool = require('../lib/db');
const bcrypt = require('bcrypt');
const { verifyToken } = require('../lib/auth');

const router = express.Router();

router.get('/profile/:userId', verifyToken, async (req, res) => {
  const userId = req.params.userId;
  if (String(req.user.id) !== String(userId) && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'forbidden' });
  try {
    const [rows] = await pool.query('SELECT id, name, email, role, is_verified, created_at FROM users WHERE id = ?', [userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.patch('/profile/:userId', verifyToken, async (req, res) => {
  const userId = req.params.userId;
  const { name, email } = req.body;
  if (String(req.user.id) !== String(userId) && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'forbidden' });
  try {
    await pool.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name || req.user.name, email || req.user.email, userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.patch('/password/:userId', verifyToken, async (req, res) => {
  const userId = req.params.userId;
  const { currentPassword, newPassword } = req.body;
  if (String(req.user.id) !== String(userId) && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'forbidden' });
  if (!newPassword) return res.status(400).json({ error: 'newPassword required' });
  try {
    const [rows] = await pool.query('SELECT id, password FROM users WHERE id = ?', [userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'not found' });
    if (req.user.role !== 'ADMIN') {
      const ok = await bcrypt.compare(currentPassword || '', user.password);
      if (!ok) return res.status(400).json({ error: 'current password invalid' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.get('/addresses/:userId', verifyToken, async (req, res) => {
  const userId = req.params.userId;
  if (String(req.user.id) !== String(userId) && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'forbidden' });
  try {
    const [rows] = await pool.query('SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC', [userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.post('/addresses/:userId', verifyToken, async (req, res) => {
  const userId = req.params.userId;
  if (String(req.user.id) !== String(userId) && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'forbidden' });
  const { label, recipient_name, phone, address_line1, address_line2, city, province, postal_code, is_default = 0 } = req.body;
  try {
    if (Number(is_default)) {
      await pool.query('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    }
    const [result] = await pool.query(
      'INSERT INTO user_addresses (user_id, label, recipient_name, phone, address_line1, address_line2, city, province, postal_code, is_default) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [userId, label || 'Home', recipient_name || req.user.name, phone || '', address_line1 || '', address_line2 || '', city || '', province || '', postal_code || '', Number(is_default)]
    );
    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

/* ══════════════════════════════════════════════════════════════
   BECOME SELLER — Buyer membuka toko sendiri
   ══════════════════════════════════════════════════════════════ */
router.post('/become-seller', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { store_name, store_description } = req.body;

  if (!store_name || !store_name.trim()) {
    return res.status(400).json({ error: 'Nama toko wajib diisi' });
  }

  try {
    // Cek apakah sudah punya toko
    const [existing] = await pool.query('SELECT id FROM stores WHERE seller_id = ?', [userId]);
    if (existing.length > 0) {
      await pool.query('UPDATE users SET is_seller = 1 WHERE id = ?', [userId]);
      return res.json({ ok: true, store_id: existing[0].id, already_exists: true });
    }

    // Buat toko baru
    const [result] = await pool.query(
      'INSERT INTO stores (seller_id, name, description, is_open) VALUES (?, ?, ?, 1)',
      [userId, store_name.trim(), (store_description || '').trim()]
    );

    // Set is_seller = 1
    await pool.query('UPDATE users SET is_seller = 1 WHERE id = ?', [userId]);

    res.json({ ok: true, store_id: result.insertId, already_exists: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

/* ─── GET /me — info user lengkap + store jika seller ─── */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, is_verified, is_seller, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'not found' });

    let store = null;
    if (user.is_seller || user.role === 'SELLER') {
      const [stores] = await pool.query(
        'SELECT id, name FROM stores WHERE seller_id = ? LIMIT 1',
        [user.id]
      );
      store = stores[0] || null;
    }

    res.json({ ...user, store });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

/* ══════════════════════════════════════════════════════════════
   NOTIFICATIONS ENDPOINTS — Ambil & Kelola Notifikasi
   ══════════════════════════════════════════════════════════════ */

// GET /api/account/notifications — Ambil notifikasi user
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, message, is_read, type, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// PATCH /api/account/notifications/read-all — Tandai semua notifikasi terbaca
router.patch('/notifications/read-all', verifyToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// PATCH /api/account/notifications/:id/read — Tandai satu notifikasi terbaca
router.patch('/notifications/:id/read', verifyToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

module.exports = router;
