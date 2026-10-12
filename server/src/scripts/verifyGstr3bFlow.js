/**
 * verifyGstr3bFlow.js
 *
 * Phase 9 Verification Suite for GSTR-3B Module:
 * Tests every engine, parser, and exporter end-to-end:
 *   1. outwardEngine (Table 3.1)
 *   2. interStateEngine (Table 3.2)
 *   3. compareEngine (Reconciliation & diffs)
 *   4. gstr2bParser (Amazon / Flipkart marketplace fee detection)
 *   5. itcEngine (Table 4 ITC eligible / reversed / ineligible)
 *   6. offsetEngine (Legal credit set-off order & net cash liability)
 *   7. gstr3bJsonExporter (Portal compliant 3B JSON)
 *   8. gstr3bExcelExporter (CA Multi-sheet Excel workbook)
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { computeTable31 } from '../gstr3b/outwardEngine.js';
import { computeTable32 } from '../gstr3b/interStateEngine.js';
import { compare3bVsPortal, parsePortal3bJson } from '../gstr3b/compareEngine.js';
import { parseGstr2bJson } from '../parsers/gstr2bParser.js';
import { computeTable4 } from '../gstr3b/itcEngine.js';
import { computeTable6 } from '../gstr3b/offsetEngine.js';
import { generateGstr3bJson } from '../exporters/gstr3bJsonExporter.js';
import { generateGstr3bExcel } from '../exporters/gstr3bExcelExporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.resolve(__dirname, '../../uploads/temp-test');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

console.log('====================================================');
console.log('🧪 RUNNING GSTR-3B STATUTORY TEST & VERIFICATION SUITE');
console.log('====================================================\n');

let passedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────
// TEST 1: Table 3.1 Outward Engine
// ─────────────────────────────────────────────────────────────
runTest('Phase 2.1: outwardEngine - Table 3.1 Outward Taxable Supplies', () => {
  const mockGstr1 = {
    totals: {
      taxableValuePaise: 50000000, // ₹5,00,000.00
      igstPaise: 4500000,         // ₹45,000.00
      cgstPaise: 2250000,         // ₹22,500.00
      sgstPaise: 2250000,         // ₹22,500.00
      cessPaise: 0,
    },
    sections: {
      nil: {
        inv: [
          { nil_amt: 1000, expt_amt: 500, ngsup_amt: 200 }
        ]
      }
    }
  };

  const t31 = computeTable31(mockGstr1);

  assert.strictEqual(t31.outward_taxable.taxableValuePaise, 50000000);
  assert.strictEqual(t31.outward_taxable.igstPaise, 4500000);
  assert.strictEqual(t31.outward_taxable.cgstPaise, 2250000);
  assert.strictEqual(t31.outward_taxable.sgstPaise, 2250000);
  // Nil + Exempt = (1000 + 500) * 100 = 150000 paise
  assert.strictEqual(t31.outward_nil_exempt.taxableValuePaise, 150000);
  // Non-GST = 200 * 100 = 20000 paise
  assert.strictEqual(t31.non_gst_outward.taxableValuePaise, 20000);
});

// ─────────────────────────────────────────────────────────────
// TEST 2: Table 3.2 Inter-State Supplies by State
// ─────────────────────────────────────────────────────────────
runTest('Phase 2.2: interStateEngine - Table 3.2 Inter-State POS Breakdown', () => {
  const mockGstr1 = {
    sections: {
      b2cs: [
        { sply_ty: 'INTER', pos: '27', txval: 1000, iamt: 180 },
        { sply_ty: 'INTER', pos: '27', txval: 500,  iamt: 90 },
        { sply_ty: 'INTER', pos: '07', txval: 2000, iamt: 360 },
        { sply_ty: 'INTRA', pos: '09', txval: 3000, camt: 270, samt: 270 }, // should be ignored in 3.2
      ]
    }
  };

  const t32 = computeTable32(mockGstr1);
  const unreg = t32.supplies_unregistered;

  assert.strictEqual(unreg.length, 2);
  // Sorted by POS: '07' (Delhi) then '27' (Maharashtra)
  assert.strictEqual(unreg[0].pos, '07');
  assert.strictEqual(unreg[0].taxableValuePaise, 200000); // ₹2,000
  assert.strictEqual(unreg[0].igstPaise, 36000);         // ₹360

  assert.strictEqual(unreg[1].pos, '27');
  assert.strictEqual(unreg[1].taxableValuePaise, 150000); // ₹1,500
  assert.strictEqual(unreg[1].igstPaise, 27000);         // ₹270
});

// ─────────────────────────────────────────────────────────────
// TEST 3: GSTR-1 vs Portal 3B Comparison Engine
// ─────────────────────────────────────────────────────────────
runTest('Phase 3: compareEngine - Portal vs Tool Reconciliation', () => {
  const tool31 = {
    outward_taxable: { taxableValuePaise: 100000, igstPaise: 18000, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 },
    outward_nil_exempt: { taxableValuePaise: 0 },
  };
  const tool32 = { supplies_unregistered: [{ pos: '27', posName: 'Maharashtra', taxableValuePaise: 100000, igstPaise: 18000 }] };

  // Perfect match
  const matchingPortal = {
    table31: {
      outward_taxable: { taxableValuePaise: 100000, igstPaise: 18000, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 },
      outward_nil_exempt: { taxableValuePaise: 0 },
    },
    table32: { supplies_unregistered: [{ pos: '27', posName: 'Maharashtra', taxableValuePaise: 100000, igstPaise: 18000 }] }
  };

  const matchRes = compare3bVsPortal(tool31, tool32, matchingPortal);
  assert.strictEqual(matchRes.allMatched, true);
  assert.strictEqual(matchRes.summary.mismatched, 0);

  // Mismatch in IGST
  const mismatchPortal = {
    table31: {
      outward_taxable: { taxableValuePaise: 100000, igstPaise: 17000, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 },
      outward_nil_exempt: { taxableValuePaise: 0 },
    },
    table32: { supplies_unregistered: [] }
  };

  const diffRes = compare3bVsPortal(tool31, tool32, mismatchPortal);
  assert.strictEqual(diffRes.allMatched, false);
  assert.ok(diffRes.summary.mismatched >= 1);
});

// ─────────────────────────────────────────────────────────────
// TEST 4: GSTR-2B JSON Parser (Amazon/Flipkart Fee Detection)
// ─────────────────────────────────────────────────────────────
runTest('Phase 4.1: gstr2bParser - Ingestion & Marketplace Detection', () => {
  const mock2b = {
    data: {
      docdata: {
        b2b: [
          {
            ctin: '07AAGCA1444J1ZQ', // Amazon Seller Services
            suppName: 'AMAZON SELLER SERVICES PVT LTD',
            inv: [
              {
                inum: 'INV-AMZ-001',
                idt: '15-09-2026',
                val: 1180,
                pos: '07',
                itms: [{ rt: 18, txval: 1000, igst: 180, cgst: 0, sgst: 0 }]
              }
            ]
          },
          {
            ctin: '29AAACF9154Q1ZL', // Flipkart Internet
            suppName: 'FLIPKART INTERNET PRIVATE LIMITED',
            inv: [
              {
                inum: 'INV-FK-002',
                idt: '20-09-2026',
                val: 2360,
                pos: '29',
                itms: [{ rt: 18, txval: 2000, igst: 360, cgst: 0, sgst: 0 }]
              }
            ]
          },
          {
            ctin: '09AAACA1234A1Z1', // Regular Supplier
            suppName: 'SUPPLIER XYZ',
            inv: [
              {
                inum: 'INV-REG-003',
                idt: '25-09-2026',
                val: 590,
                pos: '09',
                itms: [{ rt: 18, txval: 500, igst: 0, cgst: 45, sgst: 45 }]
              }
            ]
          }
        ]
      }
    }
  };

  const parsed = parseGstr2bJson(mock2b);
  assert.strictEqual(parsed.invoiceCount, 3);
  assert.strictEqual(parsed.supplierCount, 3);

  // Total ITC = 180 + 360 = 540 IGST, 45 CGST, 45 SGST
  assert.strictEqual(parsed.totalItc.igstPaise, 54000);
  assert.strictEqual(parsed.totalItc.cgstPaise, 4500);
  assert.strictEqual(parsed.totalItc.sgstPaise, 4500);

  // Marketplace fee invoices = Amazon (180) + Flipkart (360) = 54000 paise
  assert.strictEqual(parsed.marketplaceFeeItc.igstPaise, 54000);

  // Check marketplace flags
  assert.strictEqual(parsed.invoices[0].isMarketplaceFee, true);
  assert.strictEqual(parsed.invoices[0].marketplace, 'amazon');
  assert.strictEqual(parsed.invoices[1].isMarketplaceFee, true);
  assert.strictEqual(parsed.invoices[1].marketplace, 'flipkart');
  assert.strictEqual(parsed.invoices[2].isMarketplaceFee, false);
  assert.strictEqual(parsed.invoices[2].marketplace, 'other');
});

// ─────────────────────────────────────────────────────────────
// TEST 5: Table 4 ITC Engine (Eligible vs Ineligible 17(5))
// ─────────────────────────────────────────────────────────────
runTest('Phase 4.2: itcEngine - Table 4 Classification', () => {
  const invoices = [
    { igstPaise: 50000, cgstPaise: 0, sgstPaise: 0, cessPaise: 0, eligibility: 'ELIGIBLE' },
    { igstPaise: 0, cgstPaise: 10000, sgstPaise: 10000, cessPaise: 0, eligibility: 'ELIGIBLE' },
    { igstPaise: 5000, cgstPaise: 0, sgstPaise: 0, cessPaise: 0, eligibility: 'REVERSED' },
    { igstPaise: 2000, cgstPaise: 0, sgstPaise: 0, cessPaise: 0, eligibility: 'INELIGIBLE', ineligibilityReason: 'Section 17(5)' },
  ];

  const { table4, summary } = computeTable4(invoices);

  // 4(A)(5) All Other ITC
  assert.strictEqual(table4.itc_available.all_other_itc.igstPaise, 50000);
  assert.strictEqual(table4.itc_available.all_other_itc.cgstPaise, 10000);
  assert.strictEqual(table4.itc_available.all_other_itc.sgstPaise, 10000);

  // 4(B) Reversed
  assert.strictEqual(table4.itc_reversed.as_per_rules.igstPaise, 5000);

  // 4(C) Net ITC = 4(A) - 4(B) = 50000 - 5000 = 45000 IGST
  assert.strictEqual(table4.net_itc.igstPaise, 45000);
  assert.strictEqual(table4.net_itc.cgstPaise, 10000);
  assert.strictEqual(table4.net_itc.sgstPaise, 10000);

  // 4(D) Ineligible 17(5)
  assert.strictEqual(table4.ineligible_itc.as_per_section_17_5.igstPaise, 2000);
});

// ─────────────────────────────────────────────────────────────
// TEST 6: Statutory Set-Off Engine (Legal Order & Net Cash Payable)
// ─────────────────────────────────────────────────────────────
runTest('Phase 5: offsetEngine - Legal Hierarchy & Net Payable', () => {
  // Scenario:
  // Liability: IGST = ₹500, CGST = ₹300, SGST = ₹300
  // ITC: IGST = ₹700 (₹500 against IGST, remaining ₹200 goes to CGST liability)
  // CGST ITC: ₹200 (₹100 covers remainder of CGST liability, ₹100 left)
  // SGST ITC: ₹100 (partially covers SGST liability)
  // TCS credit: SGST = ₹50
  // Cash balance: SGST = ₹50
  // Remaining SGST to pay in cash = ₹300 - ₹0 (no IGST left) - ₹100 (SGST ITC) - ₹50 (TCS) - ₹50 (Cash) = ₹100

  const liability = {
    igstPaise: 50000,
    cgstPaise: 30000,
    sgstPaise: 30000,
    cessPaise: 0,
  };

  const itcAvailable = {
    igstPaise: 70000,
    cgstPaise: 20000,
    sgstPaise: 10000,
    cessPaise: 0,
  };

  const cashLedger = {
    tcsCredits: { igstPaise: 0, cgstPaise: 0, sgstPaise: 5000 },
    cashBalance: { igstPaise: 0, cgstPaise: 0, sgstPaise: 5000, cessPaise: 0 },
  };

  const { setOff, table6, netPayable } = computeTable6(liability, itcAvailable, cashLedger);

  // 1. IGST credit covers IGST liability fully (₹500)
  assert.strictEqual(setOff.igst_used_for_igst, 50000);
  // 2. Remaining IGST credit (₹200) covers CGST liability
  assert.strictEqual(setOff.igst_used_for_cgst, 20000);
  // 3. CGST liability had ₹100 remaining, covered by CGST ITC
  assert.strictEqual(setOff.cgst_used_for_cgst, 10000);
  // 4. SGST liability (₹300) covered by SGST ITC (₹100)
  assert.strictEqual(setOff.sgst_used_for_sgst, 10000);

  // IGST and CGST net cash payable must be 0
  assert.strictEqual(netPayable.igstPaise, 0);
  assert.strictEqual(netPayable.cgstPaise, 0);

  // SGST remaining liability after ITC was 30000 - 10000 = 20000 paise (₹200)
  // After ₹50 TCS and ₹50 Cash balance, net cash to deposit = ₹100 (10000 paise)
  assert.strictEqual(netPayable.sgstPaise, 10000);
  assert.strictEqual(netPayable.totalPaise, 10000);
});

// ─────────────────────────────────────────────────────────────
// TEST 7: GSTR-3B Portal Compliant JSON Exporter
// ─────────────────────────────────────────────────────────────
runTest('Phase 6.1: gstr3bJsonExporter - Portal JSON Validation', () => {
  const mockReturn = {
    period: '092026',
    table31: {
      outward_taxable: { taxableValuePaise: 10000000, igstPaise: 1800000, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 },
      outward_zero_rated: { taxableValuePaise: 0, igstPaise: 0, cessPaise: 0 },
      outward_nil_exempt: { taxableValuePaise: 50000 },
      inward_reverse_charge: { taxableValuePaise: 0, igstPaise: 0, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 },
      non_gst_outward: { taxableValuePaise: 0 },
    },
    table32: {
      supplies_unregistered: [
        { pos: '27', taxableValuePaise: 10000000, igstPaise: 1800000 }
      ]
    },
    table4: {
      itc_available: { all_other_itc: { igstPaise: 500000, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 } },
      itc_reversed: { as_per_rules: { igstPaise: 0, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 }, others: { igstPaise: 0, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 } },
      net_itc: { igstPaise: 500000, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 },
      ineligible_itc: { as_per_section_17_5: { igstPaise: 0, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 }, others: { igstPaise: 0, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 } },
    }
  };

  const business = {
    gstin: '09GUPPM8961P1Z6',
    legalName: 'TEST ENTERPRISES',
  };

  const json = generateGstr3bJson(mockReturn, business);

  assert.strictEqual(json.gstin, '09GUPPM8961P1Z6');
  assert.strictEqual(json.ret_period, '092026');
  assert.strictEqual(json.sup_details.osup_det.txval, 100000.00);
  assert.strictEqual(json.sup_details.osup_det.iamt, 18000.00);
  assert.strictEqual(json.sup_details.osup_nil_exmp.txval, 500.00);
  assert.strictEqual(json.inter_sup.unreg_det[0].pos, '27');
  assert.strictEqual(json.inter_sup.unreg_det[0].txval, 100000.00);
  assert.strictEqual(json.itc_elg.itc_avl[4].iamt, 5000.00);
});

// ─────────────────────────────────────────────────────────────
// TEST 8: GSTR-3B CA Multi-Sheet Excel Exporter
// ─────────────────────────────────────────────────────────────
runTest('Phase 6.2: gstr3bExcelExporter - CA Multi-Sheet Workbook Generation', () => {
  const mockReturn = {
    period: '092026',
    status: 'COMPUTED',
    table31: {
      outward_taxable: { taxableValuePaise: 10000000, igstPaise: 1800000, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 },
      outward_nil_exempt: { taxableValuePaise: 50000 },
    },
    table32: {
      supplies_unregistered: [
        { pos: '27', taxableValuePaise: 10000000, igstPaise: 1800000 }
      ]
    },
    table4: {
      itc_available: { all_other_itc: { igstPaise: 500000, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 } },
      itc_reversed: { as_per_rules: { igstPaise: 0, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 }, others: { igstPaise: 0, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 } },
      net_itc: { igstPaise: 500000, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 },
      ineligible_itc: { as_per_section_17_5: { igstPaise: 0, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 }, others: { igstPaise: 0, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 } },
    },
    table6: {
      tax_payable: { igstPaise: 1800000, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 },
      paid_through_itc: { igst_used_for_igst: 500000 },
      cash_ledger_used: { igstPaise: 0 },
      net_cash_payable: { igstPaise: 1300000, totalPaise: 1300000 },
    }
  };

  const business = {
    gstin: '09GUPPM8961P1Z6',
    legalName: 'TEST ENTERPRISES',
    stateCode: '09',
  };

  const comparison = {
    portalSource: 'uploaded_json',
    summary: { reconciledAt: new Date().toISOString(), totalFields: 5, matched: 5, mismatched: 0 },
    diffs: [
      { table: '3.1(a)', field: 'taxableValue', label: 'Taxable Value', toolValueRupees: 100000, portalValueRupees: 100000, diffRupees: 0, isMatch: true }
    ]
  };

  const outPath = path.join(tempDir, 'test_gstr3b_output.xlsx');
  generateGstr3bExcel({ return3b: mockReturn, business, comparison, outputFilePath: outPath });

  assert.ok(fs.existsSync(outPath), 'Excel file was created');
  const stat = fs.statSync(outPath);
  assert.ok(stat.size > 2000, 'Excel file has content');

  // Clean up test file
  fs.unlinkSync(outPath);
});

console.log('\n====================================================');
console.log(`🎉 ALL ${passedTests} TEST SUITES PASSED FLAWLESSLY!`);
console.log('====================================================\n');
