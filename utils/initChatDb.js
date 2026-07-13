const pool = require('../lib/db');

async function initChatTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS \`chat_messages\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`sender_id\` INT NOT NULL,
      \`receiver_id\` INT NOT NULL,
      \`product_id\` INT DEFAULT NULL,
      \`message\` TEXT NOT NULL,
      \`is_read\` TINYINT(1) NOT NULL DEFAULT 0,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_chat_messages_sender_id\` (\`sender_id\`),
      INDEX \`idx_chat_messages_receiver_id\` (\`receiver_id\`),
      INDEX \`idx_chat_messages_created_at\` (\`created_at\`)
    ) ENGINE=InnoDB;
  `;
  try {
    await pool.query(sql);
    console.log('Chat database table initialized successfully.');
  } catch (err) {
    console.error('Error initializing chat database table:', err);
  }
}

module.exports = { initChatTable };
