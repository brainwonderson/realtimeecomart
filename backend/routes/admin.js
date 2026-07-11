const express = require('express');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const pool = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { revertExpiredFlashSales } = require('../utils/flashSaleReverter');

const router = express.Router();
const uploadsDir = path.join(__dirname, '..', 'uploads');

/* ─── Tipe banner yang valid ─────────────────────────────────── */
const ADMIN_BANNER_TYPES = ['homepage', 'event', 'flash_sale', 'voucher', 'promo_nasional'];
const ADMIN_BANNER_LABELS = {
  homepage:       'Banner Homepage',
  event:          'Banner Event',
  flash_sale:     'Banner Flash Sale',
  voucher:        'Banner Voucher',
  promo_nasional: 'Banner Promo Nasional',
};

/* ─── multer: simpan file ke disk ────────────────────────────── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `banner-${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

/* ══════════════════════════════════════════════════════════════
   USER MANAGEMENT
   ══════════════════════════════════════════════════════════════ */
router.get('/users', verifyToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, role, is_verified, is_banned, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.post('/users/:id/ban', verifyToken, requireRole('ADMIN'), async (req, res) => {
  const { isBanned = true } = req.body;
  try {
    await pool.query('UPDATE users SET is_banned = ? WHERE id = ?', [isBanned ? 1 : 0, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.post('/users/:id/verify-seller', verifyToken, requireRole('ADMIN'), async (req, res) => {
  try {
    await pool.query("UPDATE users SET is_verified = 1, role = 'SELLER' WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

/* ══════════════════════════════════════════════════════════════
   STATS
   ══════════════════════════════════════════════════════════════ */
router.get('/stats', verifyToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const [[users]]    = await pool.query('SELECT COUNT(*) AS total FROM users');
    const [[products]] = await pool.query('SELECT COUNT(*) AS total FROM products');
    const [[orders]]   = await pool.query('SELECT COUNT(*) AS total, COALESCE(SUM(total_amount),0) AS revenue FROM orders');
    const [[logs]]     = await pool.query('SELECT COUNT(*) AS total FROM activity_logs');
    res.json({ users: users.total, products: products.total, orders: orders.total, revenue: orders.revenue, activities: logs.total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

/* ══════════════════════════════════════════════════════════════
   BANNER — PUBLIC ENDPOINTS (tanpa auth)
   ══════════════════════════════════════════════════════════════ */

// Homepage: hanya banner tipe 'homepage' milik admin (seller_id IS NULL)
router.get('/banners/public', async (req, res) => {
  const type = req.query.type || 'homepage';
  try {
    const [rows] = await pool.query(
      'SELECT id, title, type, image, link_url FROM promo_banners WHERE is_active = 1 AND seller_id IS NULL AND type = ? ORDER BY created_at DESC',
      [type]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// Semua tipe banner admin aktif (untuk keperluan lain)
router.get('/banners/public/all', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, type, image, link_url FROM promo_banners WHERE is_active = 1 AND seller_id IS NULL ORDER BY type, created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

/* ══════════════════════════════════════════════════════════════
   BANNER — ADMIN ENDPOINTS (perlu login ADMIN)
   ══════════════════════════════════════════════════════════════ */
router.get('/banners', verifyToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM promo_banners WHERE seller_id IS NULL ORDER BY type, created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.post('/banners', verifyToken, requireRole('ADMIN'), upload.single('image'), async (req, res) => {
  const { title, link_url, is_active = 1, type = 'homepage' } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  if (!req.file) return res.status(400).json({ error: 'image required' });
  if (!ADMIN_BANNER_TYPES.includes(type)) return res.status(400).json({ error: 'invalid banner type' });
  try {
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const [result] = await pool.query(
      'INSERT INTO promo_banners (title, type, seller_id, image, link_url, is_active) VALUES (?,?,NULL,?,?,?)',
      [title, type, imageUrl, link_url || null, Number(is_active)]
    );
    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.patch('/banners/:id', verifyToken, requireRole('ADMIN'), upload.single('image'), async (req, res) => {
  const { title, link_url, is_active, type } = req.body;
  if (type && !ADMIN_BANNER_TYPES.includes(type)) return res.status(400).json({ error: 'invalid banner type' });
  try {
    const [existing] = await pool.query('SELECT id FROM promo_banners WHERE id = ? AND seller_id IS NULL', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Banner tidak ditemukan' });
    const imageUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;
    await pool.query(
      `UPDATE promo_banners SET
        title     = COALESCE(?, title),
        type      = COALESCE(?, type),
        link_url  = COALESCE(?, link_url),
        is_active = COALESCE(?, is_active),
        image     = COALESCE(?, image)
       WHERE id = ?`,
      [title ?? null, type ?? null, link_url ?? null, is_active != null ? Number(is_active) : null, imageUrl, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.delete('/banners/:id', verifyToken, requireRole('ADMIN'), async (req, res) => {
  try {
    await pool.query('DELETE FROM promo_banners WHERE id = ? AND seller_id IS NULL', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

/* ══════════════════════════════════════════════════════════════
   PRODUCT MODERATION
   ══════════════════════════════════════════════════════════════ */
router.patch('/products/:id/moderate', verifyToken, requireRole('ADMIN'), async (req, res) => {
  const { status = 'ACTIVE' } = req.body;
  const allowed = ['ACTIVE','DRAFT','ARCHIVED','FLAGGED'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid status' });
  try {
    await pool.query('UPDATE products SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// Get flash sale proposals pending approval
router.get('/flash-sale/proposals', verifyToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.id, f.product_id, f.seller_id, f.event_id, f.status, f.message, f.created_at, f.updated_at,
              pr.title AS product_title, pr.image AS product_image, pr.price AS product_price,
              u.name AS seller_name, u.email AS seller_email,
              e.name AS event_title
       FROM flash_sale_proposals f
       JOIN products pr ON pr.id = f.product_id
       JOIN users u ON u.id = f.seller_id
       LEFT JOIN flash_sale_events e ON e.id = f.event_id
       ORDER BY f.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.post('/flash-sale/events', verifyToken, requireRole('ADMIN'), async (req, res) => {
  const { title, description, start_at, end_at, is_active = 1 } = req.body;
  if (!title || !start_at || !end_at) return res.status(400).json({ error: 'title, start_at, end_at required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO flash_sale_events (`name`, description, start_at, end_at, is_active, created_by) VALUES (?,?,?,?,?,?)',
      [title, description || null, start_at, end_at, Number(is_active), req.user.id]
    );
    res.json({ ok: true, eventId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// Update a flash sale event
router.patch('/flash-sale/events/:id', verifyToken, requireRole('ADMIN'), async (req, res) => {
  const { title, description, start_at, end_at, is_active } = req.body;
  try {
    const [existing] = await pool.query('SELECT id FROM flash_sale_events WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Event tidak ditemukan' });
    await pool.query(
      'UPDATE flash_sale_events SET `name` = COALESCE(?, `name`), description = COALESCE(?, description), start_at = COALESCE(?, start_at), end_at = COALESCE(?, end_at), is_active = COALESCE(?, is_active) WHERE id = ?',
      [title ?? null, description ?? null, start_at ?? null, end_at ?? null, typeof is_active === 'undefined' ? null : Number(is_active), req.params.id]
    );
    // Instantly check and revert prices
    await revertExpiredFlashSales();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// Delete a flash sale event (clear references first)
router.delete('/flash-sale/events/:id', verifyToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM flash_sale_events WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Event tidak ditemukan' });
    // clear references from proposals
    await pool.query('UPDATE flash_sale_proposals SET event_id = NULL WHERE event_id = ?', [req.params.id]);
    await pool.query('DELETE FROM flash_sale_events WHERE id = ?', [req.params.id]);
    // Instantly check and revert prices of orphaned proposals
    await revertExpiredFlashSales();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.patch('/flash-sale/proposals/:id', verifyToken, requireRole('ADMIN'), async (req, res) => {
  const { status, event_id } = req.body;
  const allowed = ['APPROVED','REJECTED'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid status' });
  try {
    const [existing] = await pool.query('SELECT id, product_id, seller_id, status, original_price, flash_sale_price FROM flash_sale_proposals WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Proposal tidak ditemukan' });
    
    const proposal = existing[0];
    
    // If approved and has flash sale price, update product price
    if (status === 'APPROVED' && proposal.flash_sale_price) {
      await pool.query(
        'UPDATE products SET price = ? WHERE id = ?',
        [proposal.flash_sale_price, proposal.product_id]
      );
    }
    
    // If rejected, but was previously approved, we should restore original price
    if (status === 'REJECTED' && proposal.status === 'APPROVED' && proposal.original_price) {
      await pool.query(
        'UPDATE products SET price = ? WHERE id = ?',
        [proposal.original_price, proposal.product_id]
      );
    }
    
    await pool.query(
      'UPDATE flash_sale_proposals SET status = ?, event_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, event_id || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.delete('/products/:id', verifyToken, requireRole('ADMIN'), async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

/* ══════════════════════════════════════════════════════════════
   ADMIN PROMOTIONS (Voucher diskon, Gratis Ongkir, Promo Checkout)
   ══════════════════════════════════════════════════════════════ */
router.get('/promos', verifyToken, requireRole('ADMIN'), async (req, res) => {
  try {
    // Automatically deactivate expired promos first
    await pool.query(
      `UPDATE admin_promos 
       SET is_active = 0 
       WHERE is_active = 1 
         AND valid_until IS NOT NULL 
         AND valid_until <= NOW()`
    );
    const [rows] = await pool.query('SELECT * FROM admin_promos ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.post('/promos', verifyToken, requireRole('ADMIN'), async (req, res) => {
  const { category, name, code, discount_type, discount_value, max_discount, min_spend, valid_until, quota, is_active } = req.body;
  
  if (!category || !name) {
    return res.status(400).json({ error: 'category and name are required' });
  }
  
  try {
    const [result] = await pool.query(
      `INSERT INTO admin_promos 
       (category, name, code, discount_type, discount_value, max_discount, min_spend, valid_until, quota, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category,
        name,
        code || null,
        discount_type || 'fixed',
        Number(discount_value || 0),
        max_discount ? Number(max_discount) : null,
        Number(min_spend || 0),
        valid_until || null,
        quota ? Number(quota) : null,
        is_active === undefined ? 1 : Number(is_active)
      ]
    );
    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.patch('/promos/:id', verifyToken, requireRole('ADMIN'), async (req, res) => {
  let { category, name, code, discount_type, discount_value, max_discount, min_spend, valid_until, quota, is_active } = req.body;
  try {
    const [existing] = await pool.query('SELECT id, valid_until, is_active FROM admin_promos WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Promo tidak ditemukan' });
    
    let final_valid_until = valid_until !== undefined ? valid_until : existing[0].valid_until;
    let final_is_active = is_active !== undefined ? Number(is_active) : existing[0].is_active;

    let isExpired = false;
    if (final_valid_until && final_valid_until !== '') {
      const validUntilDate = new Date(final_valid_until);
      if (!isNaN(validUntilDate.getTime()) && validUntilDate <= new Date()) {
        isExpired = true;
      }
    }

    if (isExpired) {
      final_is_active = 0;
      if (is_active === 1) {
        return res.status(400).json({ error: 'Masa berlaku promo sudah lewat. Silakan perpanjang masa berlakunya untuk mengaktifkannya.' });
      }
    } else {
      // If it is NOT expired, and the user is updating valid_until to a future date or null,
      // and the promo was previously inactive (expired), reactivate it automatically
      if (valid_until !== undefined && existing[0].is_active === 0) {
        if (is_active === undefined || is_active === 0) {
          final_is_active = 1;
        }
      }
    }

    await pool.query(
      `UPDATE admin_promos SET
        category = COALESCE(?, category),
        name = COALESCE(?, name),
        code = COALESCE(?, code),
        discount_type = COALESCE(?, discount_type),
        discount_value = COALESCE(?, discount_value),
        max_discount = COALESCE(?, max_discount),
        min_spend = COALESCE(?, min_spend),
        valid_until = COALESCE(?, valid_until),
        quota = COALESCE(?, quota),
        is_active = ?
       WHERE id = ?`,
      [
        category ?? null,
        name ?? null,
        code ?? null,
        discount_type ?? null,
        discount_value !== undefined ? Number(discount_value) : null,
        max_discount !== undefined ? (max_discount ? Number(max_discount) : null) : null,
        min_spend !== undefined ? Number(min_spend) : null,
        valid_until ?? null,
        quota !== undefined ? (quota ? Number(quota) : null) : null,
        final_is_active,
        req.params.id
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.delete('/promos/:id', verifyToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM admin_promos WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Promo tidak ditemukan' });
    
    await pool.query('DELETE FROM admin_promos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

module.exports = router;
module.exports.ADMIN_BANNER_TYPES = ADMIN_BANNER_TYPES;
module.exports.ADMIN_BANNER_LABELS = ADMIN_BANNER_LABELS;
