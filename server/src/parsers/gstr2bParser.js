/**
 * gstr2bParser.js
 *
 * Phase 4: Parses a GSTR-2B JSON file downloaded from the GST Portal.
 *
 * GSTR-2B JSON structure (gov schema):
 *   data.docdata.b2b[]     - B2B invoices from registered suppliers
 *   data.docdata.cdnr[]    - Credit/Debit notes from registered suppliers
 *   data.docdata.impg[]    - Import of Goods
 *   data.docdata.impgsez[] - Import from SEZ
 *
 * Each supplier entry:
 *   { ctin, suppName, inv: [{ inum, idt, itms: [{ rt, txval, igst, cgst, sgst, cess }] }] }
 *
 * This parser:
 *   1. Flattens all invoices into a normalized list
 *   2. Detects Amazon/Flipkart marketplace fee invoices by supplier GSTIN
 *   3. Calculates ITC totals per tax type
 *   4. Marks all entries as ELIGIBLE by default (user reviews on UI)
 */

import { toPaise, toRupees } from '../engine/money.js';
import { MARKETPLACE_ETIN } from '../config/constants.js';

// All known Amazon + Flipkart service GSTINs (for fee invoice detection)
const AMAZON_GSTINS = new Set(MARKETPLACE_ETIN.AMAZON.map(g => g.toUpperCase()));
const FLIPKART_GSTINS = new Set(MARKETPLACE_ETIN.FLIPKART.map(g => g.toUpperCase()));

/**
 * @param {Object} gstr2bJson - Raw parsed JSON from a GSTR-2B file
 * @returns {{
 *   invoices: Array,
 *   supplierCount: number,
 *   invoiceCount: number,
 *   totalItc: { igstPaise, cgstPaise, sgstPaise, cessPaise },
 *   marketplaceFeeItc: { igstPaise, cgstPaise, sgstPaise, cessPaise },
 *   warnings: string[],
 * }}
 */
export function parseGstr2bJson(gstr2bJson) {
  const warnings = [];
  const invoices = [];

  const docdata = gstr2bJson?.data?.docdata || gstr2bJson?.docdata || {};

  // Process B2B invoices
  const b2bEntries = docdata.b2b || [];
  for (const supplier of b2bEntries) {
    const supplierGstin = String(supplier.ctin || supplier.gstin || '').toUpperCase().trim();
    const supplierName  = supplier.suppName || supplier.tradeName || '';

    const { isMarketplace, marketplace } = detectMarketplace(supplierGstin, supplierName);

    for (const inv of (supplier.inv || [])) {
      const invoiceNumber = inv.inum || inv.doc_num || '';
      const invoiceDate   = parseGovDate(inv.idt || inv.doc_dt);
      const invoiceValue  = toPaise(inv.val ?? 0);
      const pos           = String(inv.pos || '').padStart(2, '0');
      const reverseCharge = String(inv.rev || inv.rchrg || 'N').toUpperCase() === 'Y';

      for (const item of (inv.itms || [])) {
        const det = item.itm_det || item;
        const rate = Number(det.rt ?? det.rate ?? 0);
        const igst = toPaise(det.igst ?? det.iamt ?? 0);
        const cgst = toPaise(det.cgst ?? det.camt ?? 0);
        const sgst = toPaise(det.sgst ?? det.samt ?? 0);
        const cess = toPaise(det.cess ?? det.csamt ?? 0);
        const txval = toPaise(det.txval ?? 0);

        invoices.push({
          type: 'B2B',
          supplierGstin,
          supplierName,
          invoiceNumber,
          invoiceDate,
          invoiceValuePaise: invoiceValue,
          pos,
          reverseCharge,
          rate,
          taxableValuePaise: txval,
          igstPaise: igst,
          cgstPaise: cgst,
          sgstPaise: sgst,
          cessPaise: cess,
          isMarketplaceFee: isMarketplace,
          marketplace,
          eligibility: 'ELIGIBLE',
          ineligibilityReason: '',
        });
      }
    }
  }

  // Process CDNR (Credit/Debit Notes from registered suppliers)
  const cdnrEntries = docdata.cdnr || [];
  for (const supplier of cdnrEntries) {
    const supplierGstin = String(supplier.ctin || '').toUpperCase().trim();
    const supplierName  = supplier.suppName || '';
    const { isMarketplace, marketplace } = detectMarketplace(supplierGstin);

    for (const note of (supplier.nt || [])) {
      const noteType = String(note.ntty || '').toUpperCase(); // 'C' or 'D'
      const sign = noteType === 'C' ? -1 : 1; // Credit note reduces ITC

      for (const item of (note.itms || [])) {
        const det = item.itm_det || item;
        invoices.push({
          type: `CDN_${noteType}`,
          supplierGstin,
          supplierName,
          invoiceNumber: note.nt_num || '',
          invoiceDate: parseGovDate(note.nt_dt),
          invoiceValuePaise: toPaise((note.val ?? 0) * sign),
          pos: String(note.pos || '').padStart(2, '0'),
          reverseCharge: false,
          rate: Number(det.rt ?? 0),
          taxableValuePaise: toPaise((det.txval ?? 0) * sign),
          igstPaise: toPaise((det.igst ?? det.iamt ?? 0) * sign),
          cgstPaise: toPaise((det.cgst ?? det.camt ?? 0) * sign),
          sgstPaise: toPaise((det.sgst ?? det.samt ?? 0) * sign),
          cessPaise: toPaise((det.cess ?? det.csamt ?? 0) * sign),
          isMarketplaceFee: isMarketplace,
          marketplace,
          eligibility: 'ELIGIBLE',
          ineligibilityReason: '',
        });
      }
    }
  }

  // Aggregate totals
  const totalItc = { igstPaise: 0, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 };
  const marketplaceFeeItc = { igstPaise: 0, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 };

  for (const inv of invoices) {
    totalItc.igstPaise += inv.igstPaise;
    totalItc.cgstPaise += inv.cgstPaise;
    totalItc.sgstPaise += inv.sgstPaise;
    totalItc.cessPaise += inv.cessPaise;

    if (inv.isMarketplaceFee) {
      marketplaceFeeItc.igstPaise += inv.igstPaise;
      marketplaceFeeItc.cgstPaise += inv.cgstPaise;
      marketplaceFeeItc.sgstPaise += inv.sgstPaise;
      marketplaceFeeItc.cessPaise += inv.cessPaise;
    }
  }

  const uniqueSuppliers = new Set(invoices.map(i => i.supplierGstin));

  return {
    invoices,
    supplierCount: uniqueSuppliers.size,
    invoiceCount:  invoices.length,
    totalItc,
    marketplaceFeeItc,
    warnings,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function detectMarketplace(gstin = '', supplierName = '') {
  const g = String(gstin).toUpperCase();
  const name = String(supplierName).toUpperCase();

  if (
    AMAZON_GSTINS.has(g) ||
    g.includes('AABCA0027R') ||
    g.includes('AAGCA1444J') ||
    name.includes('AMAZON')
  ) {
    return { isMarketplace: true, marketplace: 'amazon' };
  }

  if (
    FLIPKART_GSTINS.has(g) ||
    g.includes('AAACF1479P') ||
    g.includes('AAACF9154Q') ||
    name.includes('FLIPKART')
  ) {
    return { isMarketplace: true, marketplace: 'flipkart' };
  }

  return { isMarketplace: false, marketplace: 'other' };
}

function parseGovDate(dateStr) {
  if (!dateStr) return null;
  // Portal format: "DD/MM/YYYY"
  const parts = String(dateStr).split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
  }
  return new Date(dateStr);
}
