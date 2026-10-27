import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import User from '../models/User.js';
export const sign = (u) => jwt.sign({ id: u._id }, config.jwtSecret, { expiresIn: '30d' });
export async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    const { id } = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch { res.status(401).json({ error: 'Invalid or expired token' }); }
}
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
