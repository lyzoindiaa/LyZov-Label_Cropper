/**
 * Data Quality Flags Catalogue
 * Strictly enforces that missing or questionable data is flagged and never silently zeroed out.
 */

export const FlagSeverity = {
  ERROR: 'ERROR',       // Line excluded from valid totals
  WARNING: 'WARNING',   // Line included but with caveat/imputation
  INFO: 'INFO',         // Informational note
};

export const QualityFlags = {
  MISSING_SKU: {
    code: 'MISSING_SKU',
    severity: FlagSeverity.ERROR,
    message: 'Order line does not specify a product SKU.',
    impact: 'Cannot assign product cost or SKU-level analytics.',
  },
  MISSING_COGS: {
    code: 'MISSING_COGS',
    severity: FlagSeverity.WARNING,
    message: 'SKU is missing Cost of Goods Sold (COGS) in Product Master.',
    impact: 'Line placed in incomplete margin bucket; profit cannot be finalized.',
  },
  NEGATIVE_QTY: {
    code: 'NEGATIVE_QTY',
    severity: FlagSeverity.WARNING,
    message: 'Order quantity is negative without being marked as refund/return.',
    impact: 'Treated as reversal or adjustment.',
  },
  DATE_UNPARSEABLE: {
    code: 'DATE_UNPARSEABLE',
    severity: FlagSeverity.ERROR,
    message: 'Order date format is unrecognizable or invalid.',
    impact: 'Cannot allocate to weekly/monthly reporting periods.',
  },
  DUPLICATE_ORDER_LINE: {
    code: 'DUPLICATE_ORDER_LINE',
    severity: FlagSeverity.WARNING,
    message: 'Duplicate order identifier and line item detected.',
    impact: 'Subject to deduplication strategy (keep first, keep latest, keep all).',
  },
  CURRENCY_MISMATCH: {
    code: 'CURRENCY_MISMATCH',
    severity: FlagSeverity.ERROR,
    message: 'Order currency differs from reporting currency without FX rate.',
    impact: 'Excluded from aggregated total until FX rate is provided.',
  },
  UNKNOWN_STATUS: {
    code: 'UNKNOWN_STATUS',
    severity: FlagSeverity.INFO,
    message: 'Order status does not match canonical status vocabulary.',
    impact: 'Defaulted to unknown status.',
  },
  FEE_MISSING: {
    code: 'FEE_MISSING',
    severity: FlagSeverity.WARNING,
    message: 'One or more required channel fees are missing from import row.',
    impact: 'Computed from rules or flagged as incomplete.',
  },
  ZERO_PRICE: {
    code: 'ZERO_PRICE',
    severity: FlagSeverity.INFO,
    message: 'Gross sales value is zero (replacement, sample, or freebie).',
    impact: 'Margin calculation marked n/a.',
  },
  BELONGS_TO_EARLIER_MONTH: {
    code: 'BELONGS_TO_EARLIER_MONTH',
    severity: FlagSeverity.INFO,
    message: 'Return row belongs to a sale from an earlier month.',
    impact: 'Loss displayed on separate line without distorting current month sale margins.',
  },
  PERIOD_MISMATCH: {
    code: 'PERIOD_MISMATCH',
    severity: FlagSeverity.WARNING,
    message: 'Row order/settlement date differs from selected period.',
    impact: 'Row partitioned to its actual occurrence month.',
  },
};

export function createFlag(flagDef, customDetail = '') {
  return {
    code: flagDef.code,
    severity: flagDef.severity,
    message: flagDef.message,
    impact: flagDef.impact,
    detail: customDetail,
    timestamp: Date.now(),
  };
}
