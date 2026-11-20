import fs from 'fs';
import path from 'path';

// Current GSTR-1 JSON schema version accepted by GST Portal
const GSTR1_VERSION = 'GST3.1.6';

/**
 * Generates the GST Portal / Offline Tool compliant GSTR-1 JSON payload, shaped
 * exactly like the reference (paid) tool's file so the two can be diffed 1:1:
 *
 *  - top-level key order : gstin, fp, [cur_gt], version, hash, [b2b], b2cs, [cdnr],
 *                          nil, hsn, supeco, doc_issue
 *    (b2b / cdnr are omitted when empty, exactly like the reference file)
 *  - b2cs rows           : INTER -> sply_ty, rt, typ, pos, txval, iamt, csamt
 *                          INTRA -> sply_ty, rt, typ, pos, txval, camt, samt, csamt
 *                          zero-value buckets are kept
 *  - hsn                 : hsnMode 'placeholder' (default) => { hsn_b2b: [ single zero row ] }
 *                          hsnMode 'full'                  => { hsn_b2c: [ real HSN summary ] }
 *  - supeco.clttx        : Amazon before Flipkart (alphabetical by operator name)
 *  - doc_issue.doc_det   : Invoices (1), Credit Note (5), Debit Note (4)
 *
 * @param {object} opts
 * @param {'placeholder'|'full'} [opts.hsnMode='placeholder']
 */
export function generateGstr1Json({ gstin, period, aggregatedData, outputFilePath, hsnMode = 'placeholder' }) {
  const { sections, totals } = aggregatedData;

  // cur_gt: omit when no real cumulative figure exists
  const cur_gt = totals.grossTurnover > 0 ? totals.grossTurnover : undefined;

  // ---------------- B2CS (Table 7) ----------------
  const b2csSource = sections.b2csAll || sections.b2cs || [];
  const b2cs = b2csSource.map(e => {
    const base = { sply_ty: e.sply_ty, rt: e.rt, typ: e.typ, pos: e.pos, txval: e.txval };
    return e.sply_ty === 'INTER'
      ? { ...base, iamt: e.iamt || 0, csamt: e.csamt || 0 }
      : { ...base, camt: e.camt || 0, samt: e.samt || 0, csamt: e.csamt || 0 };
  });

  // ---------------- HSN (Table 12) ----------------
  const rawHsn = sections.hsn || {};
  const hsnRows = rawHsn.hsn_b2c || rawHsn.hsn_b2b || rawHsn.data || [];
  let hsnSection;
  if (hsnMode === 'full') {
    hsnSection = { hsn_b2c: hsnRows };
  } else {
    // Reference tool emits one all-zero placeholder row; use the dominant HSN code.
    const dominant = [...hsnRows].sort((a, b) => Math.abs(b.txval) - Math.abs(a.txval))[0];
    hsnSection = {
      hsn_b2b: [{
        num: 1,
        hsn_sc: dominant?.hsn_sc || '',
        uqc: dominant?.uqc || 'PCS',
        qty: 0, rt: 0, txval: 0, iamt: 0, samt: 0, camt: 0, csamt: 0,
      }],
    };
  }

  // ---------------- Table 14 (supeco.clttx) ----------------
  const rawClttx = sections.supeco?.clttx || sections.supeco?.cl14_2 || [];
  const clttx = [...rawClttx]
    .sort((a, b) => String(a.sup_name || '').localeCompare(String(b.sup_name || '')))
    .map(entry => ({
      etin:    entry.etin,
      suppval: entry.suppval ?? entry.txval ?? 0,
      igst:    entry.igst   ?? entry.iamt  ?? 0,
      cgst:    entry.cgst   ?? entry.camt  ?? 0,
      sgst:    entry.sgst   ?? entry.samt  ?? 0,
      cess:    entry.cess   ?? entry.csamt ?? 0,
      flag:    entry.flag   ?? 'N',
    }));

  // ---------------- Nil / exempt ----------------
  const nilSection = sections.nil || {
    inv: [
      { sply_ty: 'INTRB2B',  nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
      { sply_ty: 'INTRAB2B', nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
      { sply_ty: 'INTRB2C',  nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
      { sply_ty: 'INTRAB2C', nil_amt: 0, expt_amt: 0, ngsup_amt: 0 },
    ],
  };

  // ---------------- Final payload ----------------
  const hasB2b  = (sections.b2b  || []).length > 0;
  const hasCdnr = (sections.cdnr || []).length > 0;

  const payload = {
    gstin,
    fp: period,
    ...(cur_gt !== undefined ? { cur_gt } : {}),
    version: GSTR1_VERSION,
    hash: 'hash',
    ...(hasB2b ? { b2b: sections.b2b } : {}),
    b2cs,
    ...(hasCdnr ? { cdnr: sections.cdnr } : {}),
    nil: nilSection,
    hsn: hsnSection,
    supeco: { clttx },
    doc_issue: sections.doc_issue || { doc_det: [] },
  };

  const jsonString = JSON.stringify(payload, null, 2);

  if (outputFilePath) {
    const dir = path.dirname(outputFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputFilePath, jsonString, 'utf-8');
  }

  return { payload, jsonString };
}
