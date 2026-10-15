import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRows } from '../../src/pnl-tool/domain/pipeline.js';

describe('Normalization & Data Quality Pipeline Tests', () => {
  const template = {
    currency: 'INR',
    columnMap: {
      orderId: 'Order ID',
      orderDate: 'Date',
      sku: 'SKU',
      productTitle: 'Title',
      quantity: 'Qty',
      grossSales: 'Price',
      discounts: 'Discount',
      shippingCharged: 'Shipping',
      status: 'Status',
    },
    valueMaps: {
      status: { Delivered: 'delivered', Cancelled: 'cancelled', Returned: 'returned' },
    },
  };

  const rawRows = [
    { 'Order ID': 'O-100', Date: '2026-10-01', SKU: 'SHIRT-1', Title: 'Shirt Black', Qty: '2', Price: '500', Discount: '50', Shipping: '40', Status: 'Delivered' },
    { 'Order ID': 'O-101', Date: '2026-10-02', SKU: 'SHIRT-2', Title: 'Shirt Blue', Qty: '1', Price: '450', Discount: '0', Shipping: '0', Status: 'Returned' },
    // Row missing Order ID -> Should be rejected
    { 'Order ID': '', Date: '2026-10-03', SKU: 'SHIRT-3', Title: 'Invalid Order', Qty: '1', Price: '200', Discount: '0', Shipping: '0', Status: 'Delivered' },
    // Duplicate of O-100
    { 'Order ID': 'O-100', Date: '2026-10-01', SKU: 'SHIRT-1', Title: 'Shirt Black', Qty: '2', Price: '500', Discount: '50', Shipping: '40', Status: 'Delivered' },
  ];

  it('should process rows, reject invalid ones, and strictly reconcile raw = accepted + rejected', () => {
    const cogsMap = {
      'SHIRT-1': { cogsUnitPaise: 20000 },
    };

    const result = normalizeRows({
      rawRows,
      channelId: 'amazon',
      template,
      cogsMap,
      dedupStrategy: 'keep_first',
    });

    assert.equal(result.rawCount, 4);
    assert.equal(result.acceptedCount, 2); // O-100 (first) and O-101
    assert.equal(result.rejectedCount, 2); // missing Order ID + duplicate O-100
    assert.equal(result.isReconciled, true);
    assert.equal(result.rawCount, result.acceptedCount + result.rejectedCount);

    // O-101 is missing COGS -> should be flagged
    assert.ok(result.flagCounts['MISSING_COGS'] >= 1);
  });
});
