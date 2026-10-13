import express from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { toRupees } from '../engine/money.js';

const router = express.Router();
const PLANS = {
  cropper_monthly: {
    id: 'cropper_monthly',
    name: 'Label Cropper Pro',
    priceINR: 99,
    amountPaise: 9900,
    durationDays: 30,
    description: 'Unlimited batch cropping for Amazon, Flipkart, Meesho & custom labels',
  },
  cropper_yearly: {
    id: 'cropper_yearly',
    name: 'Label Cropper Pro (Annual)',
    priceINR: 999,
    amountPaise: 99900,
    durationDays: 365,
    description: '1 Full Year of Unlimited Label Cropping (Best Value)',
  },
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

// ─────────────────────────────────────────────────────────────────────────────
// PATCH FIX #1 — Webhook MUST be registered BEFORE router.use(authenticate)
// Razorpay servers do not send user JWTs — mounting this after authenticate
// would cause every webhook call to return 401 and never activate paid plans.
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/billing/webhook (Razorpay Webhook listener — NO auth required)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // PATCH FIX #2 — If webhook secret is configured, ALWAYS enforce it.
    // Previously the check was `if (webhookSecret && signature)` which allowed
    // unsigned requests through when no secret was set.
    if (webhookSecret) {
      if (!signature) {
        return res.status(400).json({ status: 'missing_signature' });
      }
      const shasum = crypto.createHmac('sha256', webhookSecret);
      shasum.update(req.body);
      const digest = shasum.digest('hex');

      if (digest !== signature) {
        return res.status(400).json({ status: 'invalid_signature' });
      }
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (event.event === 'payment.captured') {
      const orderId = event.payload?.payment?.entity?.order_id;
      const paymentId = event.payload?.payment?.entity?.id;

      if (!orderId || !paymentId) {
        return res.status(400).json({ status: 'malformed_payload' });
      }

      const record = await Payment.findOne({ razorpayOrderId: orderId });
      if (record && record.status !== 'paid') {
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
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// All routes below this line require a valid JWT (logged-in user)
// ─────────────────────────────────────────────────────────────────────────────
router.use(authenticate);

// POST /api/billing/create-order
router.post('/create-order', async (req, res, next) => {
  try {
    const { planId } = req.body;
    const plan = PLANS[planId];

    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan selected.' });
    }

    // PATCH FIX #3 — Require Razorpay credentials to be configured before
    // creating an order. Previously it silently fell back to a fake order ID
    // (order_<timestamp>_<random>) which let the mock verify bypass work.
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      return res.status(503).json({
        error: 'Payment gateway is not configured. Please contact support.',
      });
    }

    // Create a real Razorpay order via the REST API (works for both
    // test keys rzp_test_* and live keys rzp_live_*)
    const authHeader = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: plan.amountPaise,
        currency: 'INR',
        receipt: `rcpt_${req.user._id.toString().slice(-8)}_${Date.now()}`,
        notes: {
          userId: req.user._id.toString(),
          planId: plan.id,
        },
      }),
    });

    if (!rzpResponse.ok) {
      const rzpErr = await rzpResponse.json().catch(() => ({}));
      console.error('Razorpay order creation failed:', rzpErr);
      return res.status(502).json({ error: 'Failed to create payment order. Please try again.' });
    }

    const rzpOrder = await rzpResponse.json();
    const validTill = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);

    const payment = await Payment.create({
      userId: req.user._id,
      plan: plan.id,
      amountPaise: plan.amountPaise,
      razorpayOrderId: rzpOrder.id, // e.g. "order_Abc123XYZ" — issued by Razorpay
      status: 'created',
      validTill,
    });

    res.json({
      orderId: rzpOrder.id,
      amount: plan.priceINR,
      amountPaise: plan.amountPaise,
      currency: 'INR',
      planName: plan.name,
      keyId: razorpayKeyId,
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

    // ─────────────────────────────────────────────────────────────────────
    // PATCH FIX #4 — STRICT field presence enforcement.
    // The old code only verified the signature when BOTH the secret AND
    // the signature were present — meaning a caller could omit the
    // signature entirely and still get upgraded to a paid plan.
    // Now ALL three fields are required, AND the secret MUST be set.
    // ─────────────────────────────────────────────────────────────────────
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        error: 'Missing payment verification credentials (orderId, paymentId, signature required)',
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(503).json({
        error: 'Payment gateway secret not configured. Contact support.',
      });
    }

    const payment = await Payment.findOne({
      userId: req.user._id,
      razorpayOrderId,
    });

    if (!payment) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (payment.status === 'paid') {
      // Idempotency: already verified (e.g. webhook fired first)
      return res.json({
        message: `Already upgraded to ${payment.plan.toUpperCase()} plan!`,
        plan: payment.plan,
        validTill: payment.validTill,
        paymentId: payment.razorpayPaymentId,
      });
    }

    // Verify HMAC SHA-256 signature — ALWAYS required
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      payment.status = 'failed';
      await payment.save();
      return res.status(400).json({ error: 'Payment signature verification failed' });
    }

    // Signature verified — update payment record
    payment.status = 'paid';
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
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

export default router;
