import fs from 'fs';
import path from 'path';
import { toRupees } from '../engine/money.js';

// Current GSTR-1 JSON schema version accepted by GST Portal
const GSTR1_VERSION = 'GST3.1.6';

/**
 * Generates the official GST Portal & Offline Tool compliant GSTR-1 JSON payload.
 * Fixed schema keys vs v1:
 *  - version: GST3.1.6
 *  - hsn.hsn_b2b (was: hsn.data)
 *  - supeco.clttx (was: supeco.cl14_2)
 *  - supeco.clttx[].suppval / igst / cgst / sgst / flag (was: txval / iamt / camt / samt)
 *  - cur_gt: sum of all taxable values
 *  - nil: exempt / nil-rated B2C supplies
 *  - doc_issue: document series summary
 */
export function generateGstr1Json({ gstin, period, aggregatedData, outputFilePath }) {
  const { sections, totals } = aggregatedData;

  // cur_gt = gross taxable value in rupees (all sections combined)
  const cur_gt = toRupees(totals.taxableValuePaise);

  // ------------------------------------------------------------------
  // HSN section — correct key is hsn_b2b
  // ------------------------------------------------------------------
  const rawHsn = sections.hsn || {};
  const hsnData = rawHsn.hsn_b2b || rawHsn.data || [];
  const hsnSection = { hsn_b2b: hsnData };

  // ------------------------------------------------------------------
  // supeco (Table 14) — correct key is clttx
  // ------------------------------------------------------------------
  const rawClttx = sections.supeco?.clttx || sections.supeco?.cl14_2 || [];
  const clttxNormalized = rawClttx.map(entry => ({
    etin:    entry.etin,
    suppval: entry.suppval ?? entry.txval ?? 0,
    igst:    entry.igst   ?? entry.iamt  ?? 0,
    cgst:    entry.cgst   ?? entry.camt  ?? 0,
    sgst:    entry.sgst   ?? entry.samt  ?? 0,
    cess:    entry.cess   ?? entry.csamt ?? 0,
    flag:    entry.flag   ?? 'N',
  }));

  // ------------------------------------------------------------------
  // nil section — captures exempt / nil-rated supplies
  // ------------------------------------------------------------------
  const nilSection = sections.nil || {
    inv: [
      { sply_ty: 'INTRB2B',  nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
      { sply_ty: 'INTRAB2B', nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
      { sply_ty: 'INTRB2C',  nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
      { sply_ty: 'INTRAB2C', nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
    ],
  };

  // ------------------------------------------------------------------
  // Build final payload — field order matches GST portal expectation
  // ------------------------------------------------------------------
  const payload = {
    gstin,
    fp:         period,          // e.g., '092026'
    cur_gt,
    version:    GSTR1_VERSION,
    hash:       'hash',
    b2b:        sections.b2b   || [],
    b2cs:       sections.b2cs  || [],
    cdnr:       sections.cdnr  || [],
    nil:        nilSection,
    hsn:        hsnSection,
    doc_issue:  sections.doc_issue || { doc_det: [] },
    supeco:     { clttx: clttxNormalized },
  };

  const jsonString = JSON.stringify(payload, null, 2);

  if (outputFilePath) {
    const dir = path.dirname(outputFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputFilePath, jsonString, 'utf-8');
  }

  return { payload, jsonString };
}

