/**
 * Universal File Parser (CSV, TSV, XLSX)
 * Supports BOM stripping, auto delimiter detection, and SHA-256 file hashing.
 */

export async function computeFileHash(fileOrBuffer) {
  let buffer;
  if (fileOrBuffer instanceof ArrayBuffer) {
    buffer = fileOrBuffer;
  } else if (fileOrBuffer instanceof Blob || (typeof File !== 'undefined' && fileOrBuffer instanceof File)) {
    buffer = await fileOrBuffer.arrayBuffer();
  } else if (typeof fileOrBuffer === 'string') {
    buffer = new TextEncoder().encode(fileOrBuffer);
  } else {
    buffer = new Uint8Array(fileOrBuffer).buffer;
  }

  // Use Web Crypto API
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Simple fallback hash for environments without subtle crypto
  let hash = 0;
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    hash = ((hash << 5) - hash) + bytes[i];
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(16);
}

export function detectDelimiter(sampleText) {
  const lines = sampleText.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0).slice(0, 5);
  if (!lines.length) return ',';

  const commaCount = (lines[0].match(/,/g) || []).length;
  const tabCount = (lines[0].match(/\t/g) || []).length;
  const semiCount = (lines[0].match(/;/g) || []).length;

  if (tabCount > commaCount && tabCount > semiCount) return '\t';
  if (semiCount > commaCount && semiCount > tabCount) return ';';
  return ',';
}

export function parseCsvText(text, delimiter = null) {
  // Strip UTF-8 BOM if present
  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }

  const delim = delimiter || detectDelimiter(cleanText);
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delim && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentVal.trim());
      if (currentRow.length > 0 && currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return parseRowsMatrix(rows);
}

export function isXlsxFile(file) {
  return /\.xlsx?$/i.test(file?.name || '');
}

/**
 * Parse an .xlsx File into { headers, rows }. Prefers a sheet named like
 * "Sales Report"/"Orders"; otherwise uses the sheet with the most rows.
 */
export async function parseXlsxFile(file) {
  const mod = await import('read-excel-file/browser');
  const readExcel = mod.default;
  const sheets = await readExcel(file);
  if (!Array.isArray(sheets) || !sheets.length) return { headers: [], rows: [] };

  const nameOf = (s) => String(s.sheet || s.name || '').toLowerCase();
  const preferred = sheets.find((s) => /sales|order/.test(nameOf(s)) && s.data?.length > 1);
  const best = preferred || [...sheets].sort((a, b) => (b.data?.length || 0) - (a.data?.length || 0))[0];

  const matrix = (best.data || []).map((r) =>
    r.map((c) => {
      if (c === null || c === undefined) return '';
      if (c instanceof Date) return c.toISOString().slice(0, 10);
      return String(c).trim();
    })
  );
  return parseRowsMatrix(matrix.filter((r) => r.some((c) => c.length > 0)));
}

export function parseRowsMatrix(rows) {
  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  // Identify header row (skipping junk rows above header)
  let headerIndex = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const nonEmpties = rows[i].filter(v => Boolean(v && v.trim()));
    if (nonEmpties.length >= 3) {
      headerIndex = i;
      break;
    }
  }

  const headers = rows[headerIndex].map(h => (h || '').trim());
  const dataRows = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    // Check if trailing total row
    const firstCell = (row[0] || '').toLowerCase();
    if (firstCell.includes('total') || firstCell.includes('summary')) continue;

    const rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = row[j] !== undefined ? row[j] : '';
    }
    dataRows.push(rowObj);
  }

  return { headers, rows: dataRows };
}
