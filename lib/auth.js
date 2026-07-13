const jwt = require('jsonwebtoken');
const pool = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

async function verifyToken(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // fetch fresh user data (role, banned, is_seller)
    const [rows] = await pool.query(
      'SELECT id, name, email, role, is_banned, is_seller FROM users WHERE id = ?',
      [payload.id]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid token user' });
    if (user.is_banned) return res.status(403).json({ error: 'User is banned' });
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_seller: user.is_seller  // 0 atau 1
    };
    next();
  } catch (err) {
    console.error('verifyToken error', err.message || err);
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * requireRole('SELLER') — memberi akses kepada:
 *   - user dengan role SELLER / ADMIN
 *   - BUYER yang sudah mengaktifkan is_seller = 1
 */
function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const roleMatch = allowed.includes(req.user.role);
    const sellerByFlag = allowed.includes('SELLER') && req.user.is_seller === 1;
    if (!roleMatch && !sellerByFlag) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
