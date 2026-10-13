/**
 * itcEngine.js
 *
 * Phase 4: ITC Engine — computes GSTR-3B Table 4 from a parsed GSTR-2B upload.
 *
 * Table 4 breakdown:
 *   4(A) ITC Available:
 *     (1) Import of Goods
 *     (2) Import of Services
 *     (3) Inward supplies liable to RCM
 *     (4) Inward supplies from ISD
 *     (5) All other ITC (regular B2B + marketplace fees)
 *   4(B) ITC Reversed:
 *     (1) As per Rules 38, 42, 43 etc.
 *     (2) Others
 *   4(C) Net ITC Available = 4(A) - 4(B)
 *   4(D) Ineligible ITC:
 *     (1) As per Section 17(5) blocked credits
 *     (2) Others
 *
 * User decisions (eligibility overrides) from Gstr2bUpload.invoices[].eligibility
 * are applied here — ELIGIBLE goes to 4(A), INELIGIBLE to 4(D), REVERSED to 4(B).
 */

/**
 * @param {Array} invoices - Array of invoice objects from Gstr2bUpload model
 *   Each invoice must have: { igstPaise, cgstPaise, sgstPaise, cessPaise, eligibility, reverseCharge }
 * @returns {{ table4: Object, summary: Object }}
 */
export function computeTable4(invoices) {
  const zero = () => ({ igstPaise: 0, cgstPaise: 0, sgstPaise: 0, cessPaise: 0 });

  // 4(A)(3) RCM inward
  const rcm         = zero();
  // 4(A)(5) All other ITC (regular B2B + marketplace fees)
  const otherItc    = zero();
  // 4(B)(1) Reversed - as per rules
  const reversedRules = zero();
  // 4(B)(2) Reversed - others
  const reversedOthers = zero();
  // 4(D)(1) Ineligible Sec 17(5)
  const ineligible175 = zero();
  // 4(D)(2) Ineligible - others
  const ineligibleOthers = zero();

  for (const inv of invoices) {
    const igst = inv.igstPaise ?? 0;
    const cgst = inv.cgstPaise ?? 0;
    const sgst = inv.sgstPaise ?? 0;
    const cess = inv.cessPaise ?? 0;

    const bucket = String(inv.eligibility || 'ELIGIBLE').toUpperCase();

    if (bucket === 'ELIGIBLE') {
      if (inv.reverseCharge) {
        addTo(rcm, igst, cgst, sgst, cess);
      } else {
        addTo(otherItc, igst, cgst, sgst, cess);
      }
    } else if (bucket === 'REVERSED') {
      addTo(reversedRules, igst, cgst, sgst, cess);
    } else if (bucket === 'INELIGIBLE') {
      const reason = String(inv.ineligibilityReason || '').toLowerCase();
      if (reason.includes('17(5)') || reason.includes('section 17')) {
        addTo(ineligible175, igst, cgst, sgst, cess);
      } else {
        addTo(ineligibleOthers, igst, cgst, sgst, cess);
      }
    }
  }

  // Total 4(A)
  const totalAvailable = {
    igstPaise: rcm.igstPaise + otherItc.igstPaise,
    cgstPaise: rcm.cgstPaise + otherItc.cgstPaise,
    sgstPaise: rcm.sgstPaise + otherItc.sgstPaise,
    cessPaise: rcm.cessPaise + otherItc.cessPaise,
  };

  // Total 4(B)
  const totalReversed = {
    igstPaise: reversedRules.igstPaise + reversedOthers.igstPaise,
    cgstPaise: reversedRules.cgstPaise + reversedOthers.cgstPaise,
    sgstPaise: reversedRules.sgstPaise + reversedOthers.sgstPaise,
    cessPaise: reversedRules.cessPaise + reversedOthers.cessPaise,
  };

  // 4(C) Net ITC = 4(A) - 4(B)
  const netItc = {
    igstPaise: totalAvailable.igstPaise - totalReversed.igstPaise,
    cgstPaise: totalAvailable.cgstPaise - totalReversed.cgstPaise,
    sgstPaise: totalAvailable.sgstPaise - totalReversed.sgstPaise,
    cessPaise: totalAvailable.cessPaise - totalReversed.cessPaise,
  };

  const table4 = {
    itc_available: {
      import_goods:      zero(),   // Phase 1: Not applicable for domestic e-com
      import_services:   zero(),   // Phase 1: Not applicable for domestic e-com
      inward_reverse_charge: rcm,
      inward_isd:        zero(),
      all_other_itc:     otherItc,
    },
    itc_reversed: {
      as_per_rules: reversedRules,
      others:       reversedOthers,
    },
    net_itc: netItc,
    ineligible_itc: {
      as_per_section_17_5: ineligible175,
      others:              ineligibleOthers,
    },
  };

  return {
    table4,
    summary: {
      totalAvailableIgstPaise: totalAvailable.igstPaise,
      totalAvailableCgstPaise: totalAvailable.cgstPaise,
      totalAvailableSgstPaise: totalAvailable.sgstPaise,
      totalAvailableCessPaise: totalAvailable.cessPaise,
      netIgstPaise: netItc.igstPaise,
      netCgstPaise: netItc.cgstPaise,
      netSgstPaise: netItc.sgstPaise,
      netCessPaise: netItc.cessPaise,
    },
  };
}

function addTo(bucket, igst, cgst, sgst, cess) {
  bucket.igstPaise += igst;
  bucket.cgstPaise += cgst;
  bucket.sgstPaise += sgst;
  bucket.cessPaise += cess;
}
