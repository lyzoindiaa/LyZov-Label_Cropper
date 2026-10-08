/**
 * Validates and adjusts GST tax distribution between IGST and CGST+SGST
 */
export function calculateTaxSplit({ taxableValuePaise, gstRate, sellerStateCode, placeOfSupply }) {
  const isInterState = String(sellerStateCode) !== String(placeOfSupply);
  
  // Tax = (taxableValue * gstRate) / 100
  const totalTaxPaise = Math.round((taxableValuePaise * gstRate) / 100);

  if (isInterState) {
    return {
      isInterState: true,
      igstPaise: totalTaxPaise,
      cgstPaise: 0,
      sgstPaise: 0,
      cessPaise: 0,
      totalTaxPaise,
    };
  } else {
    // Intra-state split exactly 50/50 between CGST and SGST
    const halfTax = Math.floor(totalTaxPaise / 2);
    const remainder = totalTaxPaise % 2; // Allocate 1 paisa difference to CGST
    return {
      isInterState: false,
      igstPaise: 0,
      cgstPaise: halfTax + remainder,
      sgstPaise: halfTax,
      cessPaise: 0,
      totalTaxPaise,
    };
  }
}
