import { authenticate } from './auth.js';

export async function requireAdmin(req, res, next) {
  authenticate(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admin privileges required.' });
    }
    next();
  });
}
