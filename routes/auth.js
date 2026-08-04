const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../lib/db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email & password required' });
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(400).json({ error: 'Email exists' });

    const hashed = await bcrypt.hash(password, 10);
    const userRole = role && ['BUYER','SELLER','ADMIN'].includes(role) ? role : 'BUYER';
    const [result] = await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name || '', email, hashed, userRole]);
    const userId = result.insertId;
    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: userId, name: name || '', email, role: userRole, avatar: null, phone: null } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email & password required' });
  try {
    const [rows] = await pool.query('SELECT id, name, email, password, role, is_banned, avatar, phone FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // User registered via Google (no password)
    if (!user.password) return res.status(401).json({ error: 'Akun ini terdaftar via Google. Silakan login dengan Google.' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.is_banned) return res.status(403).json({ error: 'User is banned' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, phone: user.phone } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Google OAuth — verify ID Token from frontend
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'No credential provided' });

  try {
    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) return res.status(400).json({ error: 'Google account has no email' });

    // Check if user already exists (by google_id or email)
    const [rows] = await pool.query(
      'SELECT id, name, email, role, is_banned, google_id, avatar, phone FROM users WHERE google_id = ? OR email = ? LIMIT 1',
      [googleId, email]
    );
    let user = rows[0];

    if (user) {
      if (user.is_banned) return res.status(403).json({ error: 'User is banned' });

      // Link google_id if not yet linked (user registered with email first)
      if (!user.google_id) {
        await pool.query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, user.id]);
      }
    } else {
      // Auto-register new user via Google
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password, role, google_id, is_verified, avatar) VALUES (?, ?, NULL, ?, ?, 1, ?)',
        [name || email, email, 'BUYER', googleId, picture || null]
      );
      user = { id: result.insertId, name: name || email, email, role: 'BUYER', avatar: picture || null, phone: null };
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, phone: user.phone },
    });
  } catch (err) {
    console.error('Google auth error details:', {
      message: err.message,
      clientId: GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'UNDEFINED ❌',
    });
    res.status(401).json({ error: 'Google authentication failed: ' + err.message });
  }
});

module.exports = router;
