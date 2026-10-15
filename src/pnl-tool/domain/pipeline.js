/**
 * Order Normalization & Data Quality Pipeline
 * Converts RawRow array into canonical OrderLines and generates a reconciled Data Quality Report.
 */

import { Money } from './money.js';
import { QualityFlags, createFlag } from './flags.js';
import { normalizeStatus, parseDate } from '../utils/mapper.js';

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
    const rawOrderId = rawValues[columnMap.orderId];
    if (!rawOrderId || !String(rawOrderId).trim()) {
      rejected.push({
        rowIndex,
        rawValues,
        reason: 'Missing Order ID',
      });
      return;
    }
    const orderId = String(rawOrderId).trim();

    // 2. Extract SKU
    const rawSku = rawValues[columnMap.sku];
    let sku = rawSku ? String(rawSku).trim().toUpperCase() : '';
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
    const naturalKey = `${channelId}_${orderId}_${sku}_${orderDate || 'nodate'}`;
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

    const orderLine = {
      id: `line_${batchId}_${rowIndex}`,
      batchId,
      sourceRowIndex: rowIndex,
      channelId,
      orderId,
      orderDate: orderDate || '1970-01-01',
      sku,
      productTitle: String(rawValues[columnMap.productTitle] || '').trim(),
      quantity,
      status,
      currency: template.currency || 'INR',
      grossSales: grossSales.amount,
      discounts: discounts.amount,
      shippingCharged: shippingCharged.amount,
      refundAmount: status === 'returned' ? grossSales.amount : 0,
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
