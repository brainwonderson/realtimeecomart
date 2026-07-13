const express = require('express');
const next = require('next');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const { revertExpiredFlashSales } = require('./utils/flashSaleReverter');
const { initPromoTables, checkAndApplyPromos } = require('./utils/promoManager');
const { initChatTable } = require('./utils/initChatDb');
const { initVariantsTable } = require('./utils/initVariantsDb');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const sellerRoutes = require('./routes/seller');
const adminRoutes = require('./routes/admin');
const accountRoutes = require('./routes/account');
const reviewRoutes = require('./routes/reviews');
const storeRoutes = require('./routes/stores');
const chatRoutes = require('./routes/chats');

const PORT = process.env.PORT || 3000;

app.prepare().then(() => {
  const server = express();

  server.use(cors({ origin: true, credentials: true }));
  server.use(express.json({ limit: '15mb' }));
  server.use(cookieParser());

  const uploadsDir = path.join(__dirname, 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  server.use('/uploads', express.static(uploadsDir));

  // Express API routes
  server.use('/api/auth', authRoutes);
  server.use('/api/products', productRoutes);
  server.use('/api/cart', cartRoutes);
  server.use('/api/orders', orderRoutes);
  server.use('/api/seller', sellerRoutes);
  server.use('/api/admin', adminRoutes);
  server.use('/api/account', accountRoutes);
  server.use('/api/reviews', reviewRoutes);
  server.use('/api/stores', storeRoutes);
  server.use('/api/chats', chatRoutes);

  // All other requests are handled by Next.js
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);

    // Run startup tasks
    initChatTable().catch(err => console.error('Chat startup error:', err));
    initVariantsTable().catch(err => console.error('Variants startup migration error:', err));
    revertExpiredFlashSales().catch(err => console.error('Startup flash sale reversion error:', err));
    initPromoTables()
      .then(() => checkAndApplyPromos())
      .catch(err => console.error('Promo startup error:', err));

    // Set up periodic check every 10 seconds
    setInterval(() => {
      revertExpiredFlashSales().catch(err => console.error('Periodic flash sale reversion error:', err));
      checkAndApplyPromos().catch(err => console.error('Periodic promo check error:', err));
    }, 10000);
  });
});
