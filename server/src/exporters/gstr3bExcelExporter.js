/**
 * gstr3bExcelExporter.js
 *
 * Phase 6: Generates a CA-ready multi-sheet GSTR-3B Summary Excel workbook.
 *
 * Sheets produced:
 *   1. Cover      - Business info, period, status
 *   2. Table_3.1  - Outward supplies breakdown
 *   3. Table_3.2  - Inter-state supplies by state
 *   4. Table_4_ITC - ITC available, reversed, net, ineligible
 *   5. Set-Off     - Statutory set-off matrix and net cash payable
 *   6. Comparison  - GSTR-1 vs Portal 3B reconciliation diffs
 */

import xlsx from 'xlsx';
import { toRupees } from '../engine/money.js';
import { GST_STATE_CODES } from '../config/constants.js';

/**
 * @param {Object} params
 * @param {Object} params.return3b   - Gstr3bReturn document
 * @param {Object} params.business   - Business document { gstin, legalName, stateCode }
 * @param {Object} params.comparison - Output from compareEngine.compare3bVsPortal()
 * @param {string} params.outputFilePath - Absolute path to write the .xlsx file
 * @returns {string} outputFilePath
 */
export function generateGstr3bExcel({ return3b, business, comparison, outputFilePath }) {
  const wb = xlsx.utils.book_new();
  const period = return3b.period || '';
  const mm = period.substring(0, 2);
  const yyyy = period.substring(2);
  const periodLabel = `${mm}/${yyyy}`;

  const r = (paise) => toRupees(paise ?? 0);

  // ── Sheet 1: Cover ──────────────────────────────────────────────────────
  const coverRows = [
    ['GSTR-3B Summary Report'],
    [],
    ['Business Name', business.legalName || ''],
    ['GSTIN',         business.gstin || ''],
    ['State',         GST_STATE_CODES[business.stateCode] || ''],
    ['Tax Period',    periodLabel],
    ['Return Status', return3b.status || 'DRAFT'],
    ['Generated At',  new Date().toLocaleString('en-IN')],
    [],
    ['⚠ This is a preparation aid only. File on the GST Portal. Have your CA review before filing.'],
  ];
  const wsCover = xlsx.utils.aoa_to_sheet(coverRows);
  wsCover['!cols'] = [{ wch: 25 }, { wch: 45 }];
  xlsx.utils.book_append_sheet(wb, wsCover, 'Cover');

  // ── Sheet 2: Table_3.1 Outward Supplies ────────────────────────────────
  const t31 = return3b.table31 || {};
  const t31Rows = [
    ['Table 3.1 — Details of Outward Supplies and Inward Supplies liable to Reverse Charge'],
    [],
    ['Sub-table', 'Description', 'Taxable Value (₹)', 'IGST (₹)', 'CGST (₹)', 'SGST (₹)', 'Cess (₹)'],
    ['3.1(a)', 'Outward taxable supplies (excluding zero rated, nil, exempt)',
      r(t31.outward_taxable?.taxableValuePaise),
      r(t31.outward_taxable?.igstPaise),
      r(t31.outward_taxable?.cgstPaise),
      r(t31.outward_taxable?.sgstPaise),
      r(t31.outward_taxable?.cessPaise)],
    ['3.1(b)', 'Outward taxable supplies (zero rated)',
      r(t31.outward_zero_rated?.taxableValuePaise),
      r(t31.outward_zero_rated?.igstPaise), '', '', r(t31.outward_zero_rated?.cessPaise)],
    ['3.1(c)', 'Other outward supplies (Nil rated, exempted)',
      r(t31.outward_nil_exempt?.taxableValuePaise), '', '', '', ''],
    ['3.1(d)', 'Inward supplies (liable to reverse charge)',
      r(t31.inward_reverse_charge?.taxableValuePaise),
      r(t31.inward_reverse_charge?.igstPaise),
      r(t31.inward_reverse_charge?.cgstPaise),
      r(t31.inward_reverse_charge?.sgstPaise),
      r(t31.inward_reverse_charge?.cessPaise)],
    ['3.1(e)', 'Non-GST outward supplies',
      r(t31.non_gst_outward?.taxableValuePaise), '', '', '', ''],
  ];
  const wsT31 = xlsx.utils.aoa_to_sheet(t31Rows);
  wsT31['!cols'] = [{ wch: 10 }, { wch: 52 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
  xlsx.utils.book_append_sheet(wb, wsT31, 'Table_3.1');

  // ── Sheet 3: Table_3.2 Inter-State ─────────────────────────────────────
  const t32 = return3b.table32 || {};
  const t32Rows = [
    ['Table 3.2 — Inter-State Supplies to Unregistered Persons (by Place of Supply)'],
    ['Note: Portal auto-fills this from your GSTR-1. Use this sheet to verify accuracy.'],
    [],
    ['POS Code', 'State Name', 'Taxable Value (₹)', 'IGST (₹)'],
  ];
  let t32Total = { txval: 0, igst: 0 };
  for (const row of (t32.supplies_unregistered || [])) {
    t32Total.txval += r(row.taxableValuePaise);
    t32Total.igst  += r(row.igstPaise);
    t32Rows.push([
      row.pos,
      row.posName || GST_STATE_CODES[row.pos] || '',
      r(row.taxableValuePaise),
      r(row.igstPaise),
    ]);
  }
  t32Rows.push(['', 'TOTAL', t32Total.txval, t32Total.igst]);
  const wsT32 = xlsx.utils.aoa_to_sheet(t32Rows);
  wsT32['!cols'] = [{ wch: 10 }, { wch: 35 }, { wch: 22 }, { wch: 16 }];
  xlsx.utils.book_append_sheet(wb, wsT32, 'Table_3.2');

  // ── Sheet 4: Table_4_ITC ───────────────────────────────────────────────
  const t4 = return3b.table4 || {};
  const t4Rows = [
    ['Table 4 — Eligible Input Tax Credit (from GSTR-2B)'],
    [],
    ['Section', 'Description', 'IGST (₹)', 'CGST (₹)', 'SGST (₹)', 'Cess (₹)'],
    ['4(A)(3)', 'Inward supplies liable to RCM',
      r(t4.itc_available?.inward_reverse_charge?.igstPaise),
      r(t4.itc_available?.inward_reverse_charge?.cgstPaise),
      r(t4.itc_available?.inward_reverse_charge?.sgstPaise),
      r(t4.itc_available?.inward_reverse_charge?.cessPaise)],
    ['4(A)(5)', 'All other ITC (incl. marketplace fee invoices)',
      r(t4.itc_available?.all_other_itc?.igstPaise),
      r(t4.itc_available?.all_other_itc?.cgstPaise),
      r(t4.itc_available?.all_other_itc?.sgstPaise),
      r(t4.itc_available?.all_other_itc?.cessPaise)],
    ['4(B)(1)', 'ITC Reversed — as per Rules 38/42/43',
      r(t4.itc_reversed?.as_per_rules?.igstPaise),
      r(t4.itc_reversed?.as_per_rules?.cgstPaise),
      r(t4.itc_reversed?.as_per_rules?.sgstPaise),
      r(t4.itc_reversed?.as_per_rules?.cessPaise)],
    ['4(B)(2)', 'ITC Reversed — Others',
      r(t4.itc_reversed?.others?.igstPaise),
      r(t4.itc_reversed?.others?.cgstPaise),
      r(t4.itc_reversed?.others?.sgstPaise),
      r(t4.itc_reversed?.others?.cessPaise)],
    ['4(C)', 'Net ITC Available [4(A) - 4(B)]',
      r(t4.net_itc?.igstPaise),
      r(t4.net_itc?.cgstPaise),
      r(t4.net_itc?.sgstPaise),
      r(t4.net_itc?.cessPaise)],
    ['4(D)(1)', 'Ineligible ITC — Section 17(5)',
      r(t4.ineligible_itc?.as_per_section_17_5?.igstPaise),
      r(t4.ineligible_itc?.as_per_section_17_5?.cgstPaise),
      r(t4.ineligible_itc?.as_per_section_17_5?.sgstPaise),
      r(t4.ineligible_itc?.as_per_section_17_5?.cessPaise)],
    ['4(D)(2)', 'Ineligible ITC — Others',
      r(t4.ineligible_itc?.others?.igstPaise),
      r(t4.ineligible_itc?.others?.cgstPaise),
      r(t4.ineligible_itc?.others?.sgstPaise),
      r(t4.ineligible_itc?.others?.cessPaise)],
  ];
  const wsT4 = xlsx.utils.aoa_to_sheet(t4Rows);
  wsT4['!cols'] = [{ wch: 10 }, { wch: 48 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
  xlsx.utils.book_append_sheet(wb, wsT4, 'Table_4_ITC');

  // ── Sheet 5: Set-Off & Net Payable ─────────────────────────────────────
  const t6 = return3b.table6 || {};
  const so = t6.paid_through_itc || {};
  const setOffRows = [
    ['Table 6 — Payment of Tax (Set-Off Matrix & Net Cash Payable)'],
    ['Note: This is an ESTIMATE. Actual set-off may differ. Verify on the GST Portal.'],
    [],
    ['Item', 'IGST (₹)', 'CGST (₹)', 'SGST (₹)', 'Cess (₹)'],
    ['(A) Tax Payable on Outward Supplies',
      r(t6.tax_payable?.igstPaise), r(t6.tax_payable?.cgstPaise),
      r(t6.tax_payable?.sgstPaise), r(t6.tax_payable?.cessPaise)],
    [],
    ['ITC Set-Off Utilization:'],
    ['IGST credit used for IGST', r(so.igst_used_for_igst), '', '', ''],
    ['IGST credit used for CGST', '', r(so.igst_used_for_cgst), '', ''],
    ['IGST credit used for SGST', '', '', r(so.igst_used_for_sgst), ''],
    ['CGST credit used for CGST', '', r(so.cgst_used_for_cgst), '', ''],
    ['CGST credit used for IGST', r(so.cgst_used_for_igst), '', '', ''],
    ['SGST credit used for SGST', '', '', r(so.sgst_used_for_sgst), ''],
    ['SGST credit used for IGST', r(so.sgst_used_for_igst), '', '', ''],
    ['Cess credit used for Cess', '', '', '', r(so.cess_used_for_cess)],
    [],
    ['(B) Cash Ledger / TCS Credits Used',
      r(t6.cash_ledger_used?.igstPaise), r(t6.cash_ledger_used?.cgstPaise),
      r(t6.cash_ledger_used?.sgstPaise), r(t6.cash_ledger_used?.cessPaise)],
    [],
    ['NET CASH TO DEPOSIT →',
      r(t6.net_cash_payable?.igstPaise), r(t6.net_cash_payable?.cgstPaise),
      r(t6.net_cash_payable?.sgstPaise), r(t6.net_cash_payable?.cessPaise)],
  ];
  const wsSetOff = xlsx.utils.aoa_to_sheet(setOffRows);
  wsSetOff['!cols'] = [{ wch: 42 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
  xlsx.utils.book_append_sheet(wb, wsSetOff, 'Set-Off');

  // ── Sheet 6: Comparison / Reconciliation ──────────────────────────────
  if (comparison && comparison.diffs && comparison.diffs.length > 0) {
    const compRows = [
      ['GSTR-1 vs Portal 3B — Reconciliation Report'],
      [`Portal Source: ${comparison.portalSource || 'N/A'}`, `Reconciled At: ${comparison.summary?.reconciledAt || ''}`],
      [`Total Fields: ${comparison.summary?.totalFields || 0}`, `Matched: ${comparison.summary?.matched || 0}`, `Mismatched: ${comparison.summary?.mismatched || 0}`],
      [],
      ['Table', 'Field', 'Description', 'Our Tool (₹)', 'Portal (₹)', 'Difference (₹)', 'Status'],
    ];
    for (const diff of (comparison.diffs || [])) {
      compRows.push([
        diff.table,
        diff.field,
        diff.label,
        diff.toolValueRupees,
        diff.portalValueRupees,
        diff.diffRupees,
        diff.isMatch ? '✅ MATCH' : '❌ MISMATCH',
      ]);
    }
    const wsComp = xlsx.utils.aoa_to_sheet(compRows);
    wsComp['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 40 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 14 }];
    xlsx.utils.book_append_sheet(wb, wsComp, 'Comparison');
  }

  xlsx.writeFile(wb, outputFilePath);
  return outputFilePath;
}
