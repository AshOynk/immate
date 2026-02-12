import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'immate-dev-secret-change-in-production';

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Login required' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    User.findById(decoded.id)
      .select('-passwordHash')
      .lean()
      .then((user) => {
        if (!user) return res.status(401).json({ error: 'User not found' });
        req.user = user;
        next();
      })
      .catch(() => res.status(401).json({ error: 'Invalid token' }));
  } catch (err) {
    return res.status(401).json({ error: err.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}
