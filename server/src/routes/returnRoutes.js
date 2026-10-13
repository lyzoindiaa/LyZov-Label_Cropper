import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/auth.js';
import { Business } from '../models/Business.js';
import { OrderLine } from '../models/OrderLine.js';
import { ReturnReport } from '../models/ReturnReport.js';
import { aggregateGstr1 } from '../engine/aggregator.js';
import { validateOrderLines } from '../validators/dataValidator.js';
import { generateGstr1Json } from '../exporters/jsonExporter.js';
import { generateGstr1Excel } from '../exporters/excelExporter.js';
import { toRupees } from '../engine/money.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const exportsDir = path.resolve(__dirname, '../../uploads/exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

const router = express.Router();
router.use(authenticate);

// POST /api/returns/generate (Compute GSTR-1, run validations, create JSON & Excel)
router.post('/generate', async (req, res, next) => {
  try {
    const { businessId, period } = req.body;

    if (!businessId || !period) {
      return res.status(400).json({ error: 'Business ID and period (MMYYYY) are required' });
    }

    const business = await Business.findOne({ _id: businessId, userId: req.user._id });
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Fetch order lines for this business and period
    const lines = await OrderLine.find({ businessId, period });
    if (lines.length === 0) {
      return res.status(400).json({
        error: `No uploaded sales data found for period ${period}. Please upload Amazon or Flipkart reports first.`,
      });
    }

    // 1. Run statutory validation checks
    const validation = validateOrderLines(lines, business.gstin);

    // 2. Aggregate into statutory GSTR-1 tables
    const aggregated = aggregateGstr1(lines, business.stateCode, business.legalName);

    // 3. Export to GSTR-1 JSON & Excel files
    const jsonFileName = `GSTR1_${business.gstin}_${period}_${Date.now()}.json`;
    const excelFileName = `GSTR1_${business.gstin}_${period}_${Date.now()}.xlsx`;

    const jsonFilePath = path.join(exportsDir, jsonFileName);
    const excelFilePath = path.join(exportsDir, excelFileName);

    generateGstr1Json({
      gstin: business.gstin,
      period,
      aggregatedData: aggregated,
      outputFilePath: jsonFilePath,
    });

    generateGstr1Excel({
      gstin: business.gstin,
      period,
      aggregatedData: aggregated,
      outputFilePath: excelFilePath,
    });

    // 4. Save ReturnReport record
    const report = await ReturnReport.create({
      userId: req.user._id,
      businessId: business._id,
      period,
      totals: aggregated.totals,
      sectionCounts: aggregated.sectionCounts,
      validationIssues: [...validation.errors, ...validation.warnings],
      jsonFilePath,
      excelFilePath,
    });

    res.status(201).json({
      message: 'GSTR-1 generated successfully',
      reportId: report._id,
      totals: {
        totalInvoices: aggregated.totals.totalInvoices,
        taxableValue: toRupees(aggregated.totals.taxableValuePaise),
        igst: toRupees(aggregated.totals.igstPaise),
        cgst: toRupees(aggregated.totals.cgstPaise),
        sgst: toRupees(aggregated.totals.sgstPaise),
        cess: toRupees(aggregated.totals.cessPaise),
        totalTax: toRupees(aggregated.totals.totalTaxPaise),
        totalInvoiceValue: toRupees(aggregated.totals.totalInvoiceValuePaise),
      },
      sectionCounts: aggregated.sectionCounts,
      sections: aggregated.sections,
      validation: {
        isValid: validation.isValid,
        errorCount: validation.errorCount,
        warningCount: validation.warningCount,
        errors: validation.errors,
        warnings: validation.warnings,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/returns/:id/summary (Retrieve return details & statutory sections)
router.get('/:id/summary', async (req, res, next) => {
  try {
    const report = await ReturnReport.findOne({ _id: req.params.id, userId: req.user._id });
    if (!report) {
      return res.status(404).json({ error: 'Return report not found' });
    }

    const business = await Business.findById(report.businessId);
    const lines = await OrderLine.find({ businessId: report.businessId, period: report.period });
    const aggregated = aggregateGstr1(lines, business ? business.stateCode : '29', business ? business.legalName : '');

    res.json({
      reportId: report._id,
      period: report.period,
      business: business ? { gstin: business.gstin, legalName: business.legalName } : null,
      totals: {
        totalInvoices: report.totals.totalInvoices,
        taxableValue: toRupees(report.totals.taxableValuePaise),
        igst: toRupees(report.totals.igstPaise),
        cgst: toRupees(report.totals.cgstPaise),
        sgst: toRupees(report.totals.sgstPaise),
        cess: toRupees(report.totals.cessPaise),
        totalTax: toRupees(report.totals.totalTaxPaise),
        totalInvoiceValue: toRupees(report.totals.totalInvoiceValuePaise),
      },
      sectionCounts: report.sectionCounts,
      sections: aggregated.sections,
      errors: report.validationIssues || [],
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/returns/history (List past generated returns)
router.get('/history', async (req, res, next) => {
  try {
    const reports = await ReturnReport.find({ userId: req.user._id })
      .populate('businessId', 'legalName gstin')
      .sort({ generatedAt: -1 });

    const formatted = reports.map(r => ({
      id: r._id,
      period: r.period,
      business: r.businessId,
      totalTaxableValue: toRupees(r.totals.taxableValuePaise),
      totalTax: toRupees(r.totals.totalTaxPaise),
      totalInvoices: r.totals.totalInvoices,
      generatedAt: r.generatedAt,
      hasJson: Boolean(r.jsonFilePath && fs.existsSync(r.jsonFilePath)),
      hasExcel: Boolean(r.excelFilePath && fs.existsSync(r.excelFilePath)),
    }));

    res.json({ returns: formatted });
  } catch (error) {
    next(error);
  }
});

// GET /api/returns/:id/download/json (Download GSTR-1 JSON)
router.get('/:id/download/json', async (req, res, next) => {
  try {
    const report = await ReturnReport.findOne({ _id: req.params.id, userId: req.user._id });
    if (!report || !report.jsonFilePath || !fs.existsSync(report.jsonFilePath)) {
      return res.status(404).json({ error: 'GSTR-1 JSON file not found or expired' });
    }

    const fileName = path.basename(report.jsonFilePath);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(report.jsonFilePath);
  } catch (error) {
    next(error);
  }
});

// GET /api/returns/:id/download/excel (Download GSTR-1 Excel)
router.get('/:id/download/excel', async (req, res, next) => {
  try {
    const report = await ReturnReport.findOne({ _id: req.params.id, userId: req.user._id });
    if (!report || !report.excelFilePath || !fs.existsSync(report.excelFilePath)) {
      return res.status(404).json({ error: 'GSTR-1 Excel file not found or expired' });
    }

    const fileName = path.basename(report.excelFilePath);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.sendFile(report.excelFilePath);
  } catch (error) {
    next(error);
  }
});

export default router;
