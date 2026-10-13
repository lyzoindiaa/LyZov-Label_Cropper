import { validateGSTIN, VALID_GST_RATES, GST_STATE_CODES } from '../config/constants.js';
import { toRupees } from '../engine/money.js';

/**
 * Runs pre-flight audit and validation on order lines
 */
export function validateOrderLines(orderLines, sellerGstin) {
  const errors = [];
  const warnings = [];
  const invoiceMap = new Map();

  for (const line of orderLines) {
    const row = line.sourceRow;
    const platform = line.platform;

    // 1. Check duplicate invoices with differing values
    if (invoiceMap.has(line.invoiceNumber)) {
      const prev = invoiceMap.get(line.invoiceNumber);
      if (prev.platform !== line.platform) {
        warnings.push({
          type: 'WARNING',
          field: 'invoiceNumber',
          sourceRow: row,
          platform,
          message: `Invoice ${line.invoiceNumber} appears in both Amazon and Flipkart files`,
        });
      }
    } else {
      invoiceMap.set(line.invoiceNumber, line);
    }

    // 2. Validate Buyer GSTIN if present
    if (line.buyerGstin) {
      const check = validateGSTIN(line.buyerGstin);
      if (!check.valid) {
        errors.push({
          type: 'ERROR',
          field: 'buyerGstin',
          sourceRow: row,
          platform,
          message: `Row ${row}: Invalid buyer GSTIN "${line.buyerGstin}" (${check.reason})`,
        });
      } else if (line.buyerGstin === sellerGstin) {
        errors.push({
          type: 'ERROR',
          field: 'buyerGstin',
          sourceRow: row,
          platform,
          message: `Row ${row}: Buyer GSTIN cannot be identical to Seller GSTIN (${sellerGstin})`,
        });
      }
    }

    // 3. Validate State Codes
    if (!line.placeOfSupply || !GST_STATE_CODES[line.placeOfSupply]) {
      errors.push({
        type: 'ERROR',
        field: 'placeOfSupply',
        sourceRow: row,
        platform,
        message: `Row ${row}: Invalid Place of Supply state code "${line.placeOfSupply}"`,
      });
    }

    // 4. Validate GST Rate Slab
    if (!VALID_GST_RATES.includes(line.gstRate)) {
      warnings.push({
        type: 'WARNING',
        field: 'gstRate',
        sourceRow: row,
        platform,
        message: `Row ${row}: Tax rate ${line.gstRate}% is non-standard for GST`,
      });
    }

    // 5. Mutual Exclusivity: IGST vs CGST/SGST
    if (line.igstPaise > 0 && (line.cgstPaise > 0 || line.sgstPaise > 0)) {
      errors.push({
        type: 'ERROR',
        field: 'taxSplit',
        sourceRow: row,
        platform,
        message: `Row ${row}: Cannot charge IGST and CGST/SGST on the same supply`,
      });
    }

    // 6. Mathematical cross-check: Taxable Value * Rate ≈ Tax Amount (1 INR tolerance)
    if (line.taxableValuePaise > 0 && line.gstRate > 0) {
      const expectedTaxPaise = (line.taxableValuePaise * line.gstRate) / 100;
      const actualTaxPaise = line.igstPaise + line.cgstPaise + line.sgstPaise;
      const diffPaise = Math.abs(expectedTaxPaise - actualTaxPaise);

      if (diffPaise > 150) { // Discrepancy > ₹1.50
        warnings.push({
          type: 'WARNING',
          field: 'taxAmount',
          sourceRow: row,
          platform,
          message: `Row ${row}: Expected tax ₹${toRupees(expectedTaxPaise)} for ${line.gstRate}% differs from ₹${toRupees(actualTaxPaise)} (diff: ₹${toRupees(diffPaise)})`,
        });
      }
    }

    // 7. Missing HSN Code warning
    if (!line.hsn || line.hsn.trim().length < 2) {
      warnings.push({
        type: 'WARNING',
        field: 'hsn',
        sourceRow: row,
        platform,
        message: `Row ${row}: Missing or invalid HSN code for item "${line.description || line.invoiceNumber}"`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    errorCount: errors.length,
    warningCount: warnings.length,
  };
}
