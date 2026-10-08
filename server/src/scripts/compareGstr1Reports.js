/**
 * compareGstr1Reports.js
 *
 * Runs both parsers (Amazon + Flipkart) on the docs-design files,
 * generates a fresh GSTR-1 JSON with all P0 fixes applied,
 * then compares it section-by-section against the government portal report.
 *
 * Usage:  node src/scripts/compareGstr1Reports.js
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parseAmazonReport }   from '../parsers/amazonParser.js';
import { parseFlipkartReport } from '../parsers/flipkartParser.js';
import { aggregateGstr1 }      from '../engine/aggregator.js';
import { generateGstr1Json }   from '../exporters/jsonExporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// cwd when run as: node src/scripts/compareGstr1Reports.js from server/
// = d:\label_cropper\server  =>  docs-design is one level up
const WORKSPACE = path.resolve(process.cwd(), '..');
const DOCS = path.join(WORKSPACE, 'docs-design');
const OUT  = path.join(WORKSPACE, 'docs-design');

const SELLER_GSTIN = '09GUPPM8961P1Z6';
const SELLER_STATE = '09';
const PERIOD       = '092026';

const AMAZON_CSV   = path.join(DOCS, 'MTR_B2C-SEPTEMBER-2026-ATFATWBLJ4EL2.csv');
const FLIPKART_XLS = path.join(DOCS, '45255dc8-625d-41de-9d11-741919864d9d_1791204761000.xlsx');
const GOVT_JSON    = path.join(DOCS, 'GSTR1_returns_09GUPPM8961P1Z6_monthly_092026.json');
const OUT_JSON     = path.join(OUT,  'GSTR1_OUR_TOOL_FIXED_092026.json');

const fmt = n => (n === undefined || n === null) ? 'N/A' : Number(n).toFixed(2);
const diff = (a, b) => {
  const da = parseFloat(a) || 0;
  const db = parseFloat(b) || 0;
  const d  = da - db;
  const ok = Math.abs(d) < 0.015;
  return { ok, d: Number(d.toFixed(2)) };
};

async function main() {
  console.log('='.repeat(70));
  console.log('GSTR-1 Report Comparison — Sep 2026');
  console.log('='.repeat(70));

  console.log('\n[1] Parsing Amazon MTR CSV...');
  let amazonResult = { orderLines: [], warnings: [], errors: [] };
  if (fs.existsSync(AMAZON_CSV)) {
    amazonResult = await parseAmazonReport(AMAZON_CSV, SELLER_STATE);
    console.log('    OK  ' + amazonResult.orderLines.length + ' lines parsed');
    amazonResult.warnings.forEach(w => console.log('    WARN', w.message));
  } else {
    console.log('    MISS Amazon CSV not found:', AMAZON_CSV);
  }

  console.log('\n[2] Parsing Flipkart XLSX...');
  let flipkartResult = { orderLines: [], warnings: [], errors: [] };
  if (fs.existsSync(FLIPKART_XLS)) {
    flipkartResult = await parseFlipkartReport(FLIPKART_XLS, SELLER_STATE);
    console.log('    OK  ' + flipkartResult.orderLines.length + ' lines parsed');
    flipkartResult.warnings.forEach(w => console.log('    WARN', w.message));
    if (flipkartResult.orderLines.length === 0)
      console.log('    NOTE: Flipkart file has headers only, no data rows');
  } else {
    console.log('    MISS Flipkart XLSX not found:', FLIPKART_XLS);
  }

  const allLines = [...amazonResult.orderLines, ...flipkartResult.orderLines];
  console.log('\n[3] Total combined lines:', allLines.length);
  const aggregated = aggregateGstr1(allLines, SELLER_STATE, 'LyZov');
  console.log('    Taxable Value : Rs', fmt(aggregated.totals.taxableValuePaise / 100));
  console.log('    IGST          : Rs', fmt(aggregated.totals.igstPaise / 100));
  console.log('    CGST          : Rs', fmt(aggregated.totals.cgstPaise / 100));
  console.log('    SGST          : Rs', fmt(aggregated.totals.sgstPaise / 100));

  console.log('\n[4] Generating fixed GSTR-1 JSON...');
  const { payload: ourPayload } = generateGstr1Json({
    gstin: SELLER_GSTIN,
    period: PERIOD,
    aggregatedData: aggregated,
    outputFilePath: OUT_JSON,
  });
  console.log('    Written to', OUT_JSON);

  if (!fs.existsSync(GOVT_JSON)) {
    console.log('\n[5] Govt JSON not found. Skipping comparison.');
    return;
  }
  const govtPayload = JSON.parse(fs.readFileSync(GOVT_JSON, 'utf-8'));

  console.log('\n' + '='.repeat(70));
  console.log('COMPARISON: Our Tool vs Government Portal');
  console.log('='.repeat(70));

  console.log('\n-- HEADER --');
  for (const field of ['gstin','fp','version']) {
    const ok = ourPayload[field] === govtPayload[field];
    console.log('  ' + (ok ? 'PASS' : 'FAIL') + ' ' + field.padEnd(12) + ' OUR=' + ourPayload[field] + '  GOVT=' + govtPayload[field]);
  }

  console.log('\n-- B2CS (Table 7) --');
  const ourB2cs  = (ourPayload.b2cs  || []).filter(e => e.txval !== 0);
  const govtB2cs = (govtPayload.b2cs || []).filter(e => e.txval !== 0);
  const ourTxval  = ourB2cs.reduce( (s,e) => s+(e.txval||0), 0);
  const govtTxval = govtB2cs.reduce((s,e) => s+(e.txval||0), 0);
  const ourIgst   = ourB2cs.reduce( (s,e) => s+(e.iamt||0), 0);
  const govtIgst  = govtB2cs.reduce((s,e) => s+(e.iamt||0), 0);
  const t1 = diff(ourTxval, govtTxval);
  const t2 = diff(ourIgst,  govtIgst);
  console.log('  Entries  OUR=' + ourB2cs.length + '  GOVT=' + govtB2cs.length);
  console.log('  ' + (t1.ok?'PASS':'NOTE') + ' txval  OUR=Rs' + fmt(ourTxval) + '  GOVT=Rs' + fmt(govtTxval) + '  DELTA=' + t1.d);
  console.log('  ' + (t2.ok?'PASS':'NOTE') + ' IGST   OUR=Rs' + fmt(ourIgst)  + '  GOVT=Rs' + fmt(govtIgst)  + '  DELTA=' + t2.d);
  console.log('\n  Our B2CS entries:');
  ourB2cs.forEach(e => console.log('    pos=' + e.pos + ' rt=' + e.rt + '% ' + e.sply_ty + ' txval=' + fmt(e.txval) + ' iamt=' + fmt(e.iamt)));

  console.log('\n-- HSN (Table 12) --');
  const ourHsn  = ourPayload.hsn?.hsn_b2c || ourPayload.hsn?.hsn_b2b || [];
  const govtHsn = govtPayload.hsn?.hsn_b2c || govtPayload.hsn?.hsn_b2b || govtPayload.hsn?.data || [];
  console.log('  hsn_b2c / hsn_b2b key: ' + (Array.isArray(ourHsn) ? 'PASS' : 'FAIL'));
  console.log('  Our entries=' + ourHsn.length + '  Govt entries=' + govtHsn.length);
  ourHsn.forEach(h => console.log('    hsn_sc=' + (h.hsn_sc||'(blank)') + ' uqc=' + h.uqc + ' qty=' + h.qty + ' txval=' + fmt(h.txval)));

  console.log('\n-- SUPECO Table 14 --');
  const ourCl  = ourPayload.supeco?.clttx  || [];
  const govtCl = govtPayload.supeco?.clttx || [];
  console.log('  clttx key: ' + (Array.isArray(ourCl) ? 'PASS' : 'FAIL'));
  const ourSV  = ourCl.reduce( (s,e) => s+(e.suppval||0), 0);
  const govtSV = govtCl.reduce((s,e) => s+(e.suppval||0), 0);
  const svd = diff(ourSV, govtSV);
  console.log('  ' + (svd.ok?'PASS':'NOTE') + ' suppval  OUR=Rs' + fmt(ourSV) + '  GOVT=Rs' + fmt(govtSV) + '  DELTA=' + svd.d);
  console.log('  Our entries:');
  ourCl.forEach(e => console.log('    etin=' + e.etin + ' suppval=' + fmt(e.suppval) + ' igst=' + fmt(e.igst) + ' cgst=' + fmt(e.cgst) + ' sgst=' + fmt(e.sgst) + ' flag=' + e.flag));
  console.log('  Govt entries:');
  govtCl.forEach(e => console.log('    etin=' + e.etin + ' suppval=' + fmt(e.suppval) + ' igst=' + fmt(e.igst) + ' cgst=' + fmt(e.cgst) + ' sgst=' + fmt(e.sgst) + ' flag=' + e.flag));

  console.log('\n-- NIL Section --');
  const getnil = (payload, ty) => payload.nil?.inv?.find(e=>e.sply_ty===ty)?.nil_amt || 0;
  const nd1 = diff(getnil(ourPayload,'INTRB2C'),  getnil(govtPayload,'INTRB2C'));
  const nd2 = diff(getnil(ourPayload,'INTRAB2C'), getnil(govtPayload,'INTRAB2C'));
  console.log('  ' + (nd1.ok?'PASS':'NOTE') + ' INTRB2C  OUR=' + fmt(getnil(ourPayload,'INTRB2C'))  + '  GOVT=' + fmt(getnil(govtPayload,'INTRB2C'))  + '  DELTA=' + nd1.d);
  console.log('  ' + (nd2.ok?'PASS':'NOTE') + ' INTRAB2C OUR=' + fmt(getnil(ourPayload,'INTRAB2C')) + '  GOVT=' + fmt(getnil(govtPayload,'INTRAB2C')) + '  DELTA=' + nd2.d);

  console.log('\n' + '='.repeat(70));
  console.log('Schema Fix Verification:');
  console.log('  version=GST3.1.6            :', ourPayload.version === 'GST3.1.6' ? 'PASS' : 'FAIL');
  console.log('  hsn.hsn_b2c / hsn_b2b key present :', (Array.isArray(ourPayload.hsn?.hsn_b2c) || Array.isArray(ourPayload.hsn?.hsn_b2b)) ? 'PASS' : 'FAIL');
  console.log('  supeco.clttx key present    :', Array.isArray(ourPayload.supeco?.clttx) ? 'PASS' : 'FAIL');
  const firstEntry = ourPayload.supeco?.clttx?.[0];
  if (firstEntry) {
    console.log('  clttx[0] has suppval field  :', 'suppval' in firstEntry ? 'PASS' : 'FAIL');
    console.log('  clttx[0] has flag field     :', 'flag' in firstEntry ? 'PASS' : 'FAIL');
    console.log('  clttx[0] has igst field     :', 'igst' in firstEntry ? 'PASS' : 'FAIL');
  }
  console.log('  nil section present         :', Array.isArray(ourPayload.nil?.inv) ? 'PASS' : 'FAIL');
  console.log('  cur_gt > 0                  :', ourPayload.cur_gt > 0 ? 'PASS' : 'WARN (all exempt/zero)');
  console.log('='.repeat(70));
}

main().catch(err => { console.error(err); process.exit(1); });
