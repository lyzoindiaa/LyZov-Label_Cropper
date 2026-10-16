import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  PnlUser,
  PnlBatch,
  PnlRawRow,
  PnlOrderLine,
  PnlProduct,
  PnlTemplate,
  PnlFeeRule,
  PnlPayment,
} from '../models/PnlModels.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pnl_secret_jwt_key_2026';

// In-Memory Dev / Offline User Cache (Used when MongoDB is offline)
const inMemoryPnlUsers = new Map();
if (process.env.ADMIN_EMAIL) {
  inMemoryPnlUsers.set(process.env.ADMIN_EMAIL.toLowerCase(), {
    _id: 'admin_master_001',
    id: 'admin_master_001',
    email: process.env.ADMIN_EMAIL.toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'admin123',
    name: 'Admin',
    businessName: 'Admin HQ',
    role: 'admin',
    plan: 'enterprise_499',
    trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    subscriptionStatus: 'active',
  });
}

// Middleware for P&L User Authentication
export function authenticatePnlUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.pnlUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

// Middleware for Admin Check
export async function requirePnlAdmin(req, res, next) {
  try {
    if (req.pnlUser?.role === 'admin') {
      req.adminUser = req.pnlUser;
      return next();
    }
    if (mongoose.connection?.readyState === 1) {
      const user = await PnlUser.findById(req.pnlUser.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      req.adminUser = user;
      return next();
    }
    return res.status(403).json({ error: 'Admin access required' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify admin privileges' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AUTHENTICATION & SESSIONS
// ─────────────────────────────────────────────────────────────────────────────

router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name, businessName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (mongoose.connection?.readyState !== 1) {
      if (inMemoryPnlUsers.has(email.toLowerCase())) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }
      const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
      const role = (adminEmail && email.toLowerCase() === adminEmail) || inMemoryPnlUsers.size === 0 ? 'admin' : 'seller';
      const mockUser = {
        _id: 'user_' + Date.now(),
        id: 'user_' + Date.now(),
        email: email.toLowerCase(),
        password,
        name: name || '',
        businessName: businessName || '',
        role,
        plan: role === 'admin' ? 'enterprise_499' : 'trial',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subscriptionStatus: 'active',
      };
      inMemoryPnlUsers.set(email.toLowerCase(), mockUser);
      const token = jwt.sign(
        { id: mockUser._id, email: mockUser.email, role: mockUser.role, plan: mockUser.plan },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
      return res.status(201).json({ token, user: mockUser });
    }

    const existing = await PnlUser.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Security patch: Only first user or designated ADMIN_EMAIL gets admin role
    const userCount = await PnlUser.countDocuments();
    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
    const isFirstUser = userCount === 0;
    const isDesignatedAdmin = adminEmail && email.toLowerCase() === adminEmail;
    const role = isFirstUser || isDesignatedAdmin ? 'admin' : 'seller';

    const user = await PnlUser.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || '',
      businessName: businessName || '',
      role,
      plan: 'trial',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day free trial
      subscriptionStatus: 'active',
    });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, plan: user.plan },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        businessName: user.businessName,
        role: user.role,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt,
        subscriptionStatus: user.subscriptionStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // In-memory fallback if MongoDB is in offline mode
    if (mongoose.connection?.readyState !== 1) {
      const existing = inMemoryPnlUsers.get(email.toLowerCase());
      if (existing && existing.password === password) {
        const token = jwt.sign(
          { id: existing._id, email: existing.email, role: existing.role, plan: existing.plan },
          JWT_SECRET,
          { expiresIn: '30d' }
        );
        return res.json({ token, user: existing });
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let user = await PnlUser.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, plan: user.plan },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        businessName: user.businessName,
        role: user.role,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt,
        subscriptionStatus: user.subscriptionStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

router.get('/auth/me', authenticatePnlUser, async (req, res) => {
  try {
    const user = await PnlUser.findById(req.pnlUser.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. BILLING & RAZORPAY INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

const PLANS = {
  pro_199: {
    id: 'pro_199',
    name: 'Pro Seller Plan',
    priceINR: 199,
    amountPaise: 19900,
    durationDays: 30,
    features: ['Unlimited Orders & Channels', 'Profit Waterfall Bridge', 'Price & Return Simulators', 'Universal CSV/XLSX Mapping'],
  },
  enterprise_499: {
    id: 'enterprise_499',
    name: 'Enterprise / CA Plan',
    priceINR: 499,
    amountPaise: 49900,
    durationDays: 30,
    features: ['Everything in Pro', 'Multi-Store Aggregations', 'Priority Processing (100k+ rows)', 'Automated Settlement Matching', 'Export to PDF & Excel'],
  },
};

router.get('/billing/plans', (req, res) => {
  res.json({ plans: Object.values(PLANS) });
});

router.post('/billing/create-order', authenticatePnlUser, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = PLANS[planId];
    if (!plan) return res.status(400).json({ error: 'Invalid plan selected' });

    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Generate Razorpay Order or fallback simulated order for dev/sandbox
    const receipt = `pnl_rcpt_${Date.now()}`;
    let orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (keyId && keySecret && !keyId.includes('placeholder')) {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: plan.amountPaise,
          currency: 'INR',
          receipt,
          notes: { userId: req.pnlUser.id, planId },
        }),
      });
      const rzpData = await rzpRes.json();
      if (rzpData.id) orderId = rzpData.id;
    }

    res.json({
      orderId,
      amountPaise: plan.amountPaise,
      amountINR: plan.priceINR,
      currency: 'INR',
      keyId,
      plan,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create payment order' });
  }
});

router.post('/billing/verify-payment', authenticatePnlUser, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planId } = req.body;
    const plan = PLANS[planId];
    if (!plan) return res.status(400).json({ error: 'Invalid plan' });

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keySecret && !keySecret.includes('placeholder')) {
      if (!razorpaySignature || !razorpayOrderId || !razorpayPaymentId) {
        return res.status(400).json({ error: 'Missing Razorpay signature or payment details' });
      }
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({ error: 'Invalid payment signature verification' });
      }
    }

    // Save payment log to MongoDB
    await PnlPayment.create({
      userId: req.pnlUser.id,
      plan: planId,
      amountINR: plan.priceINR,
      amountPaise: plan.amountPaise,
      currency: 'INR',
      razorpayOrderId: razorpayOrderId || `rzp_ord_${Date.now()}`,
      razorpayPaymentId: razorpayPaymentId || `rzp_pay_${Date.now()}`,
      razorpaySignature: razorpaySignature || 'verified_mock_sig',
      status: 'success',
    });

    // Upgrade user plan
    const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
    const updatedUser = await PnlUser.findByIdAndUpdate(
      req.pnlUser.id,
      {
        plan: planId,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiresAt,
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: `Successfully upgraded to ${plan.name}`,
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Payment verification failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. BATCHES, RAW ROWS & INGESTION
// ─────────────────────────────────────────────────────────────────────────────

router.post('/batches', authenticatePnlUser, async (req, res) => {
  try {
    const { channelId, templateId, fileName, fileHash, rowCountRaw, rawRows = [] } = req.body;
    
    // Deduplication check by hash for this user
    const existing = await PnlBatch.findOne({ userId: req.pnlUser.id, fileHash });
    if (existing) {
      return res.status(409).json({
        error: 'Duplicate file import detected',
        batchId: existing._id,
        fileName: existing.fileName,
        importedAt: existing.createdAt,
      });
    }

    const batch = await PnlBatch.create({
      userId: req.pnlUser.id,
      channelId,
      templateId,
      fileName,
      fileHash,
      rowCountRaw: rowCountRaw || rawRows.length,
      rowCountAccepted: 0,
      rowCountRejected: 0,
    });

    // Bulk insert raw rows if provided
    if (rawRows.length > 0) {
      const docs = rawRows.slice(0, 10000).map((row, idx) => ({
        batchId: batch._id,
        rowIndex: idx + 1,
        rawValues: row,
      }));
      await PnlRawRow.insertMany(docs, { ordered: false });
    }

    res.status(201).json({ batch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/batches', authenticatePnlUser, async (req, res) => {
  try {
    const batches = await PnlBatch.find({ userId: req.pnlUser.id }).sort({ createdAt: -1 });
    res.json({ batches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/batches/:id/rows', authenticatePnlUser, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const rows = await PnlRawRow.find({ batchId: req.params.id })
      .skip(skip)
      .limit(limit)
      .sort({ rowIndex: 1 });
    const total = await PnlRawRow.countDocuments({ batchId: req.params.id });

    res.json({ rows, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. CANONICAL ORDER LINES
// ─────────────────────────────────────────────────────────────────────────────

router.post('/orders/bulk', authenticatePnlUser, async (req, res) => {
  try {
    const { batchId, orderLines = [] } = req.body;
    if (!orderLines.length) return res.json({ inserted: 0 });

    const docs = orderLines.map(line => ({
      ...line,
      batchId: batchId || line.batchId,
      userId: req.pnlUser.id,
    }));

    const result = await PnlOrderLine.insertMany(docs, { ordered: false });
    
    // Update batch accepted counts
    if (batchId) {
      await PnlBatch.findByIdAndUpdate(batchId, {
        rowCountAccepted: docs.length,
      });
    }

    res.status(201).json({ inserted: result.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders', authenticatePnlUser, async (req, res) => {
  try {
    const { channelId, status, sku, limit = 500, skip = 0 } = req.query;
    const filter = { userId: req.pnlUser.id };
    if (channelId) filter.channelId = channelId;
    if (status) filter.status = status;
    if (sku) filter.sku = sku.toUpperCase();

    const orders = await PnlOrderLine.find(filter)
      .sort({ orderDate: -1 })
      .skip(Number(skip))
      .limit(Number(limit));
    const total = await PnlOrderLine.countDocuments(filter);

    res.json({ orders, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. PRODUCT MASTER & COGS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/products', authenticatePnlUser, async (req, res) => {
  try {
    const products = await PnlProduct.find({ userId: req.pnlUser.id }).sort({ sku: 1 });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products', authenticatePnlUser, async (req, res) => {
  try {
    const { sku, title, cogsUnitPaise, packagingCostPaise, otherUnitCostPaise, aliases = [] } = req.body;
    if (!sku) return res.status(400).json({ error: 'SKU is required' });

    const product = await PnlProduct.findOneAndUpdate(
      { userId: req.pnlUser.id, sku: sku.toUpperCase().trim() },
      {
        title,
        cogsUnitPaise: Math.round(Number(cogsUnitPaise) || 0),
        packagingCostPaise: Math.round(Number(packagingCostPaise) || 0),
        otherUnitCostPaise: Math.round(Number(otherUnitCostPaise) || 0),
        aliases: aliases.map(a => a.toUpperCase().trim()),
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products/bulk', authenticatePnlUser, async (req, res) => {
  try {
    const { products = [] } = req.body;
    for (const p of products) {
      if (!p.sku) continue;
      await PnlProduct.findOneAndUpdate(
        { userId: req.pnlUser.id, sku: p.sku.toUpperCase().trim() },
        {
          title: p.title || p.sku,
          cogsUnitPaise: Math.round(Number(p.cogsUnitPaise) || 0),
          packagingCostPaise: Math.round(Number(p.packagingCostPaise) || 0),
          otherUnitCostPaise: Math.round(Number(p.otherUnitCostPaise) || 0),
          aliases: (p.aliases || []).map(a => a.toUpperCase().trim()),
          updatedAt: new Date(),
        },
        { upsert: true }
      );
    }
    res.json({ success: true, count: products.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. TEMPLATES & FEE RULES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/templates', authenticatePnlUser, async (req, res) => {
  try {
    // Return user templates AND system starter templates
    const templates = await PnlTemplate.find({
      $or: [{ userId: req.pnlUser.id }, { isSystemTemplate: true }],
    }).sort({ isSystemTemplate: -1, name: 1 });
    res.json({ templates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/templates', authenticatePnlUser, async (req, res) => {
  try {
    const template = await PnlTemplate.create({
      ...req.body,
      userId: req.pnlUser.id,
      isSystemTemplate: false,
    });
    res.status(201).json({ template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/rules', authenticatePnlUser, async (req, res) => {
  try {
    const rules = await PnlFeeRule.find({
      $or: [{ userId: req.pnlUser.id }, { userId: null }],
    }).sort({ channelId: 1, priority: 1 });
    res.json({ rules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/rules', authenticatePnlUser, async (req, res) => {
  try {
    const rule = await PnlFeeRule.create({
      ...req.body,
      userId: req.pnlUser.id,
    });
    res.status(201).json({ rule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. ADMIN DASHBOARD API
// ─────────────────────────────────────────────────────────────────────────────

router.get('/admin/stats', authenticatePnlUser, requirePnlAdmin, async (req, res) => {
  try {
    if (mongoose.connection?.readyState !== 1) {
      return res.json({
        totalUsers: inMemoryPnlUsers.size || 1,
        trialUsers: 0,
        proUsers: 0,
        enterpriseUsers: 1,
        totalRevenueINR: 499,
        mrrINR: 499,
        totalBatches: 2,
        totalOrders: 148,
      });
    }

    const totalUsers = await PnlUser.countDocuments();
    const trialUsers = await PnlUser.countDocuments({ plan: 'trial' });
    const proUsers = await PnlUser.countDocuments({ plan: 'pro_199' });
    const enterpriseUsers = await PnlUser.countDocuments({ plan: 'enterprise_499' });

    const totalPayments = await PnlPayment.find({ status: 'success' });
    const totalRevenueINR = totalPayments.reduce((acc, p) => acc + (p.amountINR || 0), 0);
    const mrrINR = (proUsers * 199) + (enterpriseUsers * 499);

    const totalBatches = await PnlBatch.countDocuments();
    const totalOrders = await PnlOrderLine.countDocuments();

    res.json({
      totalUsers,
      trialUsers,
      proUsers,
      enterpriseUsers,
      totalRevenueINR,
      mrrINR,
      totalBatches,
      totalOrders,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/users', authenticatePnlUser, requirePnlAdmin, async (req, res) => {
  try {
    if (mongoose.connection?.readyState !== 1) {
      const users = Array.from(inMemoryPnlUsers.values()).map(u => ({
        _id: u._id,
        email: u.email,
        name: u.name,
        businessName: u.businessName,
        role: u.role,
        plan: u.plan,
        trialEndsAt: u.trialEndsAt,
        subscriptionStatus: u.subscriptionStatus,
        createdAt: new Date(),
      }));
      return res.json({ users });
    }

    const users = await PnlUser.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/users/:id/plan', authenticatePnlUser, requirePnlAdmin, async (req, res) => {
  try {
    const { plan, extendTrialDays } = req.body;
    if (mongoose.connection?.readyState !== 1) {
      return res.json({ success: true, message: 'Plan updated (mock)' });
    }

    const user = await PnlUser.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (plan) user.plan = plan;
    if (extendTrialDays) {
      const base = user.trialEndsAt && user.trialEndsAt > new Date() ? user.trialEndsAt : new Date();
      user.trialEndsAt = new Date(base.getTime() + extendTrialDays * 24 * 60 * 60 * 1000);
      user.subscriptionStatus = 'active';
    }

    await user.save();
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/payments', authenticatePnlUser, requirePnlAdmin, async (req, res) => {
  try {
    if (mongoose.connection?.readyState !== 1) {
      return res.json({ payments: [] });
    }

    const payments = await PnlPayment.find()
      .populate('userId', 'email name businessName')
      .sort({ createdAt: -1 });
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed default starter channel templates
router.post('/admin/seed-templates', authenticatePnlUser, requirePnlAdmin, async (req, res) => {
  try {
    const starterTemplates = [
      {
        channelId: 'shopify',
        name: 'Shopify Orders Export',
        version: 1,
        fileType: 'csv',
        headerRow: 1,
        columnMap: {
          orderId: 'Name',
          orderDate: 'Created at',
          sku: 'Lineitem sku',
          productTitle: 'Lineitem name',
          quantity: 'Lineitem quantity',
          grossSales: 'Lineitem price',
          discounts: 'Lineitem discount',
          shippingCharged: 'Shipping',
          status: 'Financial Status',
        },
        valueMaps: {
          status: { paid: 'delivered', pending: 'shipped', refunded: 'returned', voided: 'cancelled' },
        },
        currency: 'INR',
        isSystemTemplate: true,
      },
      {
        channelId: 'amazon',
        name: 'Amazon MTR / Order Report',
        version: 1,
        fileType: 'csv',
        headerRow: 1,
        columnMap: {
          orderId: 'Order Id',
          orderDate: 'Order Date',
          sku: 'Seller SKU',
          productTitle: 'Title',
          quantity: 'Quantity',
          grossSales: 'Item Price',
          discounts: 'Promotion Discount',
          shippingCharged: 'Shipping Price',
          status: 'Order Status',
        },
        valueMaps: {
          status: { Shipped: 'delivered', Cancelled: 'cancelled', Returned: 'returned' },
        },
        currency: 'INR',
        isSystemTemplate: true,
      },
      {
        channelId: 'flipkart',
        name: 'Flipkart Sales Report',
        version: 1,
        fileType: 'csv',
        headerRow: 1,
        columnMap: {
          orderId: 'Order ID',
          orderDate: 'Order Date',
          sku: 'FSN / SKU',
          productTitle: 'Product Title',
          quantity: 'Quantity',
          grossSales: 'Final Selling Price',
          discounts: 'Discount',
          shippingCharged: 'Shipping Charge',
          status: 'Status',
        },
        valueMaps: {
          status: { DELIVERED: 'delivered', CANCELLED: 'cancelled', RETURN: 'returned' },
        },
        currency: 'INR',
        isSystemTemplate: true,
      },
      {
        channelId: 'meesho',
        name: 'Meesho Orders Export',
        version: 1,
        fileType: 'csv',
        headerRow: 1,
        columnMap: {
          orderId: 'Sub Order No',
          orderDate: 'Order Date',
          sku: 'Supplier SKU',
          productTitle: 'Product Name',
          quantity: 'Quantity',
          grossSales: 'Product Price',
          discounts: 'Discount',
          shippingCharged: 'Shipping Charges',
          status: 'Order Status',
        },
        valueMaps: {
          status: { Delivered: 'delivered', Cancelled: 'cancelled', RTO: 'rto' },
        },
        currency: 'INR',
        isSystemTemplate: true,
      },
      {
        channelId: 'woocommerce',
        name: 'WooCommerce Orders Export',
        version: 1,
        fileType: 'csv',
        headerRow: 1,
        columnMap: {
          orderId: 'Order Number',
          orderDate: 'Order Date',
          sku: 'SKU',
          productTitle: 'Item Name',
          quantity: 'Quantity',
          grossSales: 'Item Cost',
          discounts: 'Discount Amount',
          shippingCharged: 'Order Shipping',
          status: 'Order Status',
        },
        valueMaps: {
          status: { completed: 'delivered', processing: 'shipped', refunded: 'returned', cancelled: 'cancelled' },
        },
        currency: 'INR',
        isSystemTemplate: true,
      },
    ];

    for (const t of starterTemplates) {
      await PnlTemplate.findOneAndUpdate(
        { channelId: t.channelId, isSystemTemplate: true },
        t,
        { upsert: true }
      );
    }

    res.json({ success: true, count: starterTemplates.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
