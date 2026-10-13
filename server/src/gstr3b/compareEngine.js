/**
 * compareEngine.js
 *
 * Phase 3: GSTR-1 vs Portal-Auto-drafted GSTR-3B Reconciliation Engine
 *
 * Compares the values our tool computed for Tables 3.1 and 3.2 against the
 * values that the GST portal auto-populates in the seller's drafted 3B return.
 *
 * Supports two portal data sources:
 *   1. Uploaded portal 3B JSON (downloaded from GST portal)
 *   2. Manual entry of portal figures as a plain JS object
 *
 * Returns a structured diff report: field-by-field comparison with
 * amount differences flagged as MATCH / MISMATCH.
 */

import { toPaise, toRupees } from '../engine/money.js';

const MATCH_THRESHOLD_PAISE = 2; // within ₹0.02 = match (rounding tolerance)

/**
 * @param {Object} toolTable31       - Our computed Table 3.1 (from outwardEngine)
 * @param {Object} toolTable32       - Our computed Table 3.2 (from interStateEngine)
 * @param {Object} portalData        - Portal's values. Either:
 *   a) Raw JSON downloaded from GST portal (parsed via parsePortal3bJson)
 *   b) Manual object: { table31: {...}, table32: [...] }
 * @param {string} portalSource      - 'uploaded_json' | 'manual_entry'
 * @returns {{ diffs: Array, allMatched: boolean, summary: Object }}
 */
export function compare3bVsPortal(toolTable31, toolTable32, portalData, portalSource = 'manual_entry') {
  const diffs = [];

  // ── Table 3.1(a) Outward Taxable Supplies ──────────────────────────────────
  const our31a = toolTable31?.outward_taxable || {};
  const portal31a = portalData?.table31?.outward_taxable || {};

  comparePaiseField(diffs, '3.1(a)', 'taxableValue', 'Outward Taxable Value',
    our31a.taxableValuePaise, portal31a.taxableValuePaise);
  comparePaiseField(diffs, '3.1(a)', 'igst', 'IGST',
    our31a.igstPaise, portal31a.igstPaise);
  comparePaiseField(diffs, '3.1(a)', 'cgst', 'CGST',
    our31a.cgstPaise, portal31a.cgstPaise);
  comparePaiseField(diffs, '3.1(a)', 'sgst', 'SGST',
    our31a.sgstPaise, portal31a.sgstPaise);
  comparePaiseField(diffs, '3.1(a)', 'cess', 'Cess',
    our31a.cessPaise, portal31a.cessPaise);

  // ── Table 3.1(c) Nil/Exempt Outward Supplies ──────────────────────────────
  const our31c = toolTable31?.outward_nil_exempt || {};
  const portal31c = portalData?.table31?.outward_nil_exempt || {};
  comparePaiseField(diffs, '3.1(c)', 'taxableValue', 'Nil/Exempt Outward Value',
    our31c.taxableValuePaise, portal31c.taxableValuePaise);

  // ── Table 3.2 Inter-State to Unregistered (per state) ────────────────────
  const ourStates = {};
  for (const row of (toolTable32?.supplies_unregistered || [])) {
    ourStates[row.pos] = row;
  }
  const portalStates = {};
  for (const row of (portalData?.table32?.supplies_unregistered || [])) {
    portalStates[row.pos] = row;
  }

  // Union of all POS codes
  const allPos = new Set([...Object.keys(ourStates), ...Object.keys(portalStates)]);
  for (const pos of [...allPos].sort()) {
    const ourRow = ourStates[pos] || {};
    const portalRow = portalStates[pos] || {};
    const posLabel = ourRow.posName || portalRow.posName || `State ${pos}`;
    comparePaiseField(diffs, '3.2', `pos_${pos}_taxableValue`, `${posLabel} — Taxable Value`,
      ourRow.taxableValuePaise, portalRow.taxableValuePaise);
    comparePaiseField(diffs, '3.2', `pos_${pos}_igst`, `${posLabel} — IGST`,
      ourRow.igstPaise, portalRow.igstPaise);
  }

  const allMatched = diffs.every(d => d.isMatch);

  const mismatches = diffs.filter(d => !d.isMatch);
  const totalMismatchPaise = mismatches.reduce((s, d) => s + Math.abs(d.diffPaise), 0);

  return {
    portalSource,
    diffs,
    allMatched,
    summary: {
      totalFields: diffs.length,
      matched: diffs.filter(d => d.isMatch).length,
      mismatched: mismatches.length,
      totalMismatchRupees: toRupees(totalMismatchPaise),
      reconciledAt: new Date().toISOString(),
    },
  };
}

/**
 * Parse a portal-downloaded GSTR-3B JSON into our standard comparison format.
 * Portal JSON schema based on GSTR3B_Excel_Utility and gov JSON structure.
 *
 * @param {Object} portalJson - Raw JSON object from GST portal
 * @returns {{ table31: Object, table32: Object }}
 */
export function parsePortal3bJson(portalJson) {
  const sd = portalJson?.sup_details || {};
  const inter = portalJson?.inter_sup || {};

  // Map portal JSON keys to our paise-based structure
  const table31 = {
    outward_taxable: {
      taxableValuePaise: toPaise(sd?.osup_det?.txval ?? 0),
      igstPaise:         toPaise(sd?.osup_det?.iamt  ?? 0),
      cgstPaise:         toPaise(sd?.osup_det?.camt  ?? 0),
      sgstPaise:         toPaise(sd?.osup_det?.samt  ?? 0),
      cessPaise:         toPaise(sd?.osup_det?.csamt ?? 0),
    },
    outward_zero_rated: {
      taxableValuePaise: toPaise(sd?.osup_zero?.txval ?? 0),
      igstPaise:         toPaise(sd?.osup_zero?.iamt  ?? 0),
      cessPaise:         toPaise(sd?.osup_zero?.csamt ?? 0),
    },
    outward_nil_exempt: {
      taxableValuePaise: toPaise(sd?.osup_nil_exmp?.txval ?? 0),
    },
    inward_reverse_charge: {
      taxableValuePaise: toPaise(sd?.isup_rev?.txval ?? 0),
      igstPaise:         toPaise(sd?.isup_rev?.iamt  ?? 0),
      cgstPaise:         toPaise(sd?.isup_rev?.camt  ?? 0),
      sgstPaise:         toPaise(sd?.isup_rev?.samt  ?? 0),
      cessPaise:         toPaise(sd?.isup_rev?.csamt ?? 0),
    },
    non_gst_outward: {
      taxableValuePaise: toPaise(sd?.osup_nongst?.txval ?? 0),
    },
  };

  // Table 3.2: inter_sup -> unreg_det (array of pos, txval, iamt)
  const suppliesUnregistered = (inter?.unreg_det || []).map(row => ({
    pos:               String(row.pos || '').padStart(2, '0'),
    posName:           row.sply_ty || `State ${row.pos}`,
    taxableValuePaise: toPaise(row.txval ?? 0),
    igstPaise:         toPaise(row.iamt  ?? 0),
  }));

  const table32 = { supplies_unregistered: suppliesUnregistered };

  return { table31, table32 };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function comparePaiseField(diffs, table, field, label, ourPaise, portalPaise) {
  const a = ourPaise    ?? 0;
  const b = portalPaise ?? 0;
  const diffPaise = a - b;
  const isMatch = Math.abs(diffPaise) <= MATCH_THRESHOLD_PAISE;

  diffs.push({
    table,
    field,
    label,
    toolValuePaise:   a,
    portalValuePaise: b,
    toolValueRupees:   toRupees(a),
    portalValueRupees: toRupees(b),
    diffPaise,
    diffRupees: toRupees(diffPaise),
    isMatch,
  });
}
