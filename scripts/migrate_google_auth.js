/**
 * Migration: Add google_id column and make password nullable for Google OAuth support
 * Run: node scripts/migrate_google_auth.js
 */
const pool = require('../lib/db');

async function migrate() {
  console.log('Running Google Auth migration...');
  try {
    // Check if google_id column already exists
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'google_id'
    `);

    if (cols.length === 0) {
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN google_id VARCHAR(255) DEFAULT NULL UNIQUE AFTER email
      `);
      console.log('✓ Added google_id column');
    } else {
      console.log('✓ google_id column already exists, skipping');
    }

    // Make password nullable
    await pool.query(`
      ALTER TABLE users
      MODIFY COLUMN password VARCHAR(255) DEFAULT NULL
    `);
    console.log('✓ Made password column nullable');

    console.log('\n✅ Migration complete! Google OAuth is now supported.');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    process.exit(0);
  }
}

migrate();
