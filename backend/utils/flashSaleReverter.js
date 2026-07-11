const pool = require('../db');

/**
 * Checks for approved flash sale proposals whose events have ended,
 * are deactivated, or have been deleted. Reverts the corresponding
 * products' prices back to their original price and sets proposal status to 'EXPIRED'.
 */
async function revertExpiredFlashSales() {
  try {
    // Find all APPROVED flash sale proposals where:
    // - The event has ended (end_at < NOW())
    // - OR the event is deactivated (is_active = 0)
    // - OR the event is deleted/orphaned (event_id IS NULL or e.id IS NULL)
    const [expiredProposals] = await pool.query(
      `SELECT f.id, f.product_id, f.original_price, f.flash_sale_price
       FROM flash_sale_proposals f
       LEFT JOIN flash_sale_events e ON e.id = f.event_id
       WHERE f.status = 'APPROVED'
         AND (
           f.event_id IS NULL
           OR e.id IS NULL
           OR e.is_active = 0
           OR e.end_at < NOW()
         )
         AND f.original_price IS NOT NULL`
    );

    if (expiredProposals.length === 0) {
      return;
    }

    console.log(`[FlashSaleReverter] Found ${expiredProposals.length} expired or inactive flash sales. Reverting...`);

    for (const proposal of expiredProposals) {
      // Revert the product price back to the original price
      await pool.query(
        'UPDATE products SET price = ? WHERE id = ?',
        [proposal.original_price, proposal.product_id]
      );

      // Update proposal status to 'EXPIRED'
      await pool.query(
        'UPDATE flash_sale_proposals SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['EXPIRED', proposal.id]
      );

      console.log(`[FlashSaleReverter] Reverted product ${proposal.product_id} price from ${proposal.flash_sale_price} to ${proposal.original_price}. Proposal ${proposal.id} marked as EXPIRED.`);
    }
  } catch (error) {
    console.error('[FlashSaleReverter] Error reverting flash sale prices:', error);
  }
}

module.exports = { revertExpiredFlashSales };
