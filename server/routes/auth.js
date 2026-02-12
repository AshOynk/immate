import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { User, hashPassword, checkPassword } from '../models/User.js';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'immate-dev-secret-change-in-production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  try {
    const { username, password, role, residentId, name } = req.body;
    if (!username?.trim() || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const existing = await User.findOne({ username: username.trim().toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Username already taken' });
    const passwordHash = await hashPassword(password);
    const user = await User.create({
      username: username.trim().toLowerCase(),
      passwordHash,
      role: role === 'admin' ? 'admin' : 'resident',
      residentId: residentId?.trim() || undefined,
      name: name?.trim() || undefined,
    });
    const token = jwt.sign(
      { id: user._id.toString(), username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    res.status(201).json({
      token,
      user: { id: user._id, username: user.username, role: user.role, residentId: user.residentId, name: user.name },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username?.trim() || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const user = await User.findOne({ username: username.trim().toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });
    const ok = await checkPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid username or password' });
    const token = jwt.sign(
      { id: user._id.toString(), username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    res.json({
      token,
      user: { id: user._id, username: user.username, role: user.role, residentId: user.residentId, name: user.name },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me (requires Authorization: Bearer <token>)
authRouter.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash').lean();
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ user: { id: user._id, username: user.username, role: user.role, residentId: user.residentId, name: user.name } });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export { JWT_SECRET };
