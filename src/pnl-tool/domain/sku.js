/**
 * SKU Normalization, Resolution & Template Utilities
 * Solves SKU mismatch bugs by strictly separating display text from a normalized matching key.
 *
 * Rules:
 * 1. Normalize key: remove outer quotes, strip 'SKU:' prefix, collapse internal whitespace, trim, lowercase.
 *    Example: '" BUDDHA_LOTUS_07"' and 'BUDDHA_LOTUS_07' -> 'buddha_lotus_07'.
 * 2. Aliases map: maps seller typo variations (e.g. 'ganesah_21' -> 'ganesha_21').
 */

/**
 * Produces a deterministic matching key from any raw SKU string.
 * @param {string|number} raw
 * @returns {string}
 */
export function normalizeSkuKey(raw) {
  if (raw === null || raw === undefined) return '';
  return String(raw)
    .trim()
    .replace(/^["'`\s]+|["'`\s]+$/g, '') // remove surrounding quotes/ticks/whitespace
    .replace(/^sku\s*:\s*/i, '')         // strip 'SKU:' prefix
    .replace(/\s+/g, ' ')                // collapse multiple spaces
    .trim()
    .toLowerCase();                      // canonical lowercase for matching
}

/**
 * Produces a clean human-readable SKU for display.
 * @param {string|number} raw
 * @returns {string}
 */
export function formatDisplaySku(raw) {
  if (raw === null || raw === undefined) return '';
  const cleaned = String(raw)
    .trim()
    .replace(/^["'`\s]+|["'`\s]+$/g, '')
    .replace(/^sku\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'UNKNOWN-SKU';
}

/**
 * Resolves a raw SKU through the alias map to find its canonical SKU key.
 * @param {string|number} rawSku
 * @param {Record<string, string>} aliasesMap - map of aliasKey -> canonicalSkuKey
 * @returns {{ skuKey: string, originalSku: string, isAliased: boolean }}
 */
export function resolveSku(rawSku, aliasesMap = {}) {
  const originalSku = formatDisplaySku(rawSku);
  const rawKey = normalizeSkuKey(rawSku);
  if (!rawKey) {
    return { skuKey: '', originalSku: '', isAliased: false };
  }

  // Check alias map (keys are also normalized)
  const mappedKey = aliasesMap[rawKey];
  if (mappedKey) {
    return {
      skuKey: normalizeSkuKey(mappedKey),
      originalSku,
      isAliased: true,
    };
  }

  return {
    skuKey: rawKey,
    originalSku,
    isAliased: false,
  };
}

/**
 * Generates a downloadable CSV template with 1 example row for non-technical marketplace sellers.
 * @returns {string} CSV text
 */
export function generateProductMasterTemplateCsv() {
  const headers = [
    'SKU',
    'Product cost (₹)',
    'Product name',
    'Packaging per unit (₹)',
    'GST rate (%)',
    'Marketplace',
  ];
  const exampleRow = [
    'Ganesha_11',
    '114',
    'Ganesha Idol 11cm',
    '15',
    '5',
    'Flipkart',
  ];
  return `${headers.join(',')}\n${exampleRow.join(',')}\n`;
}

/**
 * Parses rows from a Product Master CSV/XLSX into normalized product definitions.
 * @param {Array<Record<string, any>>} rows
 * @returns {Array<object>}
 */
export function parseProductMasterRows(rows = []) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      // Find SKU column flexibly
      const rawSku =
        row['SKU'] ??
        row['sku'] ??
        row['Seller SKU'] ??
        row['Product SKU'] ??
        row['FSN / SKU'] ??
        '';

      const skuKey = normalizeSkuKey(rawSku);
      if (!skuKey) return null;

      // Product cost (₹)
      const rawCost =
        row['Product cost (₹)'] ??
        row['Product cost'] ??
        row['Cost'] ??
        row['cost'] ??
        row['cogs'] ??
        0;
      const costPaise = Math.round(parseFloat(String(rawCost).replace(/[^0-9.-]/g, '') || '0') * 100);

      // Packaging
      const rawPkg =
        row['Packaging/handling per unit'] ??
        row['Packaging per unit (₹)'] ??
        row['Packaging'] ??
        0;
      const packagingCostPaise = Math.round(parseFloat(String(rawPkg).replace(/[^0-9.-]/g, '') || '0') * 100);

      // GST Rate (%)
      const rawGst =
        row['GST rate'] ??
        row['GST rate (%)'] ??
        row['GST'] ??
        5;
      const gstRate = parseFloat(String(rawGst).replace(/[^0-9.-]/g, '') || '5');

      const title =
        row['Product name'] ??
        row['Title'] ??
        row['Name'] ??
        formatDisplaySku(rawSku);

      const marketplace =
        row['Marketplace'] ??
        row['Channel'] ??
        'Flipkart';

      return {
        skuKey,
        originalSku: formatDisplaySku(rawSku),
        title,
        costPaise,
        cogsUnitPaise: costPaise,
        packagingCostPaise,
        gstRate,
        marketplace,
        updatedAt: Date.now(),
      };
    })
    .filter(Boolean);
}
