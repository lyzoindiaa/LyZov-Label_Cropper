import express from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { toRupees } from '../engine/money.js';

const router = express.Router();

const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter Plan',
    priceINR: 149,
    amountPaise: 14900,
    durationDays: 30,
    description: 'Unlimited returns for up to 2 GSTINs',
  },
  pro: {
    id: 'pro',
    name: 'Pro CA Plan',
    priceINR: 499,
    amountPaise: 49900,
    durationDays: 30,
    description: 'Up to 25 GSTINs with multi-client CA support',
  },
};

// GET /api/billing/plans (Public)
router.get('/plans', (req, res) => {
  res.json({ plans: Object.values(PLANS) });
});

// Authenticated billing routes
router.use(authenticate);

// POST /api/billing/create-order
router.post('/create-order', async (req, res, next) => {
  try {
    const { planId } = req.body;
    const plan = PLANS[planId];

    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan selected. Choose starter or pro.' });
    }

    // Generate compliant order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const validTill = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);

    const payment = await Payment.create({
      userId: req.user._id,
      plan: plan.id,
      amountPaise: plan.amountPaise,
      razorpayOrderId: orderId,
      status: 'created',
      validTill,
    });

    res.json({
      orderId,
      amount: plan.priceINR,
      amountPaise: plan.amountPaise,
      currency: 'INR',
      planName: plan.name,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_gst_tool_key',
      paymentRecordId: payment._id,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/billing/verify
router.post('/verify', async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const payment = await Payment.findOne({
      userId: req.user._id,
      razorpayOrderId,
    });

    if (!payment) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // If Razorpay secret is set, verify HMAC SHA-256 signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (secret && razorpaySignature) {
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (generatedSignature !== razorpaySignature) {
        payment.status = 'failed';
        await payment.save();
        return res.status(400).json({ error: 'Payment signature verification failed' });
      }
    }

    // Update payment record
    payment.status = 'paid';
    payment.razorpayPaymentId = razorpayPaymentId || `pay_${Date.now()}`;
    payment.razorpaySignature = razorpaySignature || 'verified_mock_sig';
    await payment.save();

    // Upgrade user's plan and extend expiration
    const user = await User.findById(req.user._id);
    if (user) {
      user.plan = payment.plan;
      user.trialEndsAt = payment.validTill;
      await user.save();
    }

    res.json({
      message: `Successfully upgraded to ${payment.plan.toUpperCase()} plan!`,
      plan: payment.plan,
      validTill: payment.validTill,
      paymentId: payment.razorpayPaymentId,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/billing/invoices
router.get('/invoices', async (req, res, next) => {
  try {
    const payments = await Payment.find({ userId: req.user._id, status: 'paid' }).sort({ createdAt: -1 });

    const invoices = payments.map(p => ({
      id: p._id,
      invoiceNumber: `INV-${p.razorpayOrderId.replace('order_', '').slice(0, 8).toUpperCase()}`,
      plan: p.plan,
      amount: toRupees(p.amountPaise),
      date: p.createdAt,
      validTill: p.validTill,
      paymentId: p.razorpayPaymentId,
    }));

    res.json({ invoices });
  } catch (error) {
    next(error);
  }
});

// POST /api/billing/webhook (Razorpay Webhook listener)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (webhookSecret && signature) {
      const shasum = crypto.createHmac('sha256', webhookSecret);
      shasum.update(req.body);
      const digest = shasum.digest('hex');

      if (digest !== signature) {
        return res.status(400).json({ status: 'invalid_signature' });
      }
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (event.event === 'payment.captured') {
      const orderId = event.payload.payment.entity.order_id;
      const paymentId = event.payload.payment.entity.id;

      const record = await Payment.findOne({ razorpayOrderId: orderId });
      if (record) {
        record.status = 'paid';
        record.razorpayPaymentId = paymentId;
        await record.save();

        await User.findByIdAndUpdate(record.userId, {
          plan: record.plan,
          trialEndsAt: record.validTill,
        });
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
