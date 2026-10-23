/**
 * Money Utility Module (Exact Integer Minor Units)
 * Never uses binary floating point for currency math to eliminate IEEE 754 drift.
 * Supported currencies are ISO 4217 (default 'INR').
 */

export class Money {
  /**
   * @param {number|bigint} amountInMinorUnits - e.g. paise or cents (integer)
   * @param {string} currency - ISO 4217 code (e.g. 'INR', 'USD')
   */
  constructor(amountInMinorUnits = 0, currency = 'INR') {
    this.amount = Math.round(Number(amountInMinorUnits) || 0);
    this.currency = (currency || 'INR').toUpperCase();
  }

  /**
   * Create Money from major units (e.g. 10.50 rupees -> 1050 paise)
   */
  static fromMajor(majorAmount, currency = 'INR') {
    const parsed = typeof majorAmount === 'string' ? parseFloat(majorAmount.replace(/[^0-9.-]/g, '')) : Number(majorAmount);
    if (isNaN(parsed)) return new Money(0, currency);
    return new Money(Math.round(parsed * 100), currency);
  }

  /**
   * Create Money from minor units
   */
  static fromMinor(minorAmount, currency = 'INR') {
    return new Money(minorAmount, currency);
  }

  static zero(currency = 'INR') {
    return new Money(0, currency);
  }

  assertSameCurrency(other) {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: cannot operate on ${this.currency} and ${other.currency} without explicit FX conversion`);
    }
  }

  add(other) {
    this.assertSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other) {
    this.assertSameCurrency(other);
    return new Money(this.amount - other.amount, this.currency);
  }

  multiply(quantity) {
    return new Money(Math.round(this.amount * Number(quantity)), this.currency);
  }

  multiplyPercent(percent) {
    return new Money(Math.round((this.amount * Number(percent)) / 100), this.currency);
  }

  divide(divisor) {
    if (divisor === 0) throw new Error('Division by zero');
    return new Money(Math.round(this.amount / Number(divisor)), this.currency);
  }

  isZero() {
    return this.amount === 0;
  }

  isPositive() {
    return this.amount > 0;
  }

  isNegative() {
    return this.amount < 0;
  }

  toMajor() {
    return this.amount / 100;
  }

  toFormatted(locale = 'en-IN') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.toMajor());
  }

  format(locale = 'en-IN') {
    return this.toFormatted(locale);
  }

  toJSON() {
    return {
      amount: this.amount,
      currency: this.currency,
      major: this.toMajor(),
    };
  }
}
