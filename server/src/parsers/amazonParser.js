import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { parse as parseCsv } from 'csv-parse/sync';
import { resolveStateCode, parseInvoiceDate } from './commonSchema.js';
import { toPaise } from '../engine/money.js';
import { MARKETPLACE_ETIN } from '../config/constants.js';

// Case-insensitive header matching helper
function getVal(row, candidates, fallback = '') {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const cleanCand = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const k of keys) {
      const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey === cleanCand && row[k] !== undefined && row[k] !== null && row[k] !== '') {
        return row[k];
      }
    }
  }
  return fallback;
}

/**
 * Parses Amazon MTR (Merchant Tax Report) in CSV or XLSX format
 */
export async function parseAmazonReport(filePath, sellerStateCode) {
  const ext = path.extname(filePath).toLowerCase();
  let rawRows = [];

  if (ext === '.csv') {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    rawRows = parseCsv(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } else {
    // Excel workbook
    const workbook = xlsx.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
  }

  const orderLines = [];
  const errors = [];
  const warnings = [];

  let rowIndex = 1; // Header is row 1, data starts at row 2

  for (const row of rawRows) {
    rowIndex++;

    // Extract core fields using fuzzy candidate names
    const invoiceNumber = String(getVal(row, [
      'Invoice Number', 'Invoice No', 'Invoice ID', 'InvoiceNumber', 'Tax Invoice No'
    ])).trim();

    if (!invoiceNumber) {
      // Ignore empty or summary totals row
      continue;
    }

    const orderId = String(getVal(row, ['Order Id', 'Order ID', 'Amazon Order Id', 'OrderId'])).trim();
    const invoiceDateRaw = getVal(row, ['Invoice Date', 'InvoiceDate', 'Date']);
    const invoiceDate = parseInvoiceDate(invoiceDateRaw);

    const transactionTypeRaw = String(getVal(row, [
      'Transaction Type', 'TransactionType', 'Type', 'Event Type'
    ])).toLowerCase();

    let type = 'sale';
    if (transactionTypeRaw.includes('refund') || transactionTypeRaw.includes('return')) {
      type = 'return';
    } else if (transactionTypeRaw.includes('cancel')) {
      type = 'cancellation';
    }

    const buyerGstin = String(getVal(row, [
      'Customer Tax ID', 'Customer Tax Identification Number', 'Buyer GSTIN', 'Customer GSTIN', 'Buyer GST'
    ])).trim().toUpperCase();

    // Ship from state & Place of supply
    const shipFromRaw = getVal(row, ['Ship From State', 'Seller State', 'ShipFromState', 'Dispatch State']);
    const placeOfSupplyRaw = getVal(row, [
      'Customer Bill-To State', 'Place of Supply', 'Ship To State', 'Customer State', 'POS'
    ]);

    const shipFromState = resolveStateCode(shipFromRaw) || sellerStateCode || '';
    const placeOfSupply = resolveStateCode(placeOfSupplyRaw) || shipFromState || '';

    if (!placeOfSupply) {
      warnings.push({
        type: 'WARNING',
        field: 'placeOfSupply',
        sourceRow: rowIndex,
        platform: 'amazon',
        message: `Row ${rowIndex}: Could not resolve Place of Supply for invoice ${invoiceNumber}`,
      });
    }

    // Taxable & Tax amounts
    const taxableRaw = Math.abs(parseFloat(getVal(row, [
      'Tax Exclusive Gross', 'Taxable Value', 'Taxable Amount', 'Net Amount', 'Principal'
    ], 0)) || 0);

    const invoiceValueRaw = Math.abs(parseFloat(getVal(row, [
      'Invoice Amount', 'Invoice Total', 'Gross Amount', 'Total Amount', 'Item Total'
    ], 0)) || taxableRaw);

    const gstRateRaw = parseFloat(getVal(row, [
      'Tax Rate', 'GST Rate', 'Rate', 'GSTRate'
    ], 0)) || 0;

    let igstRaw = Math.abs(parseFloat(getVal(row, ['IGST Amount', 'IGST', 'Integrated Tax'], 0)) || 0);
    let cgstRaw = Math.abs(parseFloat(getVal(row, ['CGST Amount', 'CGST', 'Central Tax'], 0)) || 0);
    let sgstRaw = Math.abs(parseFloat(getVal(row, ['SGST Amount', 'SGST', 'State Tax'], 0)) || 0);
    const cessRaw = Math.abs(parseFloat(getVal(row, ['Cess Amount', 'CESS', 'Cess'], 0)) || 0);

    // If tax amounts are not present in file, compute from tax rate
    if (igstRaw === 0 && cgstRaw === 0 && sgstRaw === 0 && gstRateRaw > 0 && taxableRaw > 0) {
      const isInterState = shipFromState !== placeOfSupply;
      if (isInterState) {
        igstRaw = Number(((taxableRaw * gstRateRaw) / 100).toFixed(2));
      } else {
        const halfRate = gstRateRaw / 2;
        cgstRaw = Number(((taxableRaw * halfRate) / 100).toFixed(2));
        sgstRaw = Number(((taxableRaw * halfRate) / 100).toFixed(2));
      }
    }

    const hsn = String(getVal(row, ['HSN/SAC', 'HSN / SAC', 'HSN Code', 'HSN', 'SAC'])).trim();
    let description = String(getVal(row, ['Item Description', 'Title', 'Product Description', 'Description'])).trim();
    description = description.replace(/^["'\s]+|["'\s]+$/g, '').trim();
    const quantity = parseInt(getVal(row, ['Quantity', 'Qty', 'Item Quantity'], 1), 10) || 1;

    // Platform ETIN for Table 14
    const platformGstin = String(getVal(row, [
      'E-Commerce Operator GSTIN', 'ECO GSTIN', 'Operator GSTIN'
    ], MARKETPLACE_ETIN.AMAZON[0])).trim().toUpperCase();

    orderLines.push({
      platform: 'amazon',
      orderId,
      invoiceNumber,
      invoiceDate,
      type,
      buyerGstin: buyerGstin.length === 15 ? buyerGstin : '',
      shipFromState,
      placeOfSupply,
      hsn,
      description,
      quantity,
      uqc: 'PCS',
      taxableValuePaise: toPaise(taxableRaw),
      gstRate: gstRateRaw,
      igstPaise: toPaise(igstRaw),
      cgstPaise: toPaise(cgstRaw),
      sgstPaise: toPaise(sgstRaw),
      cessPaise: toPaise(cessRaw),
      invoiceValuePaise: toPaise(invoiceValueRaw),
      platformGstin,
      sourceRow: rowIndex,
    });
  }

  return {
    platform: 'amazon',
    rowCount: orderLines.length,
    orderLines,
    errors,
    warnings,
  };
}
