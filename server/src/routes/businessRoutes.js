import express from 'express';
import { Business } from '../models/Business.js';
import { validateGSTIN, GST_STATE_CODES } from '../config/constants.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// POST /api/businesses/validate-gstin (Public utility for live UI verification)
router.post('/validate-gstin', (req, res) => {
  const { gstin } = req.body;
  const result = validateGSTIN(gstin);
  res.json(result);
});

router.use(authenticate);

// GET /api/businesses (List all businesses for authenticated user)
router.get('/', async (req, res, next) => {
  try {
    const businesses = await Business.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ businesses });
  } catch (error) {
    next(error);
  }
});

// POST /api/businesses (Add a new business)
router.post('/', async (req, res, next) => {
  try {
    const { legalName, tradeName, gstin, filingFrequency, isDefault } = req.body;

    if (!legalName || !gstin) {
      return res.status(400).json({ error: 'Legal business name and GSTIN are required' });
    }

    const check = validateGSTIN(gstin);
    if (!check.valid) {
      return res.status(400).json({ error: check.reason });
    }

    // Check duplicate
    const existing = await Business.findOne({ userId: req.user._id, gstin: check.gstin });
    if (existing) {
      return res.status(409).json({ error: 'You have already added this GSTIN' });
    }

    // If marked default, unset others
    if (isDefault) {
      await Business.updateMany({ userId: req.user._id }, { isDefault: false });
    }

    const business = await Business.create({
      userId: req.user._id,
      legalName,
      tradeName: tradeName || '',
      gstin: check.gstin,
      stateCode: check.stateCode,
      stateName: check.stateName,
      filingFrequency: filingFrequency || 'monthly',
      isDefault: Boolean(isDefault),
    });

    res.status(201).json({ message: 'Business added successfully', business });
  } catch (error) {
    next(error);
  }
});

// PUT /api/businesses/:id (Update business details)
router.put('/:id', async (req, res, next) => {
  try {
    const { legalName, tradeName, filingFrequency, isDefault } = req.body;

    const business = await Business.findOne({ _id: req.params.id, userId: req.user._id });
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    if (legalName) business.legalName = legalName;
    if (tradeName !== undefined) business.tradeName = tradeName;
    if (filingFrequency) business.filingFrequency = filingFrequency;

    if (isDefault) {
      await Business.updateMany({ userId: req.user._id }, { isDefault: false });
      business.isDefault = true;
    }

    await business.save();
    res.json({ message: 'Business updated successfully', business });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/businesses/:id (Remove business)
router.delete('/:id', async (req, res, next) => {
  try {
    const business = await Business.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json({ message: 'Business deleted successfully', id: req.params.id });
  } catch (error) {
    next(error);
  }
});

export default router;
