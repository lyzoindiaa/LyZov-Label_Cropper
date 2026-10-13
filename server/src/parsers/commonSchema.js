import { GST_STATE_CODES } from '../config/constants.js';

// Reverse lookup map: Normalized state name / abbreviation -> 2-digit state code
const STATE_NAME_TO_CODE = {};
Object.entries(GST_STATE_CODES).forEach(([code, name]) => {
  STATE_NAME_TO_CODE[name.toLowerCase().replace(/[^a-z0-9]/g, '')] = code;
});

// Common abbreviations and aliases
const STATE_ALIASES = {
  'delhi': '07',
  'dl': '07',
  'karnataka': '29',
  'ka': '29',
  'maharashtra': '27',
  'mh': '27',
  'tamilnadu': '33',
  'tamil nadu': '33',
  'tn': '33',
  'telangana': '36',
  'tg': '36',
  'ts': '36',
  'uttarpradesh': '09',
  'uttar pradesh': '09',
  'up': '09',
  'gujarat': '24',
  'gj': '24',
  'westbengal': '19',
  'west bengal': '19',
  'wb': '19',
  'rajasthan': '08',
  'rj': '08',
  'madhyapradesh': '23',
  'madhya pradesh': '23',
  'mp': '23',
  'kerala': '32',
  'kl': '32',
  'andhrapradesh': '37',
  'andhra pradesh': '37',
  'ap': '37',
  'haryana': '06',
  'hr': '06',
  'punjab': '03',
  'pb': '03',
  'bihar': '10',
  'br': '10',
  'odisha': '21',
  'orissa': '21',
  'or': '21',
  'assam': '18',
  'as': '18',
  'jharkhand': '20',
  'jh': '20',
  'chhattisgarh': '22',
  'cg': '22',
  'uttarakhand': '05',
  'uk': '05',
  'himachalpradesh': '02',
  'himachal pradesh': '02',
  'hp': '02',
  'goa': '30',
  'ga': '30',
  'chandigarh': '04',
  'ch': '04',
  'jammuandkashmir': '01',
  'jammu & kashmir': '01',
  'jk': '01',
  'puducherry': '34',
  'py': '34',
};

/**
 * Normalizes any state string or code into a statutory 2-digit GST state code
 */
export function resolveStateCode(input) {
  if (!input) return '';
  const str = String(input).trim();
  
  // If already a 2-digit code
  if (/^[0-9]{2}$/.test(str) && GST_STATE_CODES[str]) {
    return str;
  }

  // If 1-digit e.g. "7" -> "07"
  if (/^[0-9]{1}$/.test(str)) {
    const padded = `0${str}`;
    if (GST_STATE_CODES[padded]) return padded;
  }

  // Normalized text matching
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (STATE_ALIASES[cleaned]) return STATE_ALIASES[cleaned];
  if (STATE_NAME_TO_CODE[cleaned]) return STATE_NAME_TO_CODE[cleaned];

  // Partial match
  for (const [nameClean, code] of Object.entries(STATE_NAME_TO_CODE)) {
    if (nameClean.includes(cleaned) || cleaned.includes(nameClean)) {
      return code;
    }
  }

  return '';
}

/**
 * Normalizes raw date formats (ISO string, DD/MM/YYYY, Excel serial) to a standard Date object
 */
export function parseInvoiceDate(val) {
  if (!val) return new Date();
  if (val instanceof Date) return val;

  // Handle Excel serial date number
  if (typeof val === 'number') {
    // 25569 = difference between 1900 and 1970 epochs in days
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }

  const str = String(val).trim();

  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  }

  // Fallback to standard parse
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}
