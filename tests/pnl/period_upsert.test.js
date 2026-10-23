import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRows } from '../../src/pnl-tool/domain/pipeline.js';
import { normalizeSkuKey, resolveSku } from '../../src/pnl-tool/domain/sku.js';

describe('Period-Scoped Upsert & Data Segregation Tests', () => {
  const template = {
    currency: 'INR',
    columnMap: {
      orderId: 'Order ID',
      orderItemId: 'Order Item ID',
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
      status: { Delivered: 'delivered', Returned: 'returned', Cancelled: 'cancelled' },
    },
  };

  const augustRows = [
    { 'Order ID': 'O-AUG-1', 'Order Item ID': 'ITEM-AUG-1', Date: '2026-08-10', SKU: 'GANESHA_11', Title: 'Ganesha 11cm', Qty: '1', Price: '500', Discount: '50', Shipping: '0', Status: 'Delivered' },
    { 'Order ID': 'O-AUG-2', 'Order Item ID': 'ITEM-AUG-2', Date: '2026-08-20', SKU: 'BUDDHA_LOTUS_07', Title: 'Buddha Idol', Qty: '2', Price: '1000', Discount: '100', Shipping: '0', Status: 'Delivered' },
  ];

  const septemberRows = [
    { 'Order ID': 'O-SEP-1', 'Order Item ID': 'ITEM-SEP-1', Date: '2026-09-05', SKU: 'GANESHA_11', Title: 'Ganesha 11cm', Qty: '1', Price: '520', Discount: '20', Shipping: '0', Status: 'Delivered' },
    // Return of August order in September
    { 'Order ID': 'O-AUG-1', 'Order Item ID': 'ITEM-AUG-1', Date: '2026-09-12', SKU: 'GANESHA_11', Title: 'Ganesha 11cm', Qty: '1', Price: '500', Discount: '50', Shipping: '0', Status: 'Returned' },
  ];

  it('1. should tag August rows strictly with period 2026-08', () => {
    const augResult = normalizeRows({
      rawRows: augustRows,
      channelId: 'flipkart',
      sellerId: 'seller_1',
      template,
    });

    assert.equal(augResult.acceptedCount, 2);
    assert.deepEqual(augResult.periodsDetected, ['2026-08']);
    assert.equal(augResult.accepted[0].period, '2026-08');
    assert.equal(augResult.accepted[1].period, '2026-08');
  });

  it('2. should tag September rows with period 2026-09 and link August return', () => {
    // Existing sales map from August
    const existingSales = new Map([
      ['ITEM-AUG-1', '2026-08'],
    ]);

    const sepResult = normalizeRows({
      rawRows: septemberRows,
      channelId: 'flipkart',
      sellerId: 'seller_1',
      template,
      existingSales,
    });

    assert.equal(sepResult.acceptedCount, 2);
    assert.deepEqual(sepResult.periodsDetected, ['2026-09']);

    const returnLine = sepResult.accepted.find((l) => l.orderItemId === 'ITEM-AUG-1');
    assert.ok(returnLine);
    assert.equal(returnLine.period, '2026-09');
    assert.equal(returnLine.originalSalePeriod, '2026-08');
    assert.ok(returnLine.flags.some((f) => f.code === 'BELONGS_TO_EARLIER_MONTH'));
  });

  it('3. should isolate returns with no matching sale and tag as belongs to earlier month', () => {
    const unknownReturnRows = [
      { 'Order ID': 'O-OLD-99', 'Order Item ID': 'ITEM-OLD-99', Date: '2026-09-18', SKU: 'UNKNOWN_OLD', Title: 'Old Item', Qty: '1', Price: '300', Discount: '0', Shipping: '0', Status: 'Returned' },
    ];

    const res = normalizeRows({
      rawRows: unknownReturnRows,
      channelId: 'flipkart',
      sellerId: 'seller_1',
      template,
      existingSales: new Map(), // empty, no match
    });

    assert.equal(res.acceptedCount, 1);
    assert.equal(res.accepted[0].isUnmatchedReturn, true);
    assert.ok(res.accepted[0].flags.some((f) => f.code === 'BELONGS_TO_EARLIER_MONTH'));
  });

  it('4. should match variant SKU strings and quotes to one canonical product', () => {
    const aliasMap = {
      ganesah_11: 'ganesha_11',
    };

    const variantRows = [
      { 'Order ID': 'O-1', 'Order Item ID': 'I-1', Date: '2026-09-01', SKU: '" BUDDHA_LOTUS_07"', Title: 'Buddha', Qty: '1', Price: '500', Discount: '0', Shipping: '0', Status: 'Delivered' },
      { 'Order ID': 'O-2', 'Order Item ID': 'I-2', Date: '2026-09-02', SKU: 'BUDDHA_LOTUS_07', Title: 'Buddha', Qty: '1', Price: '500', Discount: '0', Shipping: '0', Status: 'Delivered' },
      { 'Order ID': 'O-3', 'Order Item ID': 'I-3', Date: '2026-09-03', SKU: 'Ganesah_11', Title: 'Ganesha Typo', Qty: '1', Price: '400', Discount: '0', Shipping: '0', Status: 'Delivered' },
    ];

    const res = normalizeRows({
      rawRows: variantRows,
      channelId: 'flipkart',
      sellerId: 'seller_1',
      template,
      aliasesMap: aliasMap,
    });

    assert.equal(res.accepted[0].skuKey, 'buddha_lotus_07');
    assert.equal(res.accepted[1].skuKey, 'buddha_lotus_07');
    assert.equal(res.accepted[2].skuKey, 'ganesha_11');
  });

  it('5. should flag missing costs without assuming zero', () => {
    const missingCogsRows = [
      { 'Order ID': 'O-NO-COGS', 'Order Item ID': 'I-NO-COGS', Date: '2026-09-01', SKU: 'NEW-MYSTERY-SKU', Title: 'New Product', Qty: '1', Price: '799', Discount: '0', Shipping: '0', Status: 'Delivered' },
    ];

    const res = normalizeRows({
      rawRows: missingCogsRows,
      channelId: 'flipkart',
      sellerId: 'seller_1',
      template,
      cogsMap: {}, // No COGS defined
    });

    assert.equal(res.accepted[0].cogsUnitPaise, null);
    assert.equal(res.accepted[0].cogsSource, 'missing');
    assert.ok(res.accepted[0].flags.some((f) => f.code === 'MISSING_COGS'));
  });
});
