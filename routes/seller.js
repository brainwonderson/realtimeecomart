const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const pool = require('../lib/db');
const { verifyToken, requireRole } = require('../lib/auth');
const { checkAndApplyPromos, revertPromoPrices } = require('../utils/promoManager');

const router = express.Router();
const uploadsDir = path.join(__dirname, '..', 'uploads');

/* ─── Tipe banner Seller ─────────────────────────────────────── */
const SELLER_BANNER_TYPES = ['toko', 'produk_baru', 'diskon', 'koleksi_terbaru'];
const SELLER_BANNER_LABELS = {
  toko:            'Banner Toko',
  produk_baru:     'Banner Produk Baru',
  diskon:          'Banner Diskon',
  koleksi_terbaru: 'Banner Koleksi Terbaru',
};

/* ─── multer untuk banner seller ────────────────────────────── */
const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `seller-banner-${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});
const uploadBanner = multer({
  storage: bannerStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

/* ─── helpers ─────────────────────────────────────────────── */
async function storeProductMedia(mediaValue, req) {
  if (!mediaValue || typeof mediaValue !== 'string') return mediaValue || '';
  if (!mediaValue.startsWith('data:image/') && !mediaValue.startsWith('data:video/')) return mediaValue;

  const matches = mediaValue.match(/^data:(image\/[a-zA-Z0-9.+-]+|video\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!matches) return '';

  const mimeType = matches[1];
  const base64Content = matches[2].replace(/\s/g, '');
  const extensionMap = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
    'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogg', 'video/quicktime': 'mov'
  };
  const extension = extensionMap[mimeType] || 'png';
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, fileName), Buffer.from(base64Content, 'base64'));
  return `${req.protocol}://${req.get('host')}/uploads/${fileName}`;
}

/* ══════════════════════════════════════════════════════════════
   STORE ENDPOINTS
   ══════════════════════════════════════════════════════════════ */

// GET  /api/seller/store  — ambil toko milik seller yang login
router.get('/store', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM stores WHERE seller_id = ?',
      [req.user.id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/seller/store  — buka toko baru
router.post('/store', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  const { name, description, logo, banner } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama toko required' });
  try {
    const storedLogo = logo ? await storeProductMedia(logo, req) : '';
    const storedBanner = banner ? await storeProductMedia(banner, req) : '';
    const [result] = await pool.query(
      'INSERT INTO stores (seller_id, name, description, logo, banner) VALUES (?,?,?,?,?)',
      [req.user.id, name, description || '', storedLogo, storedBanner]
    );
    await pool.query('UPDATE users SET is_seller = 1, role = "SELLER" WHERE id = ?', [req.user.id]);
    res.json({ id: result.insertId, store_name: name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/seller/store  — update info toko
router.patch('/store', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  const { name, description, logo, banner, is_open } = req.body;
  try {
    const [existing] = await pool.query('SELECT id FROM stores WHERE seller_id = ?', [req.user.id]);
    if (!existing.length) return res.status(404).json({ error: 'Toko not found' });
    const storedLogo = logo ? await storeProductMedia(logo, req) : undefined;
    const storedBanner = banner ? await storeProductMedia(banner, req) : undefined;

    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (storedLogo !== undefined) { fields.push('logo = ?'); values.push(storedLogo); }
    if (storedBanner !== undefined) { fields.push('banner = ?'); values.push(storedBanner); }
    if (is_open !== undefined) { fields.push('is_open = ?'); values.push(Number(is_open)); }

    if (fields.length > 0) {
      values.push(req.user.id);
      await pool.query(`UPDATE stores SET ${fields.join(', ')} WHERE seller_id = ?`, values);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ══════════════════════════════════════════════════════════════
   PRODUCT ENDPOINTS
   ══════════════════════════════════════════════════════════════ */

// Seller dashboard info
router.get('/dashboard', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  try {
    res.json({ message: 'Seller dashboard', user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/seller/products — ambil produk milik seller yang login
router.get('/products', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, seller_id, title, description, price, original_price, stock, image, category, status, colors, sizes, media, created_at FROM products WHERE seller_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product (seller)
router.post('/products', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  const { title, description, price, original_price, image, category, stock, status, colors, sizes, media } = req.body;
  if (!title || !price) return res.status(400).json({ error: 'Title and price required' });
  try {
    const storedImage = await storeProductMedia(image, req);
    
    // Process media array
    const mediaUrls = [];
    if (media && Array.isArray(media)) {
      for (const item of media) {
        const url = await storeProductMedia(item, req);
        if (url) {
          const type = url.match(/\.(mp4|webm|ogg|mov)$/i) ? 'video' : 'image';
          mediaUrls.push({ url, type });
        }
      }
    }
    const mediaJson = mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null;

    const [result] = await pool.query(
      'INSERT INTO products (seller_id, title, description, price, original_price, stock, image, category, status, colors, sizes, media) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        req.user.id,
        title,
        description || '',
        price,
        original_price ? Number(original_price) : null,
        Number(stock || 0),
        storedImage || '',
        category || '',
        status || 'ACTIVE',
        colors || null,
        sizes || null,
        mediaJson
      ]
    );
    res.json({
      id: result.insertId,
      title,
      description,
      price,
      original_price: original_price ? Number(original_price) : null,
      stock: Number(stock || 0),
      image: storedImage,
      category,
      colors,
      sizes,
      media: mediaUrls
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product (seller)
router.patch('/products/:id', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  const { title, description, price, original_price, stock, image, category, status, colors, sizes, media } = req.body;
  try {
    const [existing] = await pool.query('SELECT id, seller_id FROM products WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'not found' });
    if (req.user.role !== 'ADMIN' && String(existing[0].seller_id) !== String(req.user.id))
      return res.status(403).json({ error: 'forbidden' });
    
    const storedImage = image ? await storeProductMedia(image, req) : undefined;
    
    // Process media array if provided
    let mediaJson;
    if (media !== undefined) {
      const mediaUrls = [];
      if (Array.isArray(media)) {
        for (const item of media) {
          const url = await storeProductMedia(item, req);
          if (url) {
            const type = url.match(/\.(mp4|webm|ogg|mov)$/i) ? 'video' : 'image';
            mediaUrls.push({ url, type });
          }
        }
      }
      mediaJson = mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null;
    }
    
    // Dynamic update fields
    const fields = [];
    const values = [];
    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (price !== undefined) { fields.push('price = ?'); values.push(price); }
    if (original_price !== undefined) { fields.push('original_price = ?'); values.push(original_price ? Number(original_price) : null); }
    if (stock !== undefined) { fields.push('stock = ?'); values.push(stock); }
    if (storedImage !== undefined) { fields.push('image = ?'); values.push(storedImage); }
    if (category !== undefined) { fields.push('category = ?'); values.push(category); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (colors !== undefined) { fields.push('colors = ?'); values.push(colors || null); }
    if (sizes !== undefined) { fields.push('sizes = ?'); values.push(sizes || null); }
    if (mediaJson !== undefined) { fields.push('media = ?'); values.push(mediaJson); }

    if (fields.length > 0) {
      values.push(req.params.id);
      await pool.query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Propose product for flash sale (seller)
router.post('/products/:id/flash-sale-proposal', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  const { message, original_price, flash_sale_price } = req.body;
  try {
    const [existing] = await pool.query('SELECT id, seller_id, status, price FROM products WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    if (String(existing[0].seller_id) !== String(req.user.id)) return res.status(403).json({ error: 'forbidden' });
    if (existing[0].status !== 'ACTIVE') return res.status(400).json({ error: 'Produk harus aktif untuk diajukan' });

    // Validate prices
    if (!original_price || !flash_sale_price) {
      return res.status(400).json({ error: 'Harga normal dan harga flash sale wajib diisi' });
    }
    if (Number(flash_sale_price) >= Number(original_price)) {
      return res.status(400).json({ error: 'Harga flash sale harus lebih rendah dari harga normal' });
    }

    // Allow re-submission regardless of previous proposal status

    const [result] = await pool.query(
      'INSERT INTO flash_sale_proposals (product_id, seller_id, message, original_price, flash_sale_price) VALUES (?,?,?,?,?)',
      [req.params.id, req.user.id, message || null, original_price, flash_sale_price]
    );
    res.json({ ok: true, proposalId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get seller's own flash sale proposals
router.get('/flash-sale/proposals', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.product_id, p.event_id, p.status, p.message, p.created_at, p.updated_at,
              pr.title AS product_title, pr.image AS product_image, pr.price AS product_price
       FROM flash_sale_proposals p
       JOIN products pr ON pr.id = p.product_id
       WHERE p.seller_id = ?
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product (seller)
router.delete('/products/:id', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id, seller_id FROM products WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'not found' });
    if (req.user.role !== 'ADMIN' && String(existing[0].seller_id) !== String(req.user.id))
      return res.status(403).json({ error: 'forbidden' });
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Seller orders
router.get('/orders', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.id AS order_id, o.user_id, o.status, o.payment_status, o.total_amount, o.created_at, o.tracking_number,
              p.id AS product_id, p.title, p.seller_id, oi.quantity, oi.unit_price, oi.selected_color, oi.selected_size
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       WHERE p.seller_id = ?
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ══════════════════════════════════════════════════════════════
   SELLER BANNER ENDPOINTS
   ══════════════════════════════════════════════════════════════ */

// Publik: ambil banner aktif milik satu toko (tanpa login)
router.get('/banners/public/:storeId', async (req, res) => {
  try {
    const [store] = await pool.query('SELECT seller_id FROM stores WHERE id = ?', [req.params.storeId]);
    if (!store.length) return res.json([]);
    const sellerId = store[0].seller_id;
    const [rows] = await pool.query(
      'SELECT id, title, type, image, link_url FROM promo_banners WHERE seller_id = ? AND is_active = 1 ORDER BY type, created_at DESC',
      [sellerId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// Ambil banner milik seller yang login
router.get('/banners', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM promo_banners WHERE seller_id = ? ORDER BY type, created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// Buat banner seller baru
router.post('/banners', verifyToken, requireRole('SELLER', 'ADMIN'), uploadBanner.single('image'), async (req, res) => {
  const { title, link_url, is_active = 1, type = 'toko' } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  if (!req.file) return res.status(400).json({ error: 'image required' });
  if (!SELLER_BANNER_TYPES.includes(type)) return res.status(400).json({ error: 'invalid banner type' });
  try {
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const [result] = await pool.query(
      'INSERT INTO promo_banners (title, type, seller_id, image, link_url, is_active) VALUES (?,?,?,?,?,?)',
      [title, type, req.user.id, imageUrl, link_url || null, Number(is_active)]
    );
    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// Edit banner seller (hanya milik sendiri)
router.patch('/banners/:id', verifyToken, requireRole('SELLER', 'ADMIN'), uploadBanner.single('image'), async (req, res) => {
  const { title, link_url, is_active, type } = req.body;
  if (type && !SELLER_BANNER_TYPES.includes(type)) return res.status(400).json({ error: 'invalid banner type' });
  try {
    const [existing] = await pool.query('SELECT id FROM promo_banners WHERE id = ? AND seller_id = ?', [req.params.id, req.user.id]);
    if (!existing.length) return res.status(404).json({ error: 'Banner tidak ditemukan' });
    const imageUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;
    await pool.query(
      `UPDATE promo_banners SET
        title     = COALESCE(?, title),
        type      = COALESCE(?, type),
        link_url  = COALESCE(?, link_url),
        is_active = COALESCE(?, is_active),
        image     = COALESCE(?, image)
       WHERE id = ? AND seller_id = ?`,
      [title ?? null, type ?? null, link_url ?? null, is_active != null ? Number(is_active) : null, imageUrl, req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// Hapus banner seller (hanya milik sendiri)
router.delete('/banners/:id', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  try {
    await pool.query('DELETE FROM promo_banners WHERE id = ? AND seller_id = ?', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

/* ─── PROMO SELLER ENDPOINTS ─────────────────────────────────── */

// GET /api/seller/promos — ambil promo milik seller
router.get('/promos', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  try {
    const [promos] = await pool.query(
      'SELECT id, seller_id, name, discount_percentage, start_time, end_time, status, is_active, created_at FROM seller_promos WHERE seller_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    for (const promo of promos) {
      const [prods] = await pool.query(
        `SELECT p.id, p.title, p.price, p.original_price, p.image 
         FROM seller_promo_products spp
         JOIN products p ON p.id = spp.product_id
         WHERE spp.promo_id = ?`,
        [promo.id]
      );
      promo.products = prods;
    }

    res.json(promos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/seller/promos — buat promo baru
router.post('/promos', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  const { name, discount_percentage, start_time, end_time, product_ids } = req.body;

  if (!name || !discount_percentage || !start_time || !end_time || !product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
    return res.status(400).json({ error: 'Semua kolom wajib diisi dan minimal pilih 1 produk' });
  }

  const pct = Number(discount_percentage);
  if (isNaN(pct) || pct < 1 || pct > 99) {
    return res.status(400).json({ error: 'Diskon harus di antara 1% sampai 99%' });
  }

  try {
    // 1. Validasi produk milik seller
    const [ownedProducts] = await pool.query(
      'SELECT id FROM products WHERE id IN (?) AND seller_id = ?',
      [product_ids, req.user.id]
    );
    if (ownedProducts.length !== product_ids.length) {
      return res.status(400).json({ error: 'Ada produk terpilih yang bukan milik toko Anda' });
    }

    // 2. Validasi overlap dengan promo aktif/mendatang lain
    const [overlaps] = await pool.query(
      `SELECT sp.name, spp.product_id
       FROM seller_promo_products spp
       JOIN seller_promos sp ON sp.id = spp.promo_id
       WHERE spp.product_id IN (?) 
         AND sp.is_active = 1
         AND sp.status IN ('UPCOMING', 'ACTIVE')`,
      [product_ids]
    );
    if (overlaps.length > 0) {
      return res.status(400).json({ 
        error: `Beberapa produk terpilih sudah terdaftar di promo aktif/mendatang lain ("${overlaps[0].name}").` 
      });
    }

    // 3. Simpan promo
    const [result] = await pool.query(
      'INSERT INTO seller_promos (seller_id, name, discount_percentage, start_time, end_time, status, is_active) VALUES (?,?,?,?,?,?,1)',
      [req.user.id, name, pct, start_time, end_time, 'UPCOMING']
    );
    const promoId = result.insertId;

    // 4. Hubungkan produk ke promo
    for (const pid of product_ids) {
      await pool.query(
        'INSERT INTO seller_promo_products (promo_id, product_id) VALUES (?,?)',
        [promoId, pid]
      );
    }

    // 5. Jalankan sync promo langsung agar langsung aktif jika start_time <= NOW()
    await checkAndApplyPromos();

    res.json({ ok: true, promoId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/seller/promos/:id — update promo
router.patch('/promos/:id', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  const promoId = req.params.id;
  const { name, discount_percentage, start_time, end_time, product_ids, is_active } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM seller_promos WHERE id = ? AND seller_id = ?', [promoId, req.user.id]);
    if (!existing.length) {
      return res.status(404).json({ error: 'Promo tidak ditemukan' });
    }

    const promo = existing[0];

    // Jika promo aktif, revert harga produknya dulu agar tidak duplikat kalkulasi
    if (promo.status === 'ACTIVE') {
      await revertPromoPrices(promoId);
    }

    const nextName = name !== undefined ? name : promo.name;
    const nextPct = discount_percentage !== undefined ? Number(discount_percentage) : promo.discount_percentage;
    const nextStart = start_time !== undefined ? start_time : promo.start_time;
    const nextEnd = end_time !== undefined ? end_time : promo.end_time;
    const nextActive = is_active !== undefined ? Number(is_active) : promo.is_active;

    if (discount_percentage !== undefined && (isNaN(nextPct) || nextPct < 1 || nextPct > 99)) {
      return res.status(400).json({ error: 'Diskon harus di antara 1% sampai 99%' });
    }

    if (product_ids && Array.isArray(product_ids)) {
      if (product_ids.length === 0) {
        return res.status(400).json({ error: 'Minimal pilih 1 produk' });
      }

      // Validasi kepemilikan produk
      const [ownedProducts] = await pool.query(
        'SELECT id FROM products WHERE id IN (?) AND seller_id = ?',
        [product_ids, req.user.id]
      );
      if (ownedProducts.length !== product_ids.length) {
        return res.status(400).json({ error: 'Ada produk terpilih yang bukan milik toko Anda' });
      }

      // Validasi overlap (kecuali dengan promo ini sendiri)
      const [overlaps] = await pool.query(
        `SELECT sp.name, spp.product_id
         FROM seller_promo_products spp
         JOIN seller_promos sp ON sp.id = spp.promo_id
         WHERE spp.product_id IN (?) 
           AND sp.is_active = 1
           AND sp.status IN ('UPCOMING', 'ACTIVE')
           AND sp.id != ?`,
        [product_ids, promoId]
      );
      if (overlaps.length > 0) {
        return res.status(400).json({ 
          error: `Beberapa produk terpilih sudah terdaftar di promo aktif/mendatang lain ("${overlaps[0].name}").` 
        });
      }

      // Hapus & update relasi produk
      await pool.query('DELETE FROM seller_promo_products WHERE promo_id = ?', [promoId]);
      for (const pid of product_ids) {
        await pool.query(
          'INSERT INTO seller_promo_products (promo_id, product_id) VALUES (?,?)',
          [promoId, pid]
        );
      }
    }

    // Update data promo & reset status ke 'UPCOMING' agar disinkronkan kembali
    await pool.query(
      `UPDATE seller_promos 
       SET name = ?, discount_percentage = ?, start_time = ?, end_time = ?, is_active = ?, status = 'UPCOMING'
       WHERE id = ?`,
      [nextName, nextPct, nextStart, nextEnd, nextActive, promoId]
    );

    // Jalankan sync promo langsung
    await checkAndApplyPromos();

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/seller/promos/:id — hapus promo
router.delete('/promos/:id', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  const promoId = req.params.id;
  try {
    const [existing] = await pool.query('SELECT * FROM seller_promos WHERE id = ? AND seller_id = ?', [promoId, req.user.id]);
    if (!existing.length) {
      return res.status(404).json({ error: 'Promo tidak ditemukan' });
    }

    // Revert harganya dulu
    if (existing[0].status === 'ACTIVE') {
      await revertPromoPrices(promoId);
    }

    // Hapus promo dan produk
    await pool.query('DELETE FROM seller_promo_products WHERE promo_id = ?', [promoId]);
    await pool.query('DELETE FROM seller_promos WHERE id = ?', [promoId]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

