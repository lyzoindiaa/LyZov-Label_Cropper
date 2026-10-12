/**
 * outwardEngine.js
 *
 * Computes Table 3.1 of GSTR-3B from statutory GSTR-1 aggregated results.
 * Table 3.1(a): Outward taxable supplies (other than zero rated, nil rated and exempted)
 * Table 3.1(b): Outward taxable supplies (zero rated)
 * Table 3.1(c): Other outward supplies (Nil rated, exempted)
 * Table 3.1(d): Inward supplies liable to reverse charge
 * Table 3.1(e): Non-GST outward supplies
 */

import { toPaise } from '../engine/money.js';

export function computeTable31(gstr1Aggregated) {
  const totals = gstr1Aggregated?.totals || {};
  const nilInv = gstr1Aggregated?.sections?.nil?.inv || [];

  // 3.1(a) Net Outward Taxable Supplies (B2B + B2CS net of credit notes)
  const taxable31a = {
    taxableValuePaise: Math.max(0, totals.taxableValuePaise || 0),
    igstPaise: Math.max(0, totals.igstPaise || 0),
    cgstPaise: Math.max(0, totals.cgstPaise || 0),
    sgstPaise: Math.max(0, totals.sgstPaise || 0),
    cessPaise: Math.max(0, totals.cessPaise || 0),
  };

  // 3.1(b) Zero rated (Exports / SEZ) - default 0 for domestic ecommerce
  const zeroRated31b = {
    taxableValuePaise: 0,
    igstPaise: 0,
    cessPaise: 0,
  };

  // 3.1(c) Other Outward Supplies (Nil rated and Exempted)
  let nilExemptPaise = 0;
  let nonGstPaise = 0;

  for (const item of nilInv) {
    nilExemptPaise += toPaise(item.nil_amt || 0) + toPaise(item.expt_amt || 0);
    nonGstPaise += toPaise(item.ngsup_amt || 0);
  }

  const nilExempt31c = {
    taxableValuePaise: nilExemptPaise,
  };

  // 3.1(d) Inward Supplies liable to Reverse Charge (RCM)
  const inwardRcm31d = {
    taxableValuePaise: 0,
    igstPaise: 0,
    cgstPaise: 0,
    sgstPaise: 0,
    cessPaise: 0,
  };

  // 3.1(e) Non-GST Outward Supplies
  const nonGst31e = {
    taxableValuePaise: nonGstPaise,
  };

  return {
    outward_taxable: taxable31a,
    outward_zero_rated: zeroRated31b,
    outward_nil_exempt: nilExempt31c,
    inward_reverse_charge: inwardRcm31d,
    non_gst_outward: nonGst31e,
  };
}
