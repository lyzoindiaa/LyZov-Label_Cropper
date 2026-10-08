import express from 'express';
import { User } from '../models/User.js';
import { Business } from '../models/Business.js';
import { ReturnReport } from '../models/ReturnReport.js';
import { Upload } from '../models/Upload.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// All routes here require Admin privilege
router.use(requireAdmin);

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const trialUsers = await User.countDocuments({ plan: 'trial' });
    const starterUsers = await User.countDocuments({ plan: 'starter' });
    const proUsers = await User.countDocuments({ plan: 'pro' });
    
    const totalBusinesses = await Business.countDocuments();
    const totalReturns = await ReturnReport.countDocuments();
    const totalUploads = await Upload.countDocuments();

    res.json({
      stats: {
        totalUsers,
        trialUsers,
        paidUsers: starterUsers + proUsers,
        starterUsers,
        proUsers,
        totalBusinesses,
        totalReturns,
        totalUploads,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/customers
router.get('/customers', async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).lean();

    // Enrich users with their businesses and return counts
    const userIds = users.map(u => u._id);

    const [allBusinesses, allReturns] = await Promise.all([
      Business.find({ userId: { $in: userIds } }).lean(),
      ReturnReport.find({ userId: { $in: userIds } }).select('userId period generatedAt totals').lean(),
    ]);

    const enrichedCustomers = users.map(user => {
      const userBusinesses = allBusinesses.filter(b => b.userId.toString() === user._id.toString());
      const userReturns = allReturns.filter(r => r.userId.toString() === user._id.toString());

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '—',
        role: user.role || 'user',
        plan: user.plan || 'trial',
        trialEndsAt: user.trialEndsAt,
        createdAt: user.createdAt,
        businesses: userBusinesses.map(b => ({
          id: b._id,
          legalName: b.legalName,
          tradeName: b.tradeName,
          gstin: b.gstin,
          stateCode: b.stateCode,
          stateName: b.stateName,
          isDefault: b.isDefault,
        })),
        returnsCount: userReturns.length,
        latestReturn: userReturns.length > 0 ? userReturns[userReturns.length - 1] : null,
      };
    });

    res.json({ customers: enrichedCustomers });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/customers/:id/plan
router.patch('/customers/:id/plan', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plan, extendDays } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (plan && ['trial', 'starter', 'pro'].includes(plan)) {
      user.plan = plan;
    }

    if (extendDays && typeof extendDays === 'number') {
      const currentEnd = user.trialEndsAt && user.trialEndsAt > new Date() ? new Date(user.trialEndsAt) : new Date();
      user.trialEndsAt = new Date(currentEnd.getTime() + extendDays * 24 * 60 * 60 * 1000);
    }

    await user.save();

    res.json({
      message: 'Customer plan updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/customers/:id
router.delete('/customers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }

    await Promise.all([
      User.findByIdAndDelete(id),
      Business.deleteMany({ userId: id }),
      ReturnReport.deleteMany({ userId: id }),
      Upload.deleteMany({ userId: id }),
    ]);

    res.json({ message: 'Customer and all associated records deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
