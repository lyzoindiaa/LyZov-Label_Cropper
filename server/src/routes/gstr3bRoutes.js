/**
 * gstr3bRoutes.js
 *
 * Phase 7: GSTR-3B Backend API Routes
 *
 * Endpoints:
 *   POST   /api/gstr3b/compute          - Compute 3.1, 3.2 from orderlines
 *   GET    /api/gstr3b/:id/summary      - Get computed 3B return summary
 *   GET    /api/gstr3b/history          - List 3B returns for business+period
 *   POST   /api/gstr3b/:id/compare      - Run GSTR-1 vs portal 3B comparison
 *   POST   /api/gstr3b/:id/gstr2b       - Upload & parse GSTR-2B JSON
 *   GET    /api/gstr3b/:id/gstr2b       - Get GSTR-2B invoices for a return
 *   PATCH  /api/gstr3b/:id/gstr2b/:inv  - Update ITC eligibility on one invoice
 *   POST   /api/gstr3b/:id/compute-itc  - Re-compute Table 4 from saved GSTR-2B
 *   POST   /api/gstr3b/:id/cash-ledger  - Save TCS & cash ledger balances
 *   POST   /api/gstr3b/:id/compute-offset - Compute set-off & net payable
 *   GET    /api/gstr3b/:id/download/json  - Download 3B JSON for portal
 *   GET    /api/gstr3b/:id/download/excel - Download CA summary Excel
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/auth.js';
import { Business } from '../models/Business.js';
import { OrderLine } from '../models/OrderLine.js';
import { Gstr3bReturn } from '../models/Gstr3bReturn.js';
import { Gstr2bUpload } from '../models/Gstr2bUpload.js';
import { CashLedger } from '../models/CashLedger.js';
import { aggregateGstr1 } from '../engine/aggregator.js';
import { computeTable31 } from '../gstr3b/outwardEngine.js';
import { computeTable32 } from '../gstr3b/interStateEngine.js';
import { computeTable4 } from '../gstr3b/itcEngine.js';
import { computeTable6 } from '../gstr3b/offsetEngine.js';
import { compare3bVsPortal, parsePortal3bJson } from '../gstr3b/compareEngine.js';
import { generateGstr3bJson } from '../exporters/gstr3bJsonExporter.js';
import { generateGstr3bExcel } from '../exporters/gstr3bExcelExporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const exportsDir = path.resolve(__dirname, '../../uploads/exports');
if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });

const router = express.Router();
router.use(authenticate);

// ── POST /api/gstr3b/compute ───────────────────────────────────────────────
// Compute Tables 3.1, 3.2 from existing orderlines for a business + period
router.post('/compute', async (req, res, next) => {
  try {
    const { businessId, period } = req.body;
    if (!businessId || !period) {
      return res.status(400).json({ error: 'businessId and period (MMYYYY) required' });
    }

    const business = await Business.findOne({ _id: businessId, userId: req.user._id });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const lines = await OrderLine.find({ businessId, period });
    if (!lines.length) {
      return res.status(400).json({ error: `No sales data for period ${period}. Upload reports first.` });
    }

    // Aggregate GSTR-1 data as source
    const gstr1 = aggregateGstr1(lines, business.stateCode, business.legalName);

    // Compute 3B tables
    const table31 = computeTable31(gstr1);
    const table32 = computeTable32(gstr1);

    // Build liability from 3.1(a)
    const liability = {
      igstPaise: table31.outward_taxable.igstPaise + table31.inward_reverse_charge.igstPaise,
      cgstPaise: table31.outward_taxable.cgstPaise + table31.inward_reverse_charge.cgstPaise,
      sgstPaise: table31.outward_taxable.sgstPaise + table31.inward_reverse_charge.sgstPaise,
      cessPaise: table31.outward_taxable.cessPaise + table31.inward_reverse_charge.cessPaise,
    };

    // Upsert Gstr3bReturn (replace if already exists for this period)
    let return3b = await Gstr3bReturn.findOne({ businessId, period, userId: req.user._id });
    if (!return3b) {
      return3b = new Gstr3bReturn({ userId: req.user._id, businessId, period });
    }

    return3b.table31 = table31;
    return3b.table32 = table32;
    return3b.status  = 'COMPUTED';
    return3b.updatedAt = new Date();
    await return3b.save();

    return res.json({
      success: true,
      returnId: return3b._id,
      period,
      table31,
      table32,
      liability,
      gstr1Totals: gstr1.totals,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/gstr3b/history ────────────────────────────────────────────────
router.get('/history', async (req, res, next) => {
  try {
    const { businessId } = req.query;
    const filter = { userId: req.user._id };
    if (businessId) filter.businessId = businessId;

    const returns = await Gstr3bReturn.find(filter)
      .select('businessId period status version comparison.allMatched createdAt updatedAt')
      .sort({ createdAt: -1 });

    return res.json({ returns });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/gstr3b/:id/summary ────────────────────────────────────────────
router.get('/:id/summary', async (req, res, next) => {
  try {
    const return3b = await Gstr3bReturn.findOne({ _id: req.params.id, userId: req.user._id });
    if (!return3b) return res.status(404).json({ error: 'Return not found' });

    const cashLedger = await CashLedger.findOne({ businessId: return3b.businessId, period: return3b.period });
    const gstr2b = await Gstr2bUpload.findOne({ businessId: return3b.businessId, period: return3b.period })
      .select('invoiceCount supplierCount totalItcPaise marketplaceFeeItcPaise status uploadedAt');

    return res.json({ return3b, cashLedger, gstr2b });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/gstr3b/:id/compare ──────────────────────────────────────────
// Compare our 3B values against portal auto-filled 3B (JSON upload or manual entry)
router.post('/:id/compare', async (req, res, next) => {
  try {
    const return3b = await Gstr3bReturn.findOne({ _id: req.params.id, userId: req.user._id });
    if (!return3b) return res.status(404).json({ error: 'Return not found' });

    const { portalJson, manualPortalData, source } = req.body;
    let portalData;
    let portalSource;

    if (portalJson) {
      portalData = parsePortal3bJson(typeof portalJson === 'string' ? JSON.parse(portalJson) : portalJson);
      portalSource = 'uploaded_json';
    } else if (manualPortalData) {
      portalData = manualPortalData;
      portalSource = 'manual_entry';
    } else {
      return res.status(400).json({ error: 'Provide portalJson or manualPortalData' });
    }

    const result = compare3bVsPortal(return3b.table31, return3b.table32, portalData, portalSource);

    return3b.comparison = {
      portalSource,
      reconciledAt: new Date(),
      diffs: result.diffs.map(d => ({
        table: d.table, field: d.field, label: d.label,
        toolValuePaise: d.toolValuePaise,
        portalValuePaise: d.portalValuePaise,
        diffPaise: d.diffPaise,
        isMatch: d.isMatch,
      })),
      allMatched: result.allMatched,
    };
    return3b.status = 'RECONCILED';
    return3b.updatedAt = new Date();
    await return3b.save();

    return res.json({ success: true, comparison: result });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/gstr3b/:id/gstr2b ───────────────────────────────────────────
// Upload & parse GSTR-2B JSON file
router.post('/:id/gstr2b', async (req, res, next) => {
  try {
    const return3b = await Gstr3bReturn.findOne({ _id: req.params.id, userId: req.user._id });
    if (!return3b) return res.status(404).json({ error: 'Return not found' });

    const { gstr2bJson, fileName } = req.body;
    if (!gstr2bJson) return res.status(400).json({ error: 'gstr2bJson required in request body' });

    const parsed = typeof gstr2bJson === 'string' ? JSON.parse(gstr2bJson) : gstr2bJson;

    // Lazy import parser
    const { parseGstr2bJson } = await import('../parsers/gstr2bParser.js');
    const result = parseGstr2bJson(parsed);

    const fileHash = crypto.createHash('sha256')
      .update(JSON.stringify(parsed)).digest('hex').substring(0, 16);

    // Upsert GSTR-2B upload
    let upload = await Gstr2bUpload.findOne({ businessId: return3b.businessId, period: return3b.period });
    if (!upload) {
      upload = new Gstr2bUpload({ userId: req.user._id, businessId: return3b.businessId, period: return3b.period });
    }

    upload.fileName               = fileName || 'GSTR2B.json';
    upload.fileHash               = fileHash;
    upload.status                 = 'PARSED';
    upload.supplierCount          = result.supplierCount;
    upload.invoiceCount           = result.invoiceCount;
    upload.totalItcPaise          = result.totalItc;
    upload.marketplaceFeeItcPaise = result.marketplaceFeeItc;
    upload.invoices               = result.invoices;
    upload.uploadedAt             = new Date();
    await upload.save();

    return res.json({
      success: true,
      uploadId: upload._id,
      supplierCount: result.supplierCount,
      invoiceCount:  result.invoiceCount,
      totalItc:      result.totalItc,
      marketplaceFeeItc: result.marketplaceFeeItc,
      warnings: result.warnings,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/gstr3b/:id/gstr2b ────────────────────────────────────────────
router.get('/:id/gstr2b', async (req, res, next) => {
  try {
    const return3b = await Gstr3bReturn.findOne({ _id: req.params.id, userId: req.user._id });
    if (!return3b) return res.status(404).json({ error: 'Return not found' });

    const upload = await Gstr2bUpload.findOne({ businessId: return3b.businessId, period: return3b.period });
    if (!upload) return res.status(404).json({ error: 'No GSTR-2B uploaded for this period' });

    return res.json({ upload });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/gstr3b/:id/gstr2b/:invoiceIdx ──────────────────────────────
// Update eligibility decision on a single GSTR-2B invoice
router.patch('/:id/gstr2b/:invoiceIdx', async (req, res, next) => {
  try {
    const return3b = await Gstr3bReturn.findOne({ _id: req.params.id, userId: req.user._id });
    if (!return3b) return res.status(404).json({ error: 'Return not found' });

    const upload = await Gstr2bUpload.findOne({ businessId: return3b.businessId, period: return3b.period });
    if (!upload) return res.status(404).json({ error: 'No GSTR-2B found' });

    const idx = parseInt(req.params.invoiceIdx, 10);
    if (!upload.invoices[idx]) return res.status(404).json({ error: 'Invoice index out of range' });

    const { eligibility, ineligibilityReason } = req.body;
    if (!['ELIGIBLE', 'INELIGIBLE', 'REVERSED'].includes(eligibility)) {
      return res.status(400).json({ error: 'eligibility must be ELIGIBLE, INELIGIBLE, or REVERSED' });
    }

    upload.invoices[idx].eligibility = eligibility;
    upload.invoices[idx].ineligibilityReason = ineligibilityReason || '';
    upload.markModified('invoices');
    await upload.save();

    return res.json({ success: true, invoice: upload.invoices[idx] });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/gstr3b/:id/compute-itc ──────────────────────────────────────
router.post('/:id/compute-itc', async (req, res, next) => {
  try {
    const return3b = await Gstr3bReturn.findOne({ _id: req.params.id, userId: req.user._id });
    if (!return3b) return res.status(404).json({ error: 'Return not found' });

    const upload = await Gstr2bUpload.findOne({ businessId: return3b.businessId, period: return3b.period });
    if (!upload) return res.status(400).json({ error: 'Upload GSTR-2B first' });

    const { table4, summary } = computeTable4(upload.invoices);
    return3b.table4 = table4;
    return3b.updatedAt = new Date();
    await return3b.save();

    return res.json({ success: true, table4, summary });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/gstr3b/:id/cash-ledger ──────────────────────────────────────
router.post('/:id/cash-ledger', async (req, res, next) => {
  try {
    const return3b = await Gstr3bReturn.findOne({ _id: req.params.id, userId: req.user._id });
    if (!return3b) return res.status(404).json({ error: 'Return not found' });

    const { tcsCredits, cashBalance, notes } = req.body;

    let ledger = await CashLedger.findOne({ businessId: return3b.businessId, period: return3b.period });
    if (!ledger) {
      ledger = new CashLedger({ userId: req.user._id, businessId: return3b.businessId, period: return3b.period });
    }
    if (tcsCredits)  ledger.tcsCredits  = tcsCredits;
    if (cashBalance) ledger.cashBalance  = cashBalance;
    if (notes !== undefined) ledger.notes = notes;
    ledger.updatedAt = new Date();
    await ledger.save();

    return res.json({ success: true, ledger });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/gstr3b/:id/compute-offset ───────────────────────────────────
router.post('/:id/compute-offset', async (req, res, next) => {
  try {
    const return3b = await Gstr3bReturn.findOne({ _id: req.params.id, userId: req.user._id });
    if (!return3b) return res.status(404).json({ error: 'Return not found' });

    const cashLedger = await CashLedger.findOne({ businessId: return3b.businessId, period: return3b.period });

    const liability = {
      igstPaise: (return3b.table31?.outward_taxable?.igstPaise || 0)
                + (return3b.table31?.inward_reverse_charge?.igstPaise || 0)
                + (return3b.table51?.interest?.igstPaise || 0),
      cgstPaise: (return3b.table31?.outward_taxable?.cgstPaise || 0)
                + (return3b.table31?.inward_reverse_charge?.cgstPaise || 0)
                + (return3b.table51?.interest?.cgstPaise || 0)
                + (return3b.table51?.late_fee?.cgstPaise || 0),
      sgstPaise: (return3b.table31?.outward_taxable?.sgstPaise || 0)
                + (return3b.table31?.inward_reverse_charge?.sgstPaise || 0)
                + (return3b.table51?.interest?.sgstPaise || 0)
                + (return3b.table51?.late_fee?.sgstPaise || 0),
      cessPaise: (return3b.table31?.outward_taxable?.cessPaise || 0)
                + (return3b.table31?.inward_reverse_charge?.cessPaise || 0),
    };

    const itcAvailable = return3b.table4?.net_itc || { igstPaise: 0, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 };

    const { setOff, table6, netPayable } = computeTable6(liability, itcAvailable, cashLedger);

    return3b.table6 = table6;
    return3b.updatedAt = new Date();
    await return3b.save();

    return res.json({ success: true, table6, setOff, netPayable });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/gstr3b/:id/download/json ─────────────────────────────────────
router.get('/:id/download/json', async (req, res, next) => {
  try {
    const return3b = await Gstr3bReturn.findOne({ _id: req.params.id, userId: req.user._id });
    if (!return3b) return res.status(404).json({ error: 'Return not found' });

    const business = await Business.findById(return3b.businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const json = generateGstr3bJson(return3b, business);
    const fileName = `GSTR3B_${business.gstin}_${return3b.period}.json`;

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/json');
    return res.json(json);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/gstr3b/:id/download/excel ────────────────────────────────────
router.get('/:id/download/excel', async (req, res, next) => {
  try {
    const return3b = await Gstr3bReturn.findOne({ _id: req.params.id, userId: req.user._id });
    if (!return3b) return res.status(404).json({ error: 'Return not found' });

    const business = await Business.findById(return3b.businessId);
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const fileName = `GSTR3B_${business.gstin}_${return3b.period}_${Date.now()}.xlsx`;
    const outputPath = path.join(exportsDir, fileName);

    generateGstr3bExcel({
      return3b,
      business,
      comparison: return3b.comparison?.diffs?.length
        ? { diffs: return3b.comparison.diffs, portalSource: return3b.comparison.portalSource, summary: { reconciledAt: return3b.comparison.reconciledAt } }
        : null,
      outputFilePath: outputPath,
    });

    res.download(outputPath, fileName, (err) => {
      if (err) next(err);
    });
  } catch (err) {
    next(err);
  }
});

export default router;
