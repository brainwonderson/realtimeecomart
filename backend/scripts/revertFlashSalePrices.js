const pool = require('../db');

async function revertFlashSalePrices() {
  try {
    console.log('Checking for expired flash sales...');
    
    // Find all approved flash sale proposals where the event has ended
    const [expiredProposals] = await pool.query(
      `SELECT f.id, f.product_id, f.original_price, f.flash_sale_price
       FROM flash_sale_proposals f
       JOIN flash_sale_events e ON e.id = f.event_id
       WHERE f.status = 'APPROVED'
         AND e.end_at < NOW()
         AND f.original_price IS NOT NULL`
    );
    
    if (expiredProposals.length === 0) {
      console.log('No expired flash sales found.');
      return;
    }
    
    console.log(`Found ${expiredProposals.length} expired flash sales. Reverting prices...`);
    
    // Revert prices for each expired proposal
    for (const proposal of expiredProposals) {
      await pool.query(
        'UPDATE products SET price = ? WHERE id = ?',
        [proposal.original_price, proposal.product_id]
      );
      
      // Update proposal status to indicate price has been reverted
      await pool.query(
        'UPDATE flash_sale_proposals SET status = ? WHERE id = ?',
        ['EXPIRED', proposal.id]
      );
      
      console.log(`Reverted price for product ${proposal.product_id} from ${proposal.flash_sale_price} to ${proposal.original_price}`);
    }
    
    console.log('Price reversion completed successfully.');
  } catch (error) {
    console.error('Error reverting flash sale prices:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
revertFlashSalePrices();
