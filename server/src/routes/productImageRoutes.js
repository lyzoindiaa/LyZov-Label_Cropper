import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import {
  extractProductImage,
  proxyImage,
  getRecentExtractions,
} from '../controllers/productImageController.js';

const router = express.Router();

// Optional authentication middleware: populates req.user if token is valid, doesn't reject guests
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'super_secret_gst_tool_jwt_key_2026_DEV_ONLY';
      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.userId).select('-passwordHash');
      if (user) req.user = user;
    }
  } catch {}
  next();
}

// POST /api/product-image/extract
router.post('/extract', optionalAuth, extractProductImage);

// GET /api/product-image/proxy
router.get('/proxy', proxyImage);

// GET /api/product-image/recent
router.get('/recent', optionalAuth, getRecentExtractions);

export default router;
