import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Business } from '../models/Business.js';
import { validateGSTIN } from '../config/constants.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

function generateToken(user) {
  const secret = process.env.JWT_SECRET || 'super_secret_gst_tool_jwt_key_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ userId: user._id, role: user.role || 'user' }, secret, { expiresIn });
}

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password, phone, legalName, gstin, stateCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone: phone || '',
      plan: 'trial',
      role: 'user',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day trial
    });

    // Optionally create first business if provided during signup
    let initialBusiness = null;
    if (gstin && legalName) {
      const gstinCheck = validateGSTIN(gstin);
      if (gstinCheck.valid) {
        initialBusiness = await Business.create({
          userId: user._id,
          legalName,
          gstin: gstinCheck.gstin,
          stateCode: gstinCheck.stateCode,
          stateName: gstinCheck.stateName,
          isDefault: true,
        });
      }
    }

    const token = generateToken(user);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        plan: user.plan,
        role: user.role || 'user',
        trialEndsAt: user.trialEndsAt,
      },
      business: initialBusiness,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    // Fetch default business if any
    const defaultBusiness = await Business.findOne({ userId: user._id, isDefault: true })
      || await Business.findOne({ userId: user._id });

    res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        plan: user.plan,
        role: user.role || 'user',
        trialEndsAt: user.trialEndsAt,
      },
      business: defaultBusiness,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const businesses = await Business.find({ userId: req.user._id });
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        plan: req.user.plan,
        role: req.user.role || 'user',
        trialEndsAt: req.user.trialEndsAt,
      },
      businesses,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
