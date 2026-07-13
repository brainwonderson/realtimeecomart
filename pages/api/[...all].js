const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const { revertExpiredFlashSales } = require('../../utils/flashSaleReverter');
const { initPromoTables, checkAndApplyPromos } = require('../../utils/promoManager');
const { initChatTable } = require('../../utils/initChatDb');
const { initVariantsTable } = require('../../utils/initVariantsDb');

const authRoutes = require('../../routes/auth');
const productRoutes = require('../../routes/products');
const cartRoutes = require('../../routes/cart');
const orderRoutes = require('../../routes/orders');
const sellerRoutes = require('../../routes/seller');
const adminRoutes = require('../../routes/admin');
const accountRoutes = require('../../routes/account');
const reviewRoutes = require('../../routes/reviews');
const storeRoutes = require('../../routes/stores');
const chatRoutes = require('../../routes/chats');

// Global initialization to avoid multiple triggers on hot-reload
if (!global.backendInitialized) {
  global.backendInitialized = true;
  initChatTable().catch(err => console.error('Chat startup error:', err));
  initVariantsTable().catch(err => console.error('Variants startup migration error:', err));
  revertExpiredFlashSales().catch(err => console.error('Startup flash sale reversion error:', err));
  initPromoTables()
    .then(() => checkAndApplyPromos())
    .catch(err => console.error('Promo startup error:', err));

  setInterval(() => {
    revertExpiredFlashSales().catch(err => console.error('Periodic flash sale reversion error:', err));
    checkAndApplyPromos().catch(err => console.error('Periodic promo check error:', err));
  }, 10000);
}

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(cookieParser());

const uploadsDir = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/chats', chatRoutes);

export default app;

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};
