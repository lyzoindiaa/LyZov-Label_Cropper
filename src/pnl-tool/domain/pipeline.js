/**
 * Order Normalization & Data Quality Pipeline
 * Converts RawRow array into canonical OrderLines and generates a reconciled Data Quality Report.
 */

import { Money } from './money.js';
import { QualityFlags, createFlag } from './flags.js';
import { normalizeStatus, parseDate } from '../utils/mapper.js';

// Exports often wrap text in literal quotes ("""abc""")
const cleanText = (v) => String(v ?? '').trim().replace(/^["'\s]+|["'\s]+$/g, '').trim();

export function normalizeRows({
  rawRows,
  channelId,
  batchId = 'batch_temp',
  template,
  cogsMap = {}, // sku -> cogsData
  dedupStrategy = 'keep_first', // 'keep_first' | 'keep_latest' | 'keep_all'
}) {
  const columnMap = template.columnMap || {};
  const valueMaps = template.valueMaps || {};

  const accepted = [];
  const rejected = [];
  const flagCounts = {};

  const seenKeys = new Map();

  rawRows.forEach((row, index) => {
    const rawValues = row.rawValues || row;
    const rowIndex = row.rowIndex || index + 1;
    const flags = [];

    // 1. Extract Order ID
    const rawOrderId = cleanText(rawValues[columnMap.orderId]);
    if (!rawOrderId) {
      rejected.push({
        rowIndex,
        rawValues,
        reason: 'Missing Order ID',
      });
      return;
    }
    const orderId = rawOrderId;

    // 2. Extract SKU
    const rawSku = cleanText(rawValues[columnMap.sku]).replace(/^sku\s*:\s*/i, '');
    let sku = rawSku ? rawSku.toUpperCase() : '';
    if (!sku) {
      flags.push(createFlag(QualityFlags.MISSING_SKU));
      sku = 'UNKNOWN-SKU';
    }

    // 3. Extract Order Date
    const rawDate = rawValues[columnMap.orderDate];
    const orderDate = parseDate(rawDate);
    if (!orderDate) {
      flags.push(createFlag(QualityFlags.DATE_UNPARSEABLE, `Raw value: "${rawDate}"`));
    }

    // 4. Extract Quantity
    const rawQty = rawValues[columnMap.quantity];
    let quantity = Number(rawQty);
    if (isNaN(quantity) || quantity === 0) quantity = 1;
    if (quantity < 0) {
      flags.push(createFlag(QualityFlags.NEGATIVE_QTY, `Qty: ${quantity}`));
    }

    // 5. Extract Gross Sales & Money amounts
    const rawPrice = rawValues[columnMap.grossSales];
    const grossSales = Money.fromMajor(rawPrice || 0, template.currency || 'INR');
    if (grossSales.isZero()) {
      flags.push(createFlag(QualityFlags.ZERO_PRICE));
    }

    const rawDiscount = rawValues[columnMap.discounts];
    const discounts = Money.fromMajor(rawDiscount || 0, template.currency || 'INR');
    discounts.amount = Math.abs(discounts.amount); // some exports store discounts as negatives

    const rawShipping = rawValues[columnMap.shippingCharged];
    const shippingCharged = Money.fromMajor(rawShipping || 0, template.currency || 'INR');

    // 6. Extract Status
    const rawStatus = rawValues[columnMap.status];
    const status = normalizeStatus(rawStatus, valueMaps.status || {});
    if (status === 'unknown') {
      flags.push(createFlag(QualityFlags.UNKNOWN_STATUS, `Raw: "${rawStatus}"`));
    }

    // 7. Check COGS
    const cogsData = cogsMap[sku];
    let cogsUnit = null;
    let cogsSource = 'missing';
    if (cogsData && cogsData.cogsUnitPaise !== undefined) {
      cogsUnit = cogsData.cogsUnitPaise;
      cogsSource = 'product_master';
    } else {
      flags.push(createFlag(QualityFlags.MISSING_COGS, `SKU: ${sku}`));
    }

    // 8. Deduplication check
    // Include item id + event/status so Sale and Return rows of one order are not treated as duplicates
    const rawItemId = columnMap.orderItemId ? String(rawValues[columnMap.orderItemId] ?? '').trim() : '';
    const statusKey = String(rawStatus ?? '').trim().toLowerCase();
    // With an Order Item ID, rows are line-level: only fully identical rows are true duplicates
    // (the same item can legitimately be invoiced more than once, e.g. qty 2 split into 2 invoices).
    const rowSignature = rawItemId ? Object.values(rawValues).join('\u0001') : '';
    const naturalKey = `${channelId}_${orderId}_${rawItemId}_${sku}_${orderDate || 'nodate'}_${statusKey}_${rowSignature}`;
    if (seenKeys.has(naturalKey)) {
      flags.push(createFlag(QualityFlags.DUPLICATE_ORDER_LINE, `Order: ${orderId}`));
      if (dedupStrategy === 'keep_first') {
        // Skip duplicate
        rejected.push({
          rowIndex,
          rawValues,
          reason: `Duplicate order line rejected (Strategy: keep_first). Matches line #${seenKeys.get(naturalKey)}`,
        });
        return;
      }
    } else {
      seenKeys.set(naturalKey, rowIndex);
    }

    // Tally flags
    flags.forEach(f => {
      flagCounts[f.code] = (flagCounts[f.code] || 0) + 1;
    });

    // Event-style reports (e.g. Flipkart 'Event Type') list a Return as its own row
    // that reverses an earlier Sale row, so it must only contribute a refund.
    const isEventReturn = status === 'returned' && /event/i.test(String(columnMap.status || ''));

    const orderLine = {
      id: `line_${batchId}_${rowIndex}`,
      batchId,
      sourceRowIndex: rowIndex,
      channelId,
      orderId,
      orderDate: orderDate || '1970-01-01',
      sku,
      productTitle: cleanText(rawValues[columnMap.productTitle]),
      quantity,
      status,
      currency: template.currency || 'INR',
      grossSales: isEventReturn ? 0 : grossSales.amount,
      discounts: isEventReturn ? 0 : discounts.amount,
      shippingCharged: isEventReturn ? 0 : shippingCharged.amount,
      refundAmount: status === 'returned'
        ? (isEventReturn
          ? Math.max(0, Math.abs(grossSales.amount) - Math.abs(discounts.amount) + Math.abs(shippingCharged.amount))
          : Math.abs(grossSales.amount))
        : 0,
      cogsUnitPaise: cogsUnit,
      cogsSource,
      flags,
      rawRowId: `raw_${batchId}_${rowIndex}`,
    };

    accepted.push(orderLine);
  });

  // Reconciled counts verification: raw = accepted + rejected
  const isReconciled = rawRows.length === (accepted.length + rejected.length);

  return {
    rawCount: rawRows.length,
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
    isReconciled,
    accepted,
    rejected,
    flagCounts,
  };
}
