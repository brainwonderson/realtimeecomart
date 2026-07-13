const pool = require('../lib/db');

/**
 * Ensures database tables for seller promos exist.
 */
async function initPromoTables() {
  try {
    const promoTableQuery = `
      CREATE TABLE IF NOT EXISTS \`seller_promos\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`seller_id\` INT NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`discount_percentage\` INT NOT NULL DEFAULT 0,
        \`start_time\` DATETIME NOT NULL,
        \`end_time\` DATETIME NOT NULL,
        \`status\` ENUM('UPCOMING', 'ACTIVE', 'ENDED') NOT NULL DEFAULT 'UPCOMING',
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_seller_promos_seller_id\` (\`seller_id\`),
        INDEX \`idx_seller_promos_status\` (\`status\`)
      ) ENGINE=InnoDB;
    `;

    const promoProductsTableQuery = `
      CREATE TABLE IF NOT EXISTS \`seller_promo_products\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`promo_id\` INT NOT NULL,
        \`product_id\` INT NOT NULL,
        UNIQUE KEY \`uniq_promo_product\` (\`promo_id\`, \`product_id\`)
      ) ENGINE=InnoDB;
    `;

    const adminPromosTableQuery = `
      CREATE TABLE IF NOT EXISTS \`admin_promos\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`category\` ENUM('voucher', 'gratis_ongkir', 'checkout_discount') NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`code\` VARCHAR(50) DEFAULT NULL,
        \`discount_type\` ENUM('fixed', 'percentage') DEFAULT 'fixed',
        \`discount_value\` DECIMAL(12,2) DEFAULT 0,
        \`max_discount\` DECIMAL(12,2) DEFAULT NULL,
        \`min_spend\` DECIMAL(12,2) NOT NULL DEFAULT 0,
        \`valid_until\` DATETIME DEFAULT NULL,
        \`quota\` INT DEFAULT NULL,
        \`used_count\` INT NOT NULL DEFAULT 0,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_admin_promos_category\` (\`category\`),
        INDEX \`idx_admin_promos_code\` (\`code\`)
      ) ENGINE=InnoDB;
    `;

    await pool.query(promoTableQuery);
    await pool.query(promoProductsTableQuery);
    await pool.query(adminPromosTableQuery);

    // Run schema updates for 'orders' table
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'`
    );
    const existingColumns = columns.map(c => c.COLUMN_NAME.toLowerCase());
    
    if (!existingColumns.includes('discount_amount')) {
      await pool.query('ALTER TABLE `orders` ADD COLUMN `discount_amount` DECIMAL(12,2) DEFAULT 0');
      console.log("[PromoManager] Column 'discount_amount' added to 'orders' table.");
    }
    if (!existingColumns.includes('shipping_cost')) {
      await pool.query('ALTER TABLE `orders` ADD COLUMN `shipping_cost` DECIMAL(12,2) DEFAULT 0');
      console.log("[PromoManager] Column 'shipping_cost' added to 'orders' table.");
    }
    if (!existingColumns.includes('voucher_code')) {
      await pool.query('ALTER TABLE `orders` ADD COLUMN `voucher_code` VARCHAR(50) DEFAULT NULL');
      console.log("[PromoManager] Column 'voucher_code' added to 'orders' table.");
    }

    console.log('[PromoManager] Database tables and migrations initialized successfully.');
  } catch (error) {
    console.error('[PromoManager] Error initializing database tables:', error);
  }
}

/**
 * Reverts the prices of products associated with a specific promo.
 */
async function revertPromoPrices(promoId) {
  try {
    const [products] = await pool.query(
      'SELECT product_id FROM seller_promo_products WHERE promo_id = ?',
      [promoId]
    );

    for (const p of products) {
      const [prod] = await pool.query(
        'SELECT original_price FROM products WHERE id = ?',
        [p.product_id]
      );

      if (prod.length > 0 && prod[0].original_price !== null) {
        await pool.query(
          'UPDATE products SET price = original_price, original_price = NULL WHERE id = ?',
          [p.product_id]
        );
        console.log(`[PromoManager] Reverted product ${p.product_id} price back to original.`);
      }
    }
  } catch (error) {
    console.error(`[PromoManager] Error reverting prices for promo ${promoId}:`, error);
  }
}

/**
 * Checks for promos that should start or end and applies/reverts the prices.
 */
async function checkAndApplyPromos() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Find all UPCOMING active promos that should be ACTIVE now
    const [upcomingPromos] = await connection.query(
      `SELECT id, discount_percentage FROM seller_promos 
       WHERE status = 'UPCOMING' AND start_time <= NOW() AND end_time >= NOW() AND is_active = 1`
    );

    for (const promo of upcomingPromos) {
      // Find products in this promo
      const [products] = await connection.query(
        'SELECT product_id FROM seller_promo_products WHERE promo_id = ?',
        [promo.id]
      );

      for (const p of products) {
        // Fetch current product price and original price
        const [prod] = await connection.query(
          'SELECT price, original_price FROM products WHERE id = ?',
          [p.product_id]
        );

        if (prod.length > 0) {
          const currentPrice = Number(prod[0].price);
          const originalPrice = prod[0].original_price !== null ? Number(prod[0].original_price) : currentPrice;
          
          // Calculate discounted price
          const promoPrice = originalPrice - (originalPrice * promo.discount_percentage / 100);

          await connection.query(
            'UPDATE products SET price = ?, original_price = ? WHERE id = ?',
            [promoPrice, originalPrice, p.product_id]
          );
        }
      }

      // Update promo status to ACTIVE
      await connection.query(
        "UPDATE seller_promos SET status = 'ACTIVE' WHERE id = ?",
        [promo.id]
      );
      console.log(`[PromoManager] Activated promo ${promo.id} (${promo.discount_percentage}% discount).`);
    }

    // 2. Find all ACTIVE promos that should END (either end_time < NOW() or is_active = 0)
    const [expiredPromos] = await connection.query(
      `SELECT id FROM seller_promos 
       WHERE status = 'ACTIVE' AND (end_time < NOW() OR is_active = 0)`
    );

    for (const promo of expiredPromos) {
      // Revert product prices
      await revertPromoPrices(promo.id);

      // Update promo status to ENDED
      await connection.query(
        "UPDATE seller_promos SET status = 'ENDED' WHERE id = ?",
        [promo.id]
      );
      console.log(`[PromoManager] Ended promo ${promo.id}.`);
    }

    // 3. Automatically deactivate expired admin promos (voucher, gratis_ongkir, checkout_discount)
    const [adminPromoResult] = await connection.query(
      `UPDATE admin_promos 
       SET is_active = 0 
       WHERE is_active = 1 
         AND valid_until IS NOT NULL 
         AND valid_until <= NOW()`
    );
    if (adminPromoResult.affectedRows > 0) {
      console.log(`[PromoManager] Automatically deactivated ${adminPromoResult.affectedRows} expired admin promos.`);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('[PromoManager] Error running checkAndApplyPromos:', error);
  } finally {
    connection.release();
  }
}

module.exports = {
  initPromoTables,
  checkAndApplyPromos,
  revertPromoPrices
};
