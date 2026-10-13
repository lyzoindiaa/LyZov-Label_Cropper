/**
 * offsetEngine.js
 *
 * Phase 5: Statutory GST Set-Off Engine — computes GSTR-3B Table 5.1 & Table 6
 *
 * Implements the legally mandated GST Input Tax Credit utilization order
 * as per Section 49 of the CGST Act and CBIC circulars:
 *
 *  Step 1: IGST credit → IGST liability first
 *  Step 2: Remaining IGST credit → CGST liability
 *  Step 3: Remaining IGST credit → SGST liability
 *  Step 4: CGST credit → CGST liability (cannot use for SGST)
 *  Step 5: CGST credit → IGST liability (remaining CGST after CGST liability)
 *  Step 6: SGST credit → SGST liability (cannot use for CGST)
 *  Step 7: SGST credit → IGST liability (remaining SGST after SGST liability)
 *  Step 8: Cess credit → Cess liability only
 *  Step 9: Deduct TCS (Section 52) credits and electronic cash ledger balance
 *  Step 10: Remaining = net cash to deposit
 *
 * All amounts in Paise. Returns zero if liability is fully covered by ITC.
 */

/**
 * @param {Object} liability     - Tax liability from Table 3.1(a) + interest/late fee
 *   { igstPaise, cgstPaise, sgstPaise, cessPaise }
 * @param {Object} itcAvailable  - Net ITC from Table 4(C)
 *   { igstPaise, cgstPaise, sgstPaise, cessPaise }
 * @param {Object} cashLedger    - CashLedger document (from DB)
 * @returns {{ setOff: Object, table6: Object, netPayable: Object }}
 */
export function computeTable6(liability, itcAvailable, cashLedger = {}) {
  // Working copies — all mutable
  let liabilityIgst = Math.max(0, liability.igstPaise ?? 0);
  let liabilityCgst = Math.max(0, liability.cgstPaise ?? 0);
  let liabilitySgst = Math.max(0, liability.sgstPaise ?? 0);
  let liabilityCess = Math.max(0, liability.cessPaise ?? 0);

  let creditIgst = Math.max(0, itcAvailable.igstPaise ?? 0);
  let creditCgst = Math.max(0, itcAvailable.cgstPaise ?? 0);
  let creditSgst = Math.max(0, itcAvailable.sgstPaise ?? 0);
  let creditCess = Math.max(0, itcAvailable.cessPaise ?? 0);

  const setOff = {
    igst_used_for_igst: 0,
    igst_used_for_cgst: 0,
    igst_used_for_sgst: 0,
    cgst_used_for_cgst: 0,
    cgst_used_for_igst: 0,
    sgst_used_for_sgst: 0,
    sgst_used_for_igst: 0,
    cess_used_for_cess: 0,
  };

  // Step 1: IGST credit → IGST liability
  const igstForIgst = Math.min(creditIgst, liabilityIgst);
  setOff.igst_used_for_igst = igstForIgst;
  creditIgst    -= igstForIgst;
  liabilityIgst -= igstForIgst;

  // Step 2: Remaining IGST credit → CGST liability
  const igstForCgst = Math.min(creditIgst, liabilityCgst);
  setOff.igst_used_for_cgst = igstForCgst;
  creditIgst    -= igstForCgst;
  liabilityCgst -= igstForCgst;

  // Step 3: Remaining IGST credit → SGST liability
  const igstForSgst = Math.min(creditIgst, liabilitySgst);
  setOff.igst_used_for_sgst = igstForSgst;
  creditIgst    -= igstForSgst;
  liabilitySgst -= igstForSgst;

  // Step 4: CGST credit → CGST liability
  const cgstForCgst = Math.min(creditCgst, liabilityCgst);
  setOff.cgst_used_for_cgst = cgstForCgst;
  creditCgst    -= cgstForCgst;
  liabilityCgst -= cgstForCgst;

  // Step 5: Remaining CGST credit → IGST liability
  const cgstForIgst = Math.min(creditCgst, liabilityIgst);
  setOff.cgst_used_for_igst = cgstForIgst;
  creditCgst    -= cgstForIgst;
  liabilityIgst -= cgstForIgst;

  // Step 6: SGST credit → SGST liability
  const sgstForSgst = Math.min(creditSgst, liabilitySgst);
  setOff.sgst_used_for_sgst = sgstForSgst;
  creditSgst    -= sgstForSgst;
  liabilitySgst -= sgstForSgst;

  // Step 7: Remaining SGST credit → IGST liability
  const sgstForIgst = Math.min(creditSgst, liabilityIgst);
  setOff.sgst_used_for_igst = sgstForIgst;
  creditSgst    -= sgstForIgst;
  liabilityIgst -= sgstForIgst;

  // Step 8: Cess credit → Cess liability
  const cessForCess = Math.min(creditCess, liabilityCess);
  setOff.cess_used_for_cess = cessForCess;
  liabilityCess -= cessForCess;

  // After ITC set-off, remaining amounts must be paid in cash
  // Step 9: Deduct TCS (Section 52) credits
  const tcs = cashLedger?.tcsCredits || {};
  const tcsCash = cashLedger?.cashBalance || {};

  let cashAfterTcsIgst = Math.max(0, liabilityIgst - (tcs.igstPaise ?? 0) - (tcsCash.igstPaise ?? 0));
  let cashAfterTcsCgst = Math.max(0, liabilityCgst - (tcs.cgstPaise ?? 0) - (tcsCash.cgstPaise ?? 0));
  let cashAfterTcsSgst = Math.max(0, liabilitySgst - (tcs.sgstPaise ?? 0) - (tcsCash.sgstPaise ?? 0));
  let cashAfterTcsCess = Math.max(0, liabilityCess - (tcsCash.cessPaise ?? 0));

  // Cash ledger used = whatever was consumed (not total balance, just what was needed)
  const cashLedgerUsed = {
    igstPaise: Math.min(liabilityIgst, (tcs.igstPaise ?? 0) + (tcsCash.igstPaise ?? 0)),
    cgstPaise: Math.min(liabilityCgst, (tcs.cgstPaise ?? 0) + (tcsCash.cgstPaise ?? 0)),
    sgstPaise: Math.min(liabilitySgst, (tcs.sgstPaise ?? 0) + (tcsCash.sgstPaise ?? 0)),
    cessPaise: Math.min(liabilityCess, tcsCash.cessPaise ?? 0),
  };

  const netPayable = {
    igstPaise: cashAfterTcsIgst,
    cgstPaise: cashAfterTcsCgst,
    sgstPaise: cashAfterTcsSgst,
    cessPaise: cashAfterTcsCess,
    totalPaise: cashAfterTcsIgst + cashAfterTcsCgst + cashAfterTcsSgst + cashAfterTcsCess,
  };

  const table6 = {
    tax_payable: {
      igstPaise: Math.max(0, liability.igstPaise ?? 0),
      cgstPaise: Math.max(0, liability.cgstPaise ?? 0),
      sgstPaise: Math.max(0, liability.sgstPaise ?? 0),
      cessPaise: Math.max(0, liability.cessPaise ?? 0),
    },
    paid_through_itc: setOff,
    cash_ledger_used: cashLedgerUsed,
    net_cash_payable: netPayable,
  };

  return {
    setOff,
    table6,
    netPayable,
  };
}
