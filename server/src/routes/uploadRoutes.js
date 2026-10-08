import express from 'express';
import { uploadMiddleware, calculateFileHash } from '../middleware/upload.js';
import { authenticate } from '../middleware/auth.js';
import { Business } from '../models/Business.js';
import { Upload } from '../models/Upload.js';
import { OrderLine } from '../models/OrderLine.js';
import { parseAmazonReport } from '../parsers/amazonParser.js';
import { parseFlipkartReport } from '../parsers/flipkartParser.js';

const router = express.Router();
router.use(authenticate);

// POST /api/uploads (Upload and parse an Amazon or Flipkart report)
router.post('/', uploadMiddleware.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a file to upload (.csv or .xlsx)' });
    }

    const { platform, businessId, period } = req.body;

    if (!platform || !['amazon', 'flipkart'].includes(platform)) {
      return res.status(400).json({ error: 'Valid platform (amazon or flipkart) is required' });
    }

    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    if (!period || !/^(0[1-9]|1[0-2])20[0-9]{2}$/.test(period)) {
      return res.status(400).json({ error: 'Period is required in MMYYYY format (e.g. 092026)' });
    }

    const business = await Business.findOne({ _id: businessId, userId: req.user._id });
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Check duplicate file hash
    const fileHash = await calculateFileHash(req.file.path);
    const existingUpload = await Upload.findOne({ businessId, period, platform, fileHash });
    if (existingUpload) {
      return res.status(409).json({
        error: `This exact ${platform.toUpperCase()} report has already been uploaded for period ${period}`,
        uploadId: existingUpload._id,
      });
    }

    // Parse according to platform
    let parseResult;
    if (platform === 'amazon') {
      parseResult = await parseAmazonReport(req.file.path, business.stateCode);
    } else {
      parseResult = await parseFlipkartReport(req.file.path, business.stateCode);
    }

    if (parseResult.orderLines.length === 0) {
      return res.status(400).json({
        error: 'No valid invoice rows could be parsed from the uploaded file. Please verify the file format.',
      });
    }

    // Record upload in database
    const upload = await Upload.create({
      userId: req.user._id,
      businessId: business._id,
      platform,
      period,
      originalFileName: req.file.originalname,
      storedFilePath: req.file.path,
      fileHash,
      status: 'parsed',
      rowCount: parseResult.orderLines.length,
      errorSummary: parseResult.warnings.map(w => w.message),
    });

    // Bulk insert order lines
    const orderLinesToInsert = parseResult.orderLines.map(line => ({
      ...line,
      uploadId: upload._id,
      businessId: business._id,
      userId: req.user._id,
      period,
    }));

    await OrderLine.insertMany(orderLinesToInsert);

    res.status(201).json({
      message: `Successfully processed ${parseResult.orderLines.length} rows from ${req.file.originalname}`,
      upload: {
        id: upload._id,
        platform: upload.platform,
        period: upload.period,
        fileName: upload.originalFileName,
        rowCount: upload.rowCount,
        warningCount: parseResult.warnings.length,
      },
      warnings: parseResult.warnings.slice(0, 10), // Return top 10 warnings
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/uploads (List uploads for a business and period)
router.get('/', async (req, res, next) => {
  try {
    const { businessId, period } = req.query;
    const filter = { userId: req.user._id };
    if (businessId) filter.businessId = businessId;
    if (period) filter.period = period;

    const uploads = await Upload.find(filter).sort({ createdAt: -1 });
    res.json({ uploads });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/uploads/:id (Delete uploaded file and its parsed rows)
router.delete('/:id', async (req, res, next) => {
  try {
    const upload = await Upload.findOne({ _id: req.params.id, userId: req.user._id });
    if (!upload) {
      return res.status(404).json({ error: 'Upload record not found' });
    }

    // Remove rows from OrderLine
    await OrderLine.deleteMany({ uploadId: upload._id });
    // Remove upload record
    await Upload.deleteOne({ _id: upload._id });

    res.json({ message: 'Upload and associated records deleted successfully', id: req.params.id });
  } catch (error) {
    next(error);
  }
});

export default router;
