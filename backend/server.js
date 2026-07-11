const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const { revertExpiredFlashSales } = require('./utils/flashSaleReverter');
const { initPromoTables, checkAndApplyPromos } = require('./utils/promoManager');
const { initChatTable } = require('./utils/initChatDb');
const { initVariantsTable } = require('./utils/initVariantsDb');

dotenv.config();

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

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(cookieParser());

const uploadsDir = path.join(__dirname, 'uploads');
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
  
  // Run chat DB init on startup
  initChatTable().catch(err => console.error('Chat startup error:', err));

  // Run variants DB migration on startup
  initVariantsTable().catch(err => console.error('Variants startup migration error:', err));
  
  // Run flash sale price reverter on startup
  revertExpiredFlashSales().catch(err => console.error('Startup flash sale reversion error:', err));

  // Run promo tables init and check on startup
  initPromoTables()
    .then(() => checkAndApplyPromos())
    .catch(err => console.error('Promo startup error:', err));

  // Set up periodic check every 10 seconds
  setInterval(() => {
    revertExpiredFlashSales().catch(err => console.error('Periodic flash sale reversion error:', err));
    checkAndApplyPromos().catch(err => console.error('Periodic promo check error:', err));
  }, 10000);
});
