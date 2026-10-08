/**
 * GST Money Utility: Integer Arithmetic in Paise (1 INR = 100 Paise)
 * Prevents floating-point rounding errors on the GST Portal.
 */

export function toPaise(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 0;
  if (typeof amount === 'string') {
    // Strip commas, currency symbols, whitespace
    const clean = amount.replace(/[₹,$\s]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.round(num * 100);
  }
  return Math.round(Number(amount) * 100);
}

export function toRupees(paise) {
  if (!paise || isNaN(paise)) return 0;
  return Number((paise / 100).toFixed(2));
}

export function formatINR(paise) {
  const inr = toRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(inr);
}

/**
 * GST Portal statutory rounding: round to nearest whole rupee
 */
export function roundToRupee(paise) {
  return Math.round(toRupees(paise));
}
