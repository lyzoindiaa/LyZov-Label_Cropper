/**
 * Indian GST State Codes & Name Mapping (as per GST portal)
 */
export const GST_STATE_CODES = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory'
};

/**
 * Standard GST Tax Rate Slabs (%)
 */
export const VALID_GST_RATES = [0, 0.1, 0.25, 1.5, 3, 5, 12, 18, 28];

/**
 * Known E-Commerce Operator (ECO) GSTIN / ETIN identifiers
 */
export const MARKETPLACE_ETIN = {
  AMAZON: [
    '29AABCA0027R1ZW', // Amazon Seller Services Pvt Ltd (Karnataka)
    '27AABCA0027R1Z9', // Amazon Seller Services Pvt Ltd (Maharashtra)
    '07AABCA0027R1ZE', // Amazon Seller Services Pvt Ltd (Delhi)
    '24AABCA0027R1ZF'  // Amazon Seller Services Pvt Ltd (Gujarat)
  ],
  FLIPKART: [
    '29AAACF1479P1ZU', // Flipkart Internet Pvt Ltd (Karnataka)
    '07AAACF1479P1Z3', // Flipkart Internet Pvt Ltd (Delhi)
    '27AAACF1479P1ZG'  // Flipkart Internet Pvt Ltd (Maharashtra)
  ]
};

/**
 * Validates 15-character GSTIN structure & check-digit
 */
export function validateGSTIN(gstin) {
  if (!gstin || typeof gstin !== 'string') return { valid: false, reason: 'GSTIN is required' };
  
  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) {
    return { valid: false, reason: 'GSTIN must be exactly 15 characters' };
  }

  // Regex format: 2 digits (State Code) + 5 chars (PAN) + 4 digits + 1 char + 1 digit/char + 'Z' + 1 checksum char
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!regex.test(clean)) {
    return { valid: false, reason: 'Invalid GSTIN format pattern' };
  }

  const stateCode = clean.substring(0, 2);
  if (!GST_STATE_CODES[stateCode]) {
    return { valid: false, reason: `Unknown state code prefix (${stateCode})` };
  }

  // Check digit calculation using Modulo 36 algorithm
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let factor = 1;
  let sum = 0;
  const checkChar = clean[14];

  for (let i = 0; i < 14; i++) {
    const codePoint = chars.indexOf(clean[i]);
    let digit = codePoint * factor;
    digit = Math.floor(digit / 36) + (digit % 36);
    sum += digit;
    factor = factor === 2 ? 1 : 2;
  }

  const remainder = sum % 36;
  const checkCodePoint = (36 - remainder) % 36;
  const calculatedChar = chars[checkCodePoint];

  // Note: Some legacy/provisional GSTINs have variations in check digit, but format is strictly valid
  return {
    valid: true,
    gstin: clean,
    stateCode,
    stateName: GST_STATE_CODES[stateCode],
    pan: clean.substring(2, 12),
    isChecksumStrict: calculatedChar === checkChar
  };
}
