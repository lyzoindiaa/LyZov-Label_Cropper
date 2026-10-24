/**
 * Order Normalization & Data Quality Pipeline (v2)
 *
 * Implements:
 * 1. Deterministic natural key generation (seller + channel + orderItemId + eventType + eventSubType)
 * 2. Period extraction (YYYY-MM) from order/settlement dates
 * 3. SKU normalization & alias resolution via domain/sku.js
 * 4. Cross-month return linking and 'BELONGS_TO_EARLIER_MONTH' isolation
 * 5. Strict COGS handling (never silently zeroed)
 */

import { Money } from './money.js';
import { QualityFlags, createFlag } from './flags.js';
import { normalizeStatus, parseDate } from '../utils/mapper.js';
import { resolveSku } from './sku.js';

const cleanText = (v) => String(v ?? '').trim().replace(/^["'\s]+|["'\s]+$/g, '').trim();

export function normalizeRows({
  rawRows = [],
  channelId = 'flipkart',
  sellerId = 'default_seller',
  batchId = 'batch_temp',
  template = {},
  cogsMap = {}, // skuKey or uppercase SKU -> { cogsUnitPaise, ... }
  aliasesMap = {}, // aliasKey -> targetSkuKey
  existingSales = new Map(), // orderItemId -> salePeriod
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

    // 2. Extract Order Item ID (Flipkart and modern reports have this)
    const rawItemId = columnMap.orderItemId
      ? cleanText(rawValues[columnMap.orderItemId])
      : '';
    const orderItemId = rawItemId || orderId;

    // 3. Extract & Normalize SKU with Alias resolution
    const rawSku = cleanText(rawValues[columnMap.sku]);
    const { skuKey, originalSku } = resolveSku(rawSku, aliasesMap);

    let displaySku = originalSku || 'UNKNOWN-SKU';
    if (!skuKey) {
      flags.push(createFlag(QualityFlags.MISSING_SKU));
      displaySku = 'UNKNOWN-SKU';
    }

    // 4. Extract Date & Determine Period (YYYY-MM)
    const rawDate = rawValues[columnMap.orderDate];
    const orderDate = parseDate(rawDate);
    let period = 'nodate';

    if (orderDate && /^\d{4}-\d{2}-\d{2}/.test(orderDate)) {
      period = orderDate.slice(0, 7);
    } else {
      flags.push(createFlag(QualityFlags.DATE_UNPARSEABLE, `Raw value: "${rawDate}"`));
      const now = new Date();
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // 5. Extract Quantity
    const rawQty = rawValues[columnMap.quantity];
    let quantity = Number(rawQty);
    if (isNaN(quantity) || quantity === 0) quantity = 1;
    if (quantity < 0) {
      flags.push(createFlag(QualityFlags.NEGATIVE_QTY, `Qty: ${quantity}`));
    }

    // 6. Extract Gross Sales & Money amounts
    const rawPrice = rawValues[columnMap.grossSales];
    const grossSales = Money.fromMajor(rawPrice || 0, template.currency || 'INR');
    if (grossSales.isZero()) {
      flags.push(createFlag(QualityFlags.ZERO_PRICE));
    }

    const rawDiscount = rawValues[columnMap.discounts];
    const discounts = Money.fromMajor(rawDiscount || 0, template.currency || 'INR');
    discounts.amount = Math.abs(discounts.amount);

    const rawShipping = rawValues[columnMap.shippingCharged];
    const shippingCharged = Money.fromMajor(rawShipping || 0, template.currency || 'INR');

    // 7. Extract Status & Event Types
    const rawStatus = rawValues[columnMap.status];
    const status = normalizeStatus(rawStatus, valueMaps.status || {});
    if (status === 'unknown') {
      flags.push(createFlag(QualityFlags.UNKNOWN_STATUS, `Raw: "${rawStatus}"`));
    }

    // Event type handling (Flipkart Sales Report has 'Event Type' like Sale, Return, Cancellation)
    const eventType = columnMap.eventType
      ? cleanText(rawValues[columnMap.eventType]).toLowerCase()
      : (status === 'returned' ? 'return' : status === 'cancelled' ? 'cancellation' : 'sale');

    const eventSubType = columnMap.eventSubType
      ? cleanText(rawValues[columnMap.eventSubType]).toLowerCase()
      : 'main';

    // 8. Deterministic Unique Key for Upsert (No duplicate append bugs)
    // Key: seller + marketplace + Order Item ID + event type + event sub type
    const uniqueKey = `${sellerId}_${channelId}_${orderItemId}_${eventType}_${eventSubType}`.toLowerCase();

    // In-file duplicate check
    if (seenKeys.has(uniqueKey)) {
      flags.push(createFlag(QualityFlags.DUPLICATE_ORDER_LINE, `OrderItem: ${orderItemId}`));
      if (dedupStrategy === 'keep_first') {
        rejected.push({
          rowIndex,
          rawValues,
          reason: `Duplicate order item row rejected (Strategy: keep_first). Matches line #${seenKeys.get(uniqueKey)}`,
        });
        return;
      }
    } else {
      seenKeys.set(uniqueKey, rowIndex);
    }

    // 9. COGS Lookup: strict matching on normalized skuKey first, fallback to originalSku
    const cogsData = cogsMap[skuKey] || cogsMap[displaySku.toUpperCase()] || cogsMap[displaySku];
    let cogsUnitPaise = null;
    let packagingCostPaise = 0;
    let cogsSource = 'missing';

    if (cogsData && (cogsData.cogsUnitPaise !== undefined || cogsData.costPaise !== undefined)) {
      cogsUnitPaise = cogsData.cogsUnitPaise !== undefined ? cogsData.cogsUnitPaise : cogsData.costPaise;
      packagingCostPaise = cogsData.packagingCostPaise || 0;
      cogsSource = 'product_master';
    } else {
      // Must NOT guess zero - flag as missing
      flags.push(createFlag(QualityFlags.MISSING_COGS, `SKU: ${displaySku}`));
    }

    // 10. Cross-Month Return Matching
    let originalSalePeriod = null;
    let isUnmatchedReturn = false;

    if (status === 'returned' || status === 'rto' || eventType === 'return') {
      if (existingSales.has(orderItemId)) {
        originalSalePeriod = existingSales.get(orderItemId);
        if (originalSalePeriod !== period) {
          flags.push(
            createFlag(
              QualityFlags.BELONGS_TO_EARLIER_MONTH,
              `Original sale was in ${originalSalePeriod}`
            )
          );
        }
      } else {
        // Return without matching sale in file or current store
        isUnmatchedReturn = true;
        flags.push(
          createFlag(
            QualityFlags.BELONGS_TO_EARLIER_MONTH,
            'No matching sale found; belongs to an earlier period'
          )
        );
      }
    }

    // Tally flags
    flags.forEach((f) => {
      flagCounts[f.code] = (flagCounts[f.code] || 0) + 1;
    });

    // Event-style reports list returns as their own row
    const isEventReturn = status === 'returned' || eventType === 'return';

    const orderLine = {
      id: uniqueKey, // for backward compatibility with id
      uniqueKey,
      importId: batchId,
      batchId,
      sourceRowIndex: rowIndex,
      sellerId,
      channelId,
      period,
      orderId,
      orderItemId,
      orderDate: orderDate || '1970-01-01',
      sku: displaySku,
      skuKey,
      productTitle: cleanText(rawValues[columnMap.productTitle]) || displaySku,
      quantity,
      status,
      eventType,
      eventSubType,
      currency: template.currency || 'INR',
      grossSales: isEventReturn ? 0 : grossSales.amount,
      discounts: isEventReturn ? 0 : discounts.amount,
      shippingCharged: isEventReturn ? 0 : shippingCharged.amount,
      refundAmount: isEventReturn
        ? Math.max(0, Math.abs(grossSales.amount) - Math.abs(discounts.amount) + Math.abs(shippingCharged.amount)) || Math.abs(grossSales.amount)
        : 0,
      cogsUnitPaise,
      packagingCostPaise,
      cogsSource,
      originalSalePeriod,
      isUnmatchedReturn,
      flags,
      rawRowId: `raw_${batchId}_${rowIndex}`,
    };

    accepted.push(orderLine);
  });

  const isReconciled = rawRows.length === accepted.length + rejected.length;
  const periodsDetected = Array.from(new Set(accepted.map((a) => a.period))).sort();

  return {
    rawCount: rawRows.length,
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
    isReconciled,
    accepted,
    rejected,
    flagCounts,
    periodsDetected,
  };
}
