import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import businessRoutes from './routes/businessRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import returnRoutes from './routes/returnRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import gstr3bRoutes from './routes/gstr3bRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload directory exists
const uploadDir = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed origins helper
const parseAllowedOrigins = () => {
  const defaults = [
    'https://tools.lyzov.com',
    'http://tools.lyzov.com',
    'https://lyzov.com',
    'http://lyzov.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
  ];

  const envOrigins = (process.env.CLIENT_URL || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  return [...new Set([...defaults, ...envOrigins])];
};

const allowedOrigins = parseAllowedOrigins();

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests or same-origin
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');

    const isExplicitlyAllowed = allowedOrigins.some(allowed => 
      allowed.replace(/\/+$/, '').toLowerCase() === normalizedOrigin.toLowerCase()
    );

    const isWildcardAllowed = 
      normalizedOrigin.endsWith('.lyzov.com') ||
      normalizedOrigin.endsWith('.vercel.app') ||
      normalizedOrigin.endsWith('.onrender.com') ||
      normalizedOrigin.includes('localhost') ||
      normalizedOrigin.includes('127.0.0.1');

    if (isExplicitlyAllowed || isWildcardAllowed) {
      callback(null, true);
    } else {
      // In production, fallback to allow requesting origin with credentials
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check (both /health and /api/health)
const healthHandler = (req, res) => {
  res.json({
    status: 'ok',
    service: 'GST Tool Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Mount Routes both with and without /api prefix
const mountRoutes = (prefix = '') => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/businesses`, businessRoutes);
  app.use(`${prefix}/uploads`, uploadRoutes);
  app.use(`${prefix}/returns`, returnRoutes);
  app.use(`${prefix}/billing`, billingRoutes);
  app.use(`${prefix}/admin`, adminRoutes);
  app.use(`${prefix}/gstr3b`, gstr3bRoutes);
};

mountRoutes('/api');
mountRoutes('');

// Centralized error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GST Tool Server running on http://localhost:${PORT}`);
  console.log(`   Healthcheck: http://localhost:${PORT}/api/health`);
  connectDB().catch(() => {});
});

export default app;
