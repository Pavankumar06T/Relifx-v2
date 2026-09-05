const jwt = require('jsonwebtoken');

/**
 * Temporary auth adapter.
 * Replace/bridge this with Dhanajayan's final auth middleware once delivered.
 * Supports either x-dev-user-id in development or a real Bearer JWT.
 */
function requireAuth(req, res, next) {
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_USER_ID) {
    req.user = { id: process.env.DEV_USER_ID };
    return next();
  }

  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, ...payload };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
