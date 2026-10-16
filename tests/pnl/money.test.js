import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Money } from '../../src/pnl-tool/domain/money.js';

describe('Money Domain Tests', () => {
  it('should initialize correctly with minor units', () => {
    const m = new Money(1050, 'INR');
    assert.equal(m.amount, 1050);
    assert.equal(m.currency, 'INR');
    assert.equal(m.toMajor(), 10.50);
  });

  it('should avoid floating point drift (0.1 + 0.2 style)', () => {
    const m1 = Money.fromMajor(0.10, 'INR');
    const m2 = Money.fromMajor(0.20, 'INR');
    const sum = m1.add(m2);
    assert.equal(sum.amount, 30);
    assert.equal(sum.toMajor(), 0.30);
  });

  it('should reject operations across mixed currencies', () => {
    const inr = new Money(1000, 'INR');
    const usd = new Money(1000, 'USD');
    assert.throws(() => {
      inr.add(usd);
    }, /Currency mismatch/);
  });

  it('should multiply by quantity and percentages accurately', () => {
    const itemPrice = Money.fromMajor(199.99, 'INR'); // 19999 paise
    const total3 = itemPrice.multiply(3); // 59997 paise
    assert.equal(total3.amount, 59997);
    assert.equal(total3.toMajor(), 599.97);

    // 18% GST on 59997 paise = 10799.46 -> 10799 paise
    const gst = total3.multiplyPercent(18);
    assert.equal(gst.amount, 10799);
  });

  it('should format correctly for Indian locale', () => {
    const m = Money.fromMajor(125000.50, 'INR');
    const formatted = m.toFormatted('en-IN');
    assert.ok(formatted.includes('1,25,000.50') || formatted.includes('125,000.50'));
  });
});
