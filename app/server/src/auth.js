import crypto from 'node:crypto';

// In-memory session store: token -> userId. Fine for a single-process local lab.
const sessions = new Map();

export function createSession(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, userId);
  return token;
}

export function destroySession(token) {
  sessions.delete(token);
}

export function userIdForToken(token) {
  return sessions.get(token);
}

// Express middleware. Reads a bearer token from the Authorization header.
export function requireAuth(db) {
  return (req, res, next) => {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const userId = token && userIdForToken(token);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    req.user = user;
    next();
  };
}
