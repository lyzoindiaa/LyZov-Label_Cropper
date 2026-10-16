import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Money } from '../../src/pnl-tool/domain/money.js';
import {
  calculateNetRevenue,
  calculateTotalFees,
  calculateCogsTotal,
  calculateContribution,
  calculateMarginPct,
  deriveProfitLine,
} from '../../src/pnl-tool/domain/formulas.js';

describe('Core Financial Formulas Tests', () => {
  it('should calculate net revenue: gross - discounts + shipping - refund', () => {
    const grossSales = Money.fromMajor(1000, 'INR');
    const discounts = Money.fromMajor(100, 'INR');
    const shippingCharged = Money.fromMajor(50, 'INR');
    const refundAmount = Money.fromMajor(200, 'INR');

    const net = calculateNetRevenue({ grossSales, discounts, shippingCharged, refundAmount });
    // 1000 - 100 + 50 - 200 = 750
    assert.equal(net.toMajor(), 750);
  });

  it('should calculate total fees from components map', () => {
    const fees = {
      commission: Money.fromMajor(85, 'INR'),
      shippingFee: Money.fromMajor(60, 'INR'),
      fixedFee: Money.fromMajor(15, 'INR'),
    };
    const totalFees = calculateTotalFees(fees);
    assert.equal(totalFees.toMajor(), 160);
  });

  it('should calculate COGS factoring restocked returns', () => {
    const cogsUnit = Money.fromMajor(250, 'INR');
    const packagingCost = Money.fromMajor(20, 'INR');
    const otherUnitCost = Money.fromMajor(10, 'INR'); // Total unit cost = 280

    // 10 units sold, 2 returned and restocked -> 8 effective units
    const cogs = calculateCogsTotal({
      cogsUnit,
      packagingCost,
      otherUnitCost,
      quantity: 10,
      returnQuantityRestocked: 2,
    });
    // 280 * 8 = 2240
    assert.equal(cogs.toMajor(), 2240);
  });

  it('should calculate contribution and margin percentage accurately', () => {
    const netRevenue = Money.fromMajor(1000, 'INR');
    const totalFees = Money.fromMajor(200, 'INR');
    const cogsTotal = Money.fromMajor(500, 'INR');

    const contribution = calculateContribution({ netRevenue, totalFees, cogsTotal });
    assert.equal(contribution.toMajor(), 300);

    const margin = calculateMarginPct(contribution, netRevenue);
    assert.equal(margin, 30); // 30%
  });

  it('should return null margin when net revenue is zero or negative', () => {
    const netRevenue = Money.fromMajor(0, 'INR');
    const contribution = Money.fromMajor(-150, 'INR');
    const margin = calculateMarginPct(contribution, netRevenue);
    assert.equal(margin, null);
  });

  it('should derive full ProfitLine with complete traceability', () => {
    const orderLine = {
      id: 'ord_123',
      orderId: 'AMZ-999',
      sku: 'SHIRT-BLK-L',
      channelId: 'ch_amz',
      orderDate: '2026-10-01',
      status: 'delivered',
      currency: 'INR',
      grossSales: 99900,
      discounts: 9900,
      shippingCharged: 0,
      refundAmount: 0,
      fees: {
        commission: Money.fromMajor(120, 'INR'),
        shippingFee: Money.fromMajor(70, 'INR'),
      },
      feeStatus: 'reported',
      quantity: 1,
      batchId: 'batch_oct_1',
      sourceRowIndex: 4,
      rawRowId: 'raw_batch_oct_1_4',
    };

    const cogsData = {
      cogsUnit: Money.fromMajor(350, 'INR'),
      packagingCost: Money.fromMajor(25, 'INR'),
      otherUnitCost: Money.fromMajor(5, 'INR'),
      source: 'product_master',
    };

    const profit = deriveProfitLine(orderLine, cogsData);
    assert.equal(profit.netRevenue.toMajor(), 900); // 999 - 99
    assert.equal(profit.totalFees.toMajor(), 190); // 120 + 70
    assert.equal(profit.cogsTotal.toMajor(), 380); // 350 + 25 + 5
    assert.equal(profit.contribution.toMajor(), 330); // 900 - 190 - 380
    assert.equal(profit.marginPct, 36.67);
    assert.equal(profit.completeness, 'complete');
    assert.equal(profit.traceRefs.rawRowId, 'raw_batch_oct_1_4');
  });
});
