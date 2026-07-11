const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

// 1. GET /api/chats/rooms - Get all active chat rooms/conversations
router.get('/rooms', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const sql = `
    SELECT 
      u.id AS other_user_id,
      u.name AS other_user_name,
      u.email AS other_user_email,
      u.role AS other_user_role,
      m.message AS last_message,
      m.created_at AS last_message_time,
      (
        SELECT COUNT(*) 
        FROM chat_messages 
        WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0
      ) AS unread_count
    FROM (
      SELECT 
        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_user_id,
        MAX(id) AS last_msg_id
      FROM chat_messages
      WHERE sender_id = ? OR receiver_id = ?
      GROUP BY other_user_id
    ) AS conversations
    JOIN users u ON u.id = conversations.other_user_id
    JOIN chat_messages m ON m.id = conversations.last_msg_id
    ORDER BY last_message_time DESC;
  `;
  try {
    const [rows] = await pool.query(sql, [userId, userId, userId, userId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching chat rooms:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. GET /api/chats/messages/:otherUserId - Get chat history with a specific user
router.get('/messages/:otherUserId', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const otherUserId = Number(req.params.otherUserId);
  
  if (isNaN(otherUserId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    // Mark messages from other user to current user as read
    await pool.query(
      'UPDATE chat_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
      [otherUserId, userId]
    );

    // Get all messages
    const sql = `
      SELECT 
        m.id,
        m.sender_id,
        m.receiver_id,
        m.product_id,
        m.message,
        m.is_read,
        m.created_at,
        p.title AS product_title,
        p.image AS product_image,
        p.price AS product_price
      FROM chat_messages m
      LEFT JOIN products p ON p.id = m.product_id
      WHERE 
        (m.sender_id = ? AND m.receiver_id = ?)
        OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC;
    `;
    const [rows] = await pool.query(sql, [userId, otherUserId, otherUserId, userId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching chat history:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 3. POST /api/chats - Send a chat message
router.post('/', verifyToken, async (req, res) => {
  const senderId = req.user.id;
  const { receiverId, message, productId } = req.body;

  if (!receiverId || !message || !message.trim()) {
    return res.status(400).json({ error: 'Receiver ID and message content are required' });
  }

  try {
    // Check if receiver exists
    const [userRows] = await pool.query('SELECT id, name FROM users WHERE id = ?', [receiverId]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'Receiver user not found' });
    }

    const targetProductId = productId ? Number(productId) : null;

    // Insert message
    const [result] = await pool.query(
      'INSERT INTO chat_messages (sender_id, receiver_id, message, product_id) VALUES (?, ?, ?, ?)',
      [senderId, receiverId, message, targetProductId]
    );

    // Fetch the inserted message details
    const [insertedRows] = await pool.query(
      `SELECT m.*, p.title AS product_title, p.image AS product_image, p.price AS product_price 
       FROM chat_messages m 
       LEFT JOIN products p ON p.id = m.product_id 
       WHERE m.id = ?`,
      [result.insertId]
    );

    res.status(201).json(insertedRows[0]);
  } catch (err) {
    console.error('Error sending chat message:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
