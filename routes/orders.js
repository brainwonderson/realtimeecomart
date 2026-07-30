const express = require('express');
const router = express.Router();
const pool = require('../lib/db');
const { verifyToken, requireRole } = require('../lib/auth');
const midtransClient = require('midtrans-client');
const crypto = require('crypto');
const { uploadBase64ToCloudinary } = require('../utils/cloudinary');

// ── Midtrans Snap client ───────────────────────────────────────────────────
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Helper to calculate promotions and checkout totals
async function calculateCheckoutTotals(userId, shippingOption, voucherCode) {
  // 1. Fetch cart items
  const [cartItems] = await pool.query(
    `SELECT c.product_id, c.quantity, c.selected_color, c.selected_size, p.price, p.title
     FROM carts c
     JOIN products p ON p.id = c.product_id
     WHERE c.user_id = ?`,
    [userId]
  );

  const hasItems = cartItems.length > 0;
  let subtotal = 0;
  for (const it of cartItems) {
    subtotal += Number(it.price) * Number(it.quantity);
  }

  // 2. Shipping calculation
  const shippingOptionLower = (shippingOption || 'standard').toLowerCase();
  let shippingBase = 18000;
  let shippingLabel = 'Reguler';
  if (shippingOptionLower === 'express') {
    shippingBase = 32000;
    shippingLabel = 'Express';
  } else if (shippingOptionLower === 'same-day' || shippingOptionLower === 'same_day') {
    shippingBase = 48000;
    shippingLabel = 'Same Day';
  }
  const originalShippingCost = hasItems ? (shippingBase + Math.min(20000, Math.round(subtotal * 0.02))) : 0;

  // 3. Fetch active promos
  const [activePromos] = await pool.query(
    `SELECT * FROM admin_promos 
     WHERE is_active = 1 
       AND (valid_until IS NULL OR valid_until >= NOW())`
  );

  let appliedFreeShippingPromo = null;
  let shippingDiscount = 0;

  let appliedCheckoutDiscount = null;
  let checkoutDiscountAmount = 0;

  let appliedVoucher = null;
  let voucherDiscountAmount = 0;
  let voucherError = null;

  // Evaluate Gratis Ongkir
  const freeShippingPromos = activePromos.filter(p => p.category === 'gratis_ongkir' && subtotal >= Number(p.min_spend));
  if (freeShippingPromos.length > 0) {
    appliedFreeShippingPromo = freeShippingPromos[0];
    shippingDiscount = originalShippingCost;
  }
  const finalShippingCost = originalShippingCost - shippingDiscount;

  // Evaluate Automatic Checkout Discount
  const checkoutDiscounts = activePromos.filter(p => p.category === 'checkout_discount' && subtotal >= Number(p.min_spend));
  if (checkoutDiscounts.length > 0) {
    let maxSaving = 0;
    let bestPromo = null;

    for (const promo of checkoutDiscounts) {
      let saving = 0;
      if (promo.discount_type === 'fixed') {
        saving = Number(promo.discount_value);
      } else if (promo.discount_type === 'percentage') {
        saving = (Number(promo.discount_value) / 100) * subtotal;
        if (promo.max_discount !== null) {
          saving = Math.min(saving, Number(promo.max_discount));
        }
      }
      if (saving > maxSaving) {
        maxSaving = saving;
        bestPromo = promo;
      }
    }

    if (bestPromo) {
      appliedCheckoutDiscount = bestPromo;
      checkoutDiscountAmount = Math.min(maxSaving, subtotal);
    }
  }

  // Evaluate Voucher Diskon
  if (voucherCode) {
    const voucher = activePromos.find(p => p.category === 'voucher' && p.code && p.code.toUpperCase() === voucherCode.toUpperCase());
    if (!voucher) {
      voucherError = 'Kode voucher tidak valid atau telah kedaluwarsa';
    } else if (voucher.quota !== null && voucher.used_count >= voucher.quota) {
      voucherError = 'Kuota voucher telah habis';
    } else if (subtotal < Number(voucher.min_spend)) {
      voucherError = `Minimal belanja Rp ${Number(voucher.min_spend).toLocaleString('id-ID')} tidak terpenuhi`;
    } else {
      appliedVoucher = voucher;
      const remainingSubtotal = subtotal - checkoutDiscountAmount;
      let calculatedVoucherDiscount = 0;
      if (voucher.discount_type === 'fixed') {
        calculatedVoucherDiscount = Number(voucher.discount_value);
      } else if (voucher.discount_type === 'percentage') {
        calculatedVoucherDiscount = (Number(voucher.discount_value) / 100) * subtotal;
        if (voucher.max_discount !== null) {
          calculatedVoucherDiscount = Math.min(calculatedVoucherDiscount, Number(voucher.max_discount));
        }
      }
      voucherDiscountAmount = Math.min(calculatedVoucherDiscount, remainingSubtotal);
    }
  }

  const discountAmount = checkoutDiscountAmount + voucherDiscountAmount;
  const grandTotal = Math.max(0, subtotal + finalShippingCost - discountAmount);

  return {
    cartItems,
    hasItems,
    subtotal,
    shippingLabel,
    originalShippingCost,
    shippingDiscount,
    finalShippingCost,
    appliedFreeShippingPromo,
    appliedCheckoutDiscount,
    checkoutDiscountAmount,
    appliedVoucher,
    voucherDiscountAmount,
    voucherError,
    discountAmount,
    grandTotal
  };
}

// ── POST /checkout-preview/:userId ─────────────────────────────────────────
router.post('/checkout-preview/:userId', verifyToken, async (req, res) => {
  const userId = req.params.userId;
  const { shippingOption = 'standard', voucherCode = null } = req.body;
  try {
    const totals = await calculateCheckoutTotals(userId, shippingOption, voucherCode);
    if (!totals.hasItems) {
      return res.status(400).json({ error: 'cart empty' });
    }
    res.json({
      subtotal: totals.subtotal,
      originalShippingCost: totals.originalShippingCost,
      shippingDiscount: totals.shippingDiscount,
      finalShippingCost: totals.finalShippingCost,
      appliedFreeShippingPromo: totals.appliedFreeShippingPromo ? {
        id: totals.appliedFreeShippingPromo.id,
        name: totals.appliedFreeShippingPromo.name
      } : null,
      appliedCheckoutDiscount: totals.appliedCheckoutDiscount ? {
        id: totals.appliedCheckoutDiscount.id,
        name: totals.appliedCheckoutDiscount.name,
        discount_value: totals.appliedCheckoutDiscount.discount_value,
        discount_type: totals.appliedCheckoutDiscount.discount_type
      } : null,
      checkoutDiscountAmount: totals.checkoutDiscountAmount,
      appliedVoucher: totals.appliedVoucher ? {
        id: totals.appliedVoucher.id,
        name: totals.appliedVoucher.name,
        code: totals.appliedVoucher.code
      } : null,
      voucherDiscountAmount: totals.voucherDiscountAmount,
      voucherError: totals.voucherError,
      discountAmount: totals.discountAmount,
      grandTotal: totals.grandTotal,
      shippingLabel: totals.shippingLabel
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});


// ── GET /detail/:orderId ───────────────────────────────────────────────────
router.get('/detail/:orderId', verifyToken, async (req, res) => {
  const orderId = req.params.orderId;
  try {
    const [orders] = await pool.query(
      'SELECT id, user_id, address, status, payment_status, payment_method, total_amount, discount_amount, shipping_cost, voucher_code, created_at FROM orders WHERE id = ?',
      [orderId]
    );
    const order = orders[0];
    if (!order) return res.status(404).json({ error: 'order not found' });
    if (String(order.user_id) !== String(req.user.id) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'forbidden' });
    }

    const [items] = await pool.query(
      `SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price, oi.selected_color, oi.selected_size, p.title, p.image, p.category
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    res.json({ ...order, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// ── POST /checkout/:userId — buat order + Midtrans Snap token ──────────────
router.post('/checkout/:userId', verifyToken, async (req, res) => {
  const userId = req.params.userId;
  const { address, paymentMethod = 'qris', shippingOption = 'standard', voucherCode = null, paymentReceipt = null } = req.body;
  const allowedPayments = ['qris', 'transfer', 'cod', 'dummy'];
  const normalizedPayment = allowedPayments.includes(paymentMethod) ? paymentMethod : 'qris';

  try {
    // 1. Calculate checkout totals with promos
    const totals = await calculateCheckoutTotals(userId, shippingOption, voucherCode);
    if (!totals.hasItems) {
      return res.status(400).json({ error: 'cart empty' });
    }

    if (voucherCode && totals.voucherError) {
      return res.status(400).json({ error: totals.voucherError });
    }

    let uploadedReceiptUrl = null;
    if (normalizedPayment === 'qris' && paymentReceipt) {
      try {
        uploadedReceiptUrl = await uploadBase64ToCloudinary(paymentReceipt, 'receipts');
      } catch (uploadErr) {
        console.error('Failed to upload payment receipt:', uploadErr);
        return res.status(500).json({ error: 'Gagal mengunggah bukti pembayaran' });
      }
    }

    // 2. Buat order di DB
    const [o] = await pool.query(
      `INSERT INTO orders (user_id, address, status, payment_status, payment_method, total_amount, discount_amount, shipping_cost, voucher_code, payment_receipt) 
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        userId, 
        address || '', 
        'pending', 
        'pending', 
        normalizedPayment, 
        totals.grandTotal, 
        totals.discountAmount, 
        totals.finalShippingCost, 
        totals.appliedVoucher ? totals.appliedVoucher.code : null,
        uploadedReceiptUrl
      ]
    );
    const orderId = o.insertId;

    // 3. Insert order items
    for (const it of totals.cartItems) {
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price, selected_color, selected_size) VALUES (?,?,?,?,?,?)',
        [orderId, it.product_id, it.quantity, it.price, it.selected_color || null, it.selected_size || null]
      );
    }

    // 4. Update used counts for promos
    if (totals.appliedVoucher) {
      await pool.query('UPDATE admin_promos SET used_count = used_count + 1 WHERE id = ?', [totals.appliedVoucher.id]);
    }
    if (totals.appliedCheckoutDiscount) {
      await pool.query('UPDATE admin_promos SET used_count = used_count + 1 WHERE id = ?', [totals.appliedCheckoutDiscount.id]);
    }
    if (totals.appliedFreeShippingPromo) {
      await pool.query('UPDATE admin_promos SET used_count = used_count + 1 WHERE id = ?', [totals.appliedFreeShippingPromo.id]);
    }

    // 5. Status history
    await pool.query(
      'INSERT INTO order_status_history (order_id, status, note, created_by) VALUES (?,?,?,?)',
      [orderId, 'pending', `Order created · Pengiriman: ${totals.shippingLabel}`, Number(userId)]
    );

    // 6. Kosongkan cart
    await pool.query('DELETE FROM carts WHERE user_id = ?', [userId]);

    // 7. Buat Midtrans Snap transaction
    let snapToken = null;
    let snapRedirectUrl = null;

    if (normalizedPayment !== 'qris' || !uploadedReceiptUrl) {
      try {
        // Ambil info user untuk customer_details
        const [users] = await pool.query('SELECT name, email FROM users WHERE id = ?', [userId]);
        const user = users[0] || {};

        const itemDetails = totals.cartItems.map(it => ({
          id: String(it.product_id),
          price: Math.round(it.price),
          quantity: it.quantity,
          name: (it.title || 'Produk').substring(0, 50),
        }));

        if (Number(totals.finalShippingCost) > 0) {
          itemDetails.push({
            id: 'SHIPPING',
            price: Math.round(Number(totals.finalShippingCost)),
            quantity: 1,
            name: `Ongkir ${totals.shippingLabel}`,
          });
        }

        if (totals.discountAmount > 0) {
          itemDetails.push({
            id: 'DISCOUNT',
            price: -Math.round(totals.discountAmount),
            quantity: 1,
            name: 'Diskon Promo Platform',
          });
        }

        const snapParameter = {
          transaction_details: {
            order_id: `ORDER-${orderId}-${Date.now()}`,
            gross_amount: Math.round(totals.grandTotal),
          },
          customer_details: {
            first_name: user.name || 'Customer',
            email: user.email || 'customer@example.com',
          },
          item_details: itemDetails,
          enabled_payments: ['qris', 'bank_transfer', 'bca_va', 'bni_va', 'bri_va', 'other_va'],
        };

        const snapResponse = await snap.createTransaction(snapParameter);
        snapToken = snapResponse.token;
        snapRedirectUrl = snapResponse.redirect_url;

        // Simpan snap order_id ke DB agar webhook bisa mencocokkan
        try {
          await pool.query('UPDATE orders SET midtrans_order_id = ? WHERE id = ?', [snapParameter.transaction_details.order_id, orderId]);
        } catch (_) {
          // kolom belum ada, tidak fatal
        }
      } catch (midtransErr) {
        console.error('[Midtrans] Snap token error:', midtransErr.message || midtransErr);
        // Order sudah dibuat, kembalikan tanpa snapToken — frontend bisa handle gracefully
      }
    } else {
      // Jika bayar QRIS manual, buat history bahwa bukti pembayaran telah diupload
      try {
        await pool.query(
          'INSERT INTO order_status_history (order_id, status, note, created_by) VALUES (?,?,?,?)',
          [orderId, 'pending', 'Bukti pembayaran QRIS telah diunggah. Menunggu konfirmasi penjual.', Number(userId)]
        );
        
        // Kirim notifikasi ke penjual
        const [sellers] = await pool.query(
          'SELECT DISTINCT p.seller_id FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?',
          [orderId]
        );
        for (const s of sellers) {
          if (s.seller_id) {
            await pool.query(
              "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'seller_order')",
              [s.seller_id, 'Verifikasi Pembayaran QRIS', `Pesanan baru #${orderId} telah mengirimkan bukti transfer QRIS. Silakan verifikasi pembayaran.`, 'seller_order']
            );
          }
        }
      } catch (notifErr) {
        console.error('Failed to create manual payment history or notifications:', notifErr);
      }
    }

    res.json({ ok: true, orderId, snapToken, snapRedirectUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// ── POST /midtrans-notification — webhook dari Midtrans (NO auth) ──────────
router.post('/midtrans-notification', async (req, res) => {
  try {
    const notification = req.body;
    const {
      order_id: midtransOrderId,
      transaction_status,
      fraud_status,
      signature_key,
      gross_amount,
      status_code,
    } = notification;

    // Verifikasi signature: SHA512(order_id + status_code + gross_amount + server_key)
    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    const expectedSignature = crypto
      .createHash('sha512')
      .update(`${midtransOrderId}${status_code}${gross_amount}${serverKey}`)
      .digest('hex');

    if (signature_key !== expectedSignature) {
      console.warn('[Midtrans Webhook] Invalid signature, ignoring.');
      return res.status(200).json({ ok: false, reason: 'invalid signature' });
    }

    // Ekstrak orderId dari "ORDER-{id}-{timestamp}"
    const match = String(midtransOrderId).match(/^ORDER-(\d+)-/);
    if (!match) return res.status(200).json({ ok: false, reason: 'unknown order id format' });
    const orderId = Number(match[1]);

    // Update berdasarkan status transaksi
    const isPaid =
      transaction_status === 'settlement' ||
      (transaction_status === 'capture' && fraud_status === 'accept');

    const isCancelled =
      transaction_status === 'cancel' ||
      transaction_status === 'deny' ||
      transaction_status === 'expire';

    if (isPaid) {
      // payment_status becomes 'paid', status stays 'pending' (representing "Pesanan Baru")
      await pool.query(
        "UPDATE orders SET payment_status = 'paid' WHERE id = ?",
        [orderId]
      );
      await pool.query(
        "INSERT INTO order_status_history (order_id, status, note, created_by) VALUES (?,?,?,?)",
        [orderId, 'pending', `Pembayaran berhasil · Midtrans: ${transaction_status}. Menunggu pengemasan oleh penjual.`, 0]
      );
      console.log(`[Midtrans] Order #${orderId} PAID — status → pending (Pesanan Baru)`);

      // Notify seller(s) & buyer
      try {
        const [orders] = await pool.query('SELECT user_id FROM orders WHERE id = ?', [orderId]);
        const buyerId = orders[0]?.user_id;

        const [sellers] = await pool.query(
          'SELECT DISTINCT p.seller_id FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?',
          [orderId]
        );
        for (const s of sellers) {
          if (s.seller_id) {
            await pool.query(
              "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'seller_order')",
              [s.seller_id, 'Pesanan Baru', `Pesanan baru #${orderId} telah dibayar dan siap dikemas.`, 'seller_order']
            );
          }
        }
        if (buyerId) {
          await pool.query(
            "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'buyer_order')",
            [buyerId, 'Pembayaran Berhasil', `Pembayaran untuk pesanan #${orderId} telah diverifikasi.`, 'buyer_order']
          );
        }
      } catch (errNotif) {
        console.error('Failed to insert payment notifications:', errNotif);
      }
    } else if (isCancelled) {
      await pool.query(
        "UPDATE orders SET payment_status = 'failed' WHERE id = ?",
        [orderId]
      );
      console.log(`[Midtrans] Order #${orderId} CANCELLED/EXPIRED`);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Midtrans Webhook] Error:', err);
    res.status(200).json({ ok: false, error: 'server' }); // selalu 200 agar Midtrans tidak retry terus
  }
});

// ── GET /:userId — daftar order user ──────────────────────────────────────
router.get('/:userId', verifyToken, async (req, res) => {
  const userId = req.params.userId;
  try {
    const [orders] = await pool.query(
      'SELECT id, status, payment_status, payment_method, tracking_number, cancel_reason, total_amount, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    // Fetch items for each order
    for (let order of orders) {
      const [items] = await pool.query(
        `SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price, oi.selected_color, oi.selected_size, p.title, p.image, p.category
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// ── POST /:orderId/cancel ──────────────────────────────────────────────────
router.post('/:orderId/cancel', verifyToken, async (req, res) => {
  const orderId = req.params.orderId;
  const { reason = 'Dibatalkan oleh pembeli' } = req.body;
  try {
    const [rows] = await pool.query('SELECT id, user_id, status FROM orders WHERE id = ?', [orderId]);
    const order = rows[0];
    if (!order) return res.status(404).json({ error: 'order not found' });
    if (String(order.user_id) !== String(req.user.id) && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'forbidden' });
    if (['selesai', 'dibatalkan'].includes(order.status)) return res.status(400).json({ error: 'order cannot be cancelled' });
    await pool.query('UPDATE orders SET status = ?, cancel_reason = ? WHERE id = ?', ['dibatalkan', reason, orderId]);
    await pool.query('INSERT INTO order_status_history (order_id, status, note, created_by) VALUES (?,?,?,?)', [orderId, 'dibatalkan', reason, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// ── GET /:orderId/history ──────────────────────────────────────────────────
router.get('/:orderId/history', verifyToken, async (req, res) => {
  const orderId = req.params.orderId;
  try {
    const [rows] = await pool.query(
      'SELECT status, note, created_at FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC',
      [orderId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// ── POST /:orderId/pay — manual pay confirmation (internal/fallback) ───────
router.post('/:orderId/pay', verifyToken, async (req, res) => {
  const orderId = req.params.orderId;
  try {
    const [rows] = await pool.query('SELECT id, user_id, payment_status FROM orders WHERE id = ?', [orderId]);
    const order = rows[0];
    if (!order) return res.status(404).json({ error: 'order not found' });
    if (String(order.user_id) !== String(req.user.id) && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'forbidden' });
    
    // status stays 'pending' (Pesanan Baru)
    await pool.query("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [orderId]);
    await pool.query('INSERT INTO order_status_history (order_id, status, note, created_by) VALUES (?,?,?,?)', [orderId, 'pending', 'Payment confirmed (manual). Menunggu pengemasan oleh penjual.', req.user.id]);
    
    // Notify seller(s) & buyer
    const [sellers] = await pool.query(
      'SELECT DISTINCT p.seller_id FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?',
      [orderId]
    );
    for (const s of sellers) {
      if (s.seller_id) {
        await pool.query(
          "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'seller_order')",
          [s.seller_id, 'Pesanan Baru', `Pesanan baru #${orderId} telah dibayar dan siap dikemas.`, 'seller_order']
        );
      }
    }
    await pool.query(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'buyer_order')",
      [order.user_id, 'Pembayaran Berhasil', `Pembayaran untuk pesanan #${orderId} telah diverifikasi.`, 'buyer_order']
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// ── PATCH /:orderId/status — seller/admin update status ───────────────────
router.patch('/:orderId/status', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  const orderId = req.params.orderId;
  const { status, note = '', tracking_number = null } = req.body;
  const allowed = ['pending', 'diproses', 'dikirim', 'selesai', 'dibatalkan'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid status' });
  try {
    const [orders] = await pool.query('SELECT user_id, status FROM orders WHERE id = ?', [orderId]);
    const order = orders[0];
    if (!order) return res.status(404).json({ error: 'order not found' });

    let queryStr = 'UPDATE orders SET status = ?';
    const params = [status];
    if (status === 'diproses') {
      queryStr += ", payment_status = 'paid'";
    } else if (status === 'dibatalkan') {
      queryStr += ", payment_status = 'failed'";
    }
    
    if (tracking_number !== null) {
      queryStr += ', tracking_number = ?';
      params.push(tracking_number);
    }
    if (status === 'dibatalkan') {
      queryStr += ', cancel_reason = ?';
      params.push(note || 'Ditolak oleh penjual');
    }
    queryStr += ' WHERE id = ?';
    params.push(orderId);

    await pool.query(queryStr, params);
    
    const displayNote = note || `Status updated to ${status} by seller`;
    await pool.query(
      'INSERT INTO order_status_history (order_id, status, note, created_by) VALUES (?,?,?,?)',
      [orderId, status, displayNote, req.user.id]
    );

    // Notify Buyer
    let message = `Pesanan #${orderId} Anda telah berubah status menjadi ${status}.`;
    let notifTitle = `Status Pesanan: ${status.toUpperCase()}`;

    if (status === 'diproses') {
      notifTitle = 'Pesanan Diterima';
      message = `Pesanan #${orderId} Anda telah diterima oleh penjual dan sedang diproses.`;
    } else if (status === 'dikirim') {
      notifTitle = 'Pesanan Dikirim / Dalam Pengantaran';
      message = `Pesanan #${orderId} Anda sedang dalam pengantaran (dikirim)` + (tracking_number ? ` dengan resi: ${tracking_number}.` : '.');
    } else if (status === 'selesai') {
      notifTitle = 'Pesanan Selesai';
      message = `Pesanan #${orderId} Anda telah selesai. Terima kasih!`;
    } else if (status === 'dibatalkan') {
      notifTitle = 'Pesanan Ditolak';
      message = `Pesanan #${orderId} Anda ditolak oleh penjual.` + (note ? ` Alasan: ${note}` : '');
    }

    await pool.query(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'buyer_order')",
      [order.user_id, notifTitle, message, 'buyer_order']
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// ── POST /:orderId/receive — buyer mark order as received/selesai ─────────
router.post('/:orderId/receive', verifyToken, async (req, res) => {
  const orderId = req.params.orderId;
  try {
    const [rows] = await pool.query('SELECT id, user_id, status FROM orders WHERE id = ?', [orderId]);
    const order = rows[0];
    if (!order) return res.status(404).json({ error: 'order not found' });
    
    // check if user is the buyer of this order or admin
    if (String(order.user_id) !== String(req.user.id) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (order.status !== 'dikirim') {
      return res.status(400).json({ error: 'order status must be dikirim to mark as received' });
    }
    
    await pool.query("UPDATE orders SET status = 'selesai' WHERE id = ?", [orderId]);
    await pool.query('INSERT INTO order_status_history (order_id, status, note, created_by) VALUES (?,?,?,?)', [orderId, 'selesai', 'Pesanan diterima oleh pembeli', req.user.id]);
    
    // Notify seller(s)
    const [sellers] = await pool.query(
      'SELECT DISTINCT p.seller_id FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?',
      [orderId]
    );
    for (const s of sellers) {
      if (s.seller_id) {
        await pool.query(
          "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'seller_order')",
          [s.seller_id, 'Pesanan Selesai', `Pesanan #${orderId} telah diterima oleh pembeli.`, 'seller_order']
        );
      }
    }
    
    // Notify buyer
    await pool.query(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'buyer_order')",
      [req.user.id, 'Pesanan Selesai', `Pesanan #${orderId} telah selesai. Terima kasih telah berbelanja!`, 'buyer_order']
    );
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

// DELETE /:orderId — delete order permanently (seller/admin)
router.delete('/:orderId', verifyToken, requireRole('SELLER', 'ADMIN'), async (req, res) => {
  const orderId = req.params.orderId;
  try {
    if (req.user.role !== 'ADMIN') {
      const [items] = await pool.query(
        'SELECT p.seller_id FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?',
        [orderId]
      );
      if (items.length > 0 && String(items[0].seller_id) !== String(req.user.id)) {
        return res.status(403).json({ error: 'forbidden' });
      }
    }

    await pool.query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
    await pool.query('DELETE FROM order_status_history WHERE order_id = ?', [orderId]);
    await pool.query('DELETE FROM orders WHERE id = ?', [orderId]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error: ' + err.message });
  }
});

module.exports = router;
