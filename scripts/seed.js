const pool = require('../lib/db');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    // Hapus data demo Wireless Headphone jika ada di database
    await pool.query("DELETE FROM reviews WHERE product_id IN (SELECT id FROM products WHERE title = 'Wireless Headphone')");
    await pool.query("DELETE FROM products WHERE title = 'Wireless Headphone'");

    const products = [
      { title: 'Smart Watch', description: 'Jam pintar untuk aktivitas harian.', price: 499000, stock: 10, image: 'https://picsum.photos/seed/watch/600/600', category: 'Wearables', sellerEmail: 'seller@demo.com' },
      { title: 'Backpack', description: 'Tas ransel simple untuk kebutuhan kerja dan kuliah.', price: 199000, stock: 8, image: 'https://picsum.photos/seed/bag/600/600', category: 'Bag', sellerEmail: 'seller@demo.com' }
    ];

    for (const p of products) {
      const [sellerRows] = await pool.query('SELECT id FROM users WHERE email = ?', [p.sellerEmail]);
      const sellerId = sellerRows[0] ? sellerRows[0].id : null;
      const [rows] = await pool.query('SELECT id FROM products WHERE title = ?', [p.title]);
      if (!rows.length) {
        await pool.query('INSERT INTO products (seller_id, title, description, price, stock, image, category) VALUES (?,?,?,?,?,?,?)', [sellerId, p.title, p.description, p.price, p.stock, p.image, p.category]);
      }
    }

    const demoBanner = { title: 'Promo Musim Baru', image: 'https://picsum.photos/seed/banner/1200/400', link_url: '/', is_active: 1 };
    const [banners] = await pool.query('SELECT id FROM promo_banners WHERE title = ?', [demoBanner.title]);
    if (!banners.length) {
      await pool.query('INSERT INTO promo_banners (title, image, link_url, is_active) VALUES (?,?,?,?)', [demoBanner.title, demoBanner.image, demoBanner.link_url, demoBanner.is_active]);
    }

    // create demo users with roles
    const demoUsers = [
      { name: 'Demo Buyer', email: 'buyer@demo.com', role: 'BUYER', verified: 0 },
      { name: 'Demo Seller', email: 'seller@demo.com', role: 'SELLER', verified: 1 },
      { name: 'Demo Admin', email: 'admin@demo.com', role: 'ADMIN', verified: 1 }
    ];

    for (const u of demoUsers) {
      const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [u.email]);
      if (!rows.length) {
        const hash = await bcrypt.hash('password', 10);
        await pool.query('INSERT INTO users (name, email, password, role, is_verified) VALUES (?,?,?,?,?)', [u.name, u.email, hash, u.role, u.verified]);
        console.log(`Created demo user: ${u.email} / password (${u.role})`);
      } else {
        console.log(`Demo user already exists: ${u.email}`);
      }
    }

    const [buyerRows] = await pool.query('SELECT id FROM users WHERE email = ?', ['buyer@demo.com']);
    const buyerId = buyerRows[0] ? buyerRows[0].id : null;
    if (buyerId) {
      const [addrRows] = await pool.query('SELECT id FROM user_addresses WHERE user_id = ?', [buyerId]);
      if (!addrRows.length) {
        await pool.query(
          'INSERT INTO user_addresses (user_id, label, recipient_name, phone, address_line1, city, province, postal_code, is_default) VALUES (?,?,?,?,?,?,?,?,?)',
          [buyerId, 'Rumah', 'Demo Buyer', '08123456789', 'Jl. Demo No. 1', 'Jakarta', 'DKI Jakarta', '10000', 1]
        );
      }
    }

    const [productRows] = await pool.query('SELECT id FROM products ORDER BY id ASC LIMIT 1');
    if (buyerId && productRows[0]) {
      const [reviewRows] = await pool.query('SELECT id FROM reviews WHERE user_id = ? AND product_id = ?', [buyerId, productRows[0].id]);
      if (!reviewRows.length) {
        await pool.query('INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?,?,?,?)', [buyerId, productRows[0].id, 5, 'Produk bagus, pengiriman cepat.']);
      }
    }

    console.log('Seed complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message || err);
    process.exit(1);
  }
}

seed();
