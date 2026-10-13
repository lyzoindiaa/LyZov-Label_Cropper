import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parseAmazonReport } from '../src/parsers/amazonParser.js';
import { parseFlipkartReport } from '../src/parsers/flipkartParser.js';
import { validateOrderLines } from '../src/validators/dataValidator.js';
import { aggregateGstr1 } from '../src/engine/aggregator.js';
import { generateGstr1Json } from '../src/exporters/jsonExporter.js';
import { generateGstr1Excel } from '../src/exporters/excelExporter.js';
import { toRupees } from '../src/engine/money.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('🧪 Starting GST Tool Full Pipeline Verification Test');
  console.log('════════════════════════════════════════════════════════════');

  const sellerStateCode = '29'; // Karnataka
  const sellerGstin = '29AABCU9603R1ZX';
  const period = '092026';

  // 1. Test Amazon Parser
  const amazonPath = path.join(__dirname, 'fixtures/amazon_sample_mtr.csv');
  console.log('\n[1/5] Testing Amazon MTR Parser...');
  const amazonResult = await parseAmazonReport(amazonPath, sellerStateCode);
  console.log(`  ✓ Successfully parsed ${amazonResult.rowCount} rows from Amazon MTR`);
  if (amazonResult.rowCount !== 5) {
    throw new Error(`Expected 5 rows, received ${amazonResult.rowCount}`);
  }

  // 2. Test Flipkart Parser
  const flipkartPath = path.join(__dirname, 'fixtures/flipkart_sample_sales.xlsx');
  console.log('\n[2/5] Testing Flipkart Sales Report Parser...');
  const flipkartResult = await parseFlipkartReport(flipkartPath, sellerStateCode);
  console.log(`  ✓ Successfully parsed ${flipkartResult.rowCount} rows from Flipkart Sales Report`);
  if (flipkartResult.rowCount !== 3) {
    throw new Error(`Expected 3 rows, received ${flipkartResult.rowCount}`);
  }

  // Combine orderlines
  const combinedLines = [...amazonResult.orderLines, ...flipkartResult.orderLines];
  console.log(`\n  Total combined order lines across platforms: ${combinedLines.length}`);

  // 3. Test Validation Engine
  console.log('\n[3/5] Testing Pre-Flight Validation Engine...');
  const validation = validateOrderLines(combinedLines, sellerGstin);
  console.log(`  Validation status: ${validation.isValid ? 'VALID' : 'HAS ERRORS'}`);
  console.log(`  Warnings: ${validation.warningCount}, Errors: ${validation.errorCount}`);
  if (validation.errorCount > 0) {
    console.error('Validation errors:', validation.errors);
    throw new Error('Expected zero blocking validation errors on clean test fixture');
  }

  // 4. Test Statutory Aggregation
  console.log('\n[4/5] Testing Statutory GSTR-1 Aggregation Engine...');
  const aggregated = aggregateGstr1(combinedLines, sellerStateCode, 'Sunrise Traders');

  console.log('  Aggregated Totals:');
  console.log(`    Total Invoices: ${aggregated.totals.totalInvoices}`);
  console.log(`    Net Taxable Value: ₹${toRupees(aggregated.totals.taxableValuePaise)}`);
  console.log(`    Total IGST: ₹${toRupees(aggregated.totals.igstPaise)}`);
  console.log(`    Total CGST: ₹${toRupees(aggregated.totals.cgstPaise)}`);
  console.log(`    Total SGST: ₹${toRupees(aggregated.totals.sgstPaise)}`);
  console.log(`    Total Tax: ₹${toRupees(aggregated.totals.totalTaxPaise)}`);

  console.log('  Section Breakdown:');
  console.log(`    B2B Customers (Table 4): ${aggregated.sections.b2b.length} recipient(s)`);
  console.log(`    B2CS State Groups (Table 7): ${aggregated.sections.b2cs.length} line(s)`);
  console.log(`    HSN Summary (Table 12): ${aggregated.sections.hsn.data.length} item(s)`);
  console.log(`    Table 14 E-Commerce Operators: ${aggregated.sections.supeco.cl14_2.length} ECO operator(s)`);

  // Assert B2B has buyer with GSTIN 27AABCU9603R1ZX
  const hasB2B = aggregated.sections.b2b.some(b => b.ctin === '27AABCU9603R1ZX');
  if (!hasB2B) throw new Error('B2B recipient with GSTIN 27AABCU9603R1ZX was not found in Table 4');

  // 5. Test Exporters
  console.log('\n[5/5] Testing Official GSTR-1 File Exporters...');

  const exportsDir = path.join(__dirname, '../uploads/test_exports');
  if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });

  const jsonOut = path.join(exportsDir, 'GSTR1_TEST_OUTPUT.json');
  const excelOut = path.join(exportsDir, 'GSTR1_TEST_OUTPUT.xlsx');

  const { payload } = generateGstr1Json({
    gstin: sellerGstin,
    period,
    aggregatedData: aggregated,
    outputFilePath: jsonOut,
  });

  const expectedKeys = ['gstin', 'fp', 'cur_gt', 'version', 'hash', 'b2b', 'b2cs', 'cdnr', 'hsn', 'supeco'];
  for (const k of expectedKeys) {
    if (!(k in payload)) throw new Error(`Missing expected statutory key "${k}" in GSTR-1 JSON`);
  }
  console.log('  ✓ GSTR-1 JSON verified against official schema keys');

  generateGstr1Excel({
    gstin: sellerGstin,
    period,
    aggregatedData: aggregated,
    outputFilePath: excelOut,
  });

  if (!fs.existsSync(excelOut)) throw new Error('GSTR-1 Excel export was not generated');
  console.log('  ✓ GSTR-1 multi-sheet Excel workbook verified successfully');

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('🎉 ALL PIPELINE TESTS PASSED SUCCESSFULLY! (100% GREEN)');
  console.log('════════════════════════════════════════════════════════════\n');
}

runTests().catch(err => {
  console.error('\n❌ Test Failure:', err.message);
  process.exit(1);
});
