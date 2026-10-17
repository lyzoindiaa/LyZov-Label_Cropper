/**
 * Column Mapping & Synonym Suggestion Engine
 * Automatically suggests canonical field mappings from header strings.
 */

export const CANONICAL_FIELDS = [
  { key: 'orderId', label: 'Order ID', required: true, synonyms: ['order id', 'order_id', 'order number', 'order no', 'sub order no', 'sub order number', 'order item id', 'amazon order id', 'name', 'invoice no'] },
  { key: 'orderDate', label: 'Order Date', required: true, synonyms: ['order date', 'order_date', 'ordered on', 'order approval date', 'purchase date', 'date', 'created at', 'created_at', 'invoice date'] },
  { key: 'sku', label: 'SKU / Product Code', required: true, synonyms: ['sku', 'seller sku', 'product sku', 'item sku', 'fsn', 'supplier sku', 'sku id', 'lineitem sku'] },
  { key: 'productTitle', label: 'Product Title', required: false, synonyms: ['title', 'product title', 'product name', 'item name', 'lineitem name', 'description'] },
  { key: 'quantity', label: 'Quantity', required: true, synonyms: ['quantity', 'qty', 'item quantity', 'units', 'lineitem quantity', 'item count'] },
  { key: 'grossSales', label: 'Gross Sales / Price', required: true, synonyms: ['price', 'selling price', 'item price', 'gross sales', 'lineitem price', 'final selling price', 'final invoice amount', 'buyer invoice amount', 'invoice amount', 'product price', 'total'] },
  { key: 'discounts', label: 'Discounts', required: false, synonyms: ['discount', 'discounts', 'promotion discount', 'promo discount', 'lineitem discount', 'coupon'] },
  { key: 'shippingCharged', label: 'Shipping Charged', required: false, synonyms: ['shipping', 'shipping price', 'shipping charge', 'shipping charges', 'order shipping', 'shipping fee charged'] },
  { key: 'status', label: 'Order Status', required: true, synonyms: ['status', 'order status', 'event type', 'event sub type', 'financial status', 'fulfillment status', 'item status', 'reason for credit entry'] },
  { key: 'currency', label: 'Currency', required: false, synonyms: ['currency', 'currency code', 'iso currency'] },
];

export function suggestColumnMappings(fileHeaders) {
  const suggestions = {};
  const normalizedHeaders = fileHeaders.map(h => ({
    original: h,
    cleaned: (h || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim(),
  }));

  for (const field of CANONICAL_FIELDS) {
    let bestMatch = null;
    let highestScore = 0;

    for (const h of normalizedHeaders) {
      if (field.synonyms.includes(h.cleaned)) {
        bestMatch = h.original;
        highestScore = 100;
        break;
      }

      // Partial inclusion match
      for (const syn of field.synonyms) {
        if (h.cleaned.includes(syn) || syn.includes(h.cleaned)) {
          const score = 50 + (h.cleaned.length / Math.max(syn.length, h.cleaned.length)) * 30;
          if (score > highestScore) {
            highestScore = score;
            bestMatch = h.original;
          }
        }
      }
    }

    if (bestMatch && highestScore >= 60) {
      suggestions[field.key] = bestMatch;
    }
  }

  return suggestions;
}

export function normalizeStatus(rawStatus, valueMap = {}) {
  if (!rawStatus) return 'unknown';
  const clean = String(rawStatus).trim();

  // Check explicit value map
  if (valueMap[clean]) return valueMap[clean];
  if (valueMap[clean.toLowerCase()]) return valueMap[clean.toLowerCase()];

  const lower = clean.toLowerCase();
  if (lower.includes('deliver') || lower.includes('complete') || lower.includes('paid')) return 'delivered';
  if (lower.includes('ship') || lower.includes('transit') || lower.includes('dispatch') || lower.includes('process')) return 'shipped';
  if (lower.includes('return') || lower.includes('refund')) return 'returned';
  if (lower.includes('rto')) return 'rto';
  if (lower.includes('cancel') || lower.includes('void')) return 'cancelled';

  return 'unknown';
}

export function parseDate(rawDate) {
  if (!rawDate) return null;
  const d = new Date(rawDate);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  // Try DD/MM/YYYY or DD-MM-YYYY
  const parts = String(rawDate).split(/[-/]/);
  if (parts.length === 3) {
    // If first part is 4 digits -> YYYY-MM-DD
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    // Else DD-MM-YYYY
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return null;
}
