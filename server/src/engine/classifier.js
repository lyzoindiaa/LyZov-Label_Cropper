import { validateGSTIN } from '../config/constants.js';

export const GSTR1_SECTIONS = {
  B2B: 'b2b',       // Table 4: Taxable outward supplies to registered persons
  B2CL: 'b2cl',     // Table 5: Large outward supplies to unregistered persons (>2.5L inter-state)
  B2CS: 'b2cs',     // Table 7: Small outward supplies to unregistered persons
  CDNR: 'cdnr',     // Table 9B: Credit/Debit Notes to Registered Persons
  CDNUR: 'cdnur',   // Table 9B: Credit/Debit Notes to Unregistered Persons
  HSN: 'hsn',       // Table 12: HSN-wise summary of outward supplies
  DOC_ISSUE: 'doc', // Table 13: Documents issued during the tax period
  SUPECO: 'supeco'  // Table 14: Supplies made through E-Commerce Operator (Sec 52)
};

/**
 * Classifies an order line into its statutory GSTR-1 category
 */
export function classifyOrderLine(line, sellerStateCode) {
  const hasBuyerGstin = Boolean(line.buyerGstin && line.buyerGstin.trim().length === 15);
  const isValidBuyerGstin = hasBuyerGstin ? validateGSTIN(line.buyerGstin).valid : false;
  
  const isInterState = line.placeOfSupply !== sellerStateCode;
  const isReturn = line.type === 'return';
  const taxableInr = line.taxableValuePaise / 100;

  let section = GSTR1_SECTIONS.B2CS;

  if (isReturn) {
    if (isValidBuyerGstin) {
      section = GSTR1_SECTIONS.CDNR;
    } else {
      // For ecommerce unregistered buyers, returns are either CDNUR (if large inter-state) or netted in B2CS
      if (isInterState && taxableInr > 250000) {
        section = GSTR1_SECTIONS.CDNUR;
      } else {
        section = GSTR1_SECTIONS.B2CS; // Net negative in B2CS summary
      }
    }
  } else {
    // Normal sale
    if (isValidBuyerGstin) {
      section = GSTR1_SECTIONS.B2B;
    } else if (isInterState && taxableInr > 250000) {
      section = GSTR1_SECTIONS.B2CL;
    } else {
      section = GSTR1_SECTIONS.B2CS;
    }
  }

  return {
    section,
    isB2B: isValidBuyerGstin,
    isReturn,
    isInterState,
    qualifiesForTable14: Boolean(line.platformGstin),
    qualifiesForHsn: Boolean(line.hsn && line.hsn.trim().length >= 2),
  };
}
