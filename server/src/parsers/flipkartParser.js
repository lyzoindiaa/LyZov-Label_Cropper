import xlsx from 'xlsx';
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
 * Parses Flipkart GST / Sales Report in XLSX format
 */
export async function parseFlipkartReport(filePath, sellerStateCode) {
  const workbook = xlsx.readFile(filePath);
  
  // Look for sheets like 'Sales Report', 'Sales', or take the first sheet
  const targetSheetName = workbook.SheetNames.find(s => 
    s.toLowerCase().includes('sale') || s.toLowerCase().includes('tax')
  ) || workbook.SheetNames[0];

  const worksheet = workbook.Sheets[targetSheetName];
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

  const orderLines = [];
  const errors = [];
  const warnings = [];

  let rowIndex = 1;

  for (const row of rawRows) {
    rowIndex++;

    const invoiceNumber = String(getVal(row, [
      'Invoice No', 'Invoice Number', 'Invoice ID', 'Tax Invoice No', 'Invoice Details'
    ])).trim();

    if (!invoiceNumber) {
      continue;
    }

    const orderId = String(getVal(row, ['Order ID', 'Order Id', 'Flipkart Order ID', 'Item ID'])).trim();
    const invoiceDateRaw = getVal(row, ['Invoice Date', 'Order Date', 'Event Date', 'Date']);
    const invoiceDate = parseInvoiceDate(invoiceDateRaw);

    const eventTypeRaw = String(getVal(row, [
      'Event Type', 'Event', 'Transaction Type', 'Order Type', 'Type'
    ])).toLowerCase();

    let type = 'sale';
    if (eventTypeRaw.includes('return') || eventTypeRaw.includes('refund')) {
      type = 'return';
    } else if (eventTypeRaw.includes('cancel')) {
      type = 'cancellation';
    }

    const buyerGstin = String(getVal(row, [
      'Buyer GSTIN', 'Customer GSTIN', 'Buyer GST', 'Customer Tax ID'
    ])).trim().toUpperCase();

    // Ship From & Place of supply
    const shipFromRaw = getVal(row, [
      'Warehouse State', 'Dispatch State', 'Ship From State', 'Seller State', 'Hub State'
    ]);
    const placeOfSupplyRaw = getVal(row, [
      'Customer State', 'Delivery State', 'Buyer State', 'Place of Supply', 'Destination State'
    ]);

    const shipFromState = resolveStateCode(shipFromRaw) || sellerStateCode || '';
    const placeOfSupply = resolveStateCode(placeOfSupplyRaw) || shipFromState || '';

    if (!placeOfSupply) {
      warnings.push({
        type: 'WARNING',
        field: 'placeOfSupply',
        sourceRow: rowIndex,
        platform: 'flipkart',
        message: `Row ${rowIndex}: Could not resolve Place of Supply for invoice ${invoiceNumber}`,
      });
    }

    // Amounts
    const taxableRaw = Math.abs(parseFloat(getVal(row, [
      'Taxable Value', 'Taxable Amount', 'Net Amount', 'Sale Amount'
    ], 0)) || 0);

    const invoiceValueRaw = Math.abs(parseFloat(getVal(row, [
      'Final Invoice Amount', 'Invoice Amount', 'Total Amount', 'Gross Amount'
    ], 0)) || taxableRaw);

    // Tax rates & amounts
    let igstRate = parseFloat(getVal(row, ['IGST Rate', 'IGST %', 'Rate of IGST'], 0)) || 0;
    let cgstRate = parseFloat(getVal(row, ['CGST Rate', 'CGST %', 'Rate of CGST'], 0)) || 0;
    let sgstRate = parseFloat(getVal(row, ['SGST Rate', 'SGST %', 'Rate of SGST'], 0)) || 0;
    
    let gstRate = igstRate > 0 ? igstRate : (cgstRate + sgstRate);
    if (gstRate === 0) {
      gstRate = parseFloat(getVal(row, ['GST Rate', 'Tax Rate', 'Rate'], 0)) || 0;
    }

    let igstRaw = Math.abs(parseFloat(getVal(row, ['IGST Amount', 'IGST'], 0)) || 0);
    let cgstRaw = Math.abs(parseFloat(getVal(row, ['CGST Amount', 'CGST'], 0)) || 0);
    let sgstRaw = Math.abs(parseFloat(getVal(row, ['SGST Amount', 'SGST'], 0)) || 0);
    const cessRaw = Math.abs(parseFloat(getVal(row, ['Cess Amount', 'CESS', 'Cess'], 0)) || 0);

    // If taxes are not calculated in file, compute from rate & state logic
    if (igstRaw === 0 && cgstRaw === 0 && sgstRaw === 0 && gstRate > 0 && taxableRaw > 0) {
      const isInterState = shipFromState !== placeOfSupply;
      if (isInterState) {
        igstRaw = Number(((taxableRaw * gstRate) / 100).toFixed(2));
      } else {
        const halfRate = gstRate / 2;
        cgstRaw = Number(((taxableRaw * halfRate) / 100).toFixed(2));
        sgstRaw = Number(((taxableRaw * halfRate) / 100).toFixed(2));
      }
    }

    const hsn = String(getVal(row, ['HSN Code', 'HSN', 'SAC', 'HSN/SAC'])).trim();
    const description = String(getVal(row, ['Product Title', 'Title', 'Description', 'SKU'])).trim();
    const quantity = parseInt(getVal(row, ['Quantity', 'Qty'], 1), 10) || 1;

    const platformGstin = String(getVal(row, [
      'ECO GSTIN', 'E-Commerce Operator GSTIN'
    ], MARKETPLACE_ETIN.FLIPKART[0])).trim().toUpperCase();

    orderLines.push({
      platform: 'flipkart',
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
      uqc: 'OTH',
      taxableValuePaise: toPaise(taxableRaw),
      gstRate,
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
    platform: 'flipkart',
    rowCount: orderLines.length,
    orderLines,
    errors,
    warnings,
  };
}
