import { validateGSTIN } from './src/config/constants.js';
import { calculateTaxSplit } from './src/engine/taxSplitter.js';
import { classifyOrderLine } from './src/engine/classifier.js';
import { aggregateGstr1 } from './src/engine/aggregator.js';
import { generateGstr1Json } from './src/exporters/jsonExporter.js';
import { generateGstr1Excel } from './src/exporters/excelExporter.js';
import { toPaise } from './src/engine/money.js';

console.log('--- 1. Testing GSTIN Validation ---');
const gstinResult = validateGSTIN('29AABCU9603R1ZX');
console.log('29AABCU9603R1ZX:', gstinResult);

console.log('\n--- 2. Testing Tax Splitter ---');
const intra = calculateTaxSplit({ taxableValuePaise: 100000, gstRate: 18, sellerStateCode: '29', placeOfSupply: '29' });
console.log('Intra-state (KA -> KA):', intra);
const inter = calculateTaxSplit({ taxableValuePaise: 100000, gstRate: 18, sellerStateCode: '29', placeOfSupply: '27' });
console.log('Inter-state (KA -> MH):', inter);

console.log('\n--- 3. Testing Sample Aggregation & Exporters ---');
const sampleLines = [
  // B2B sale to registered buyer in MH
  {
    platform: 'amazon',
    orderId: '402-1234567-0001',
    invoiceNumber: 'INV-2026-001',
    invoiceDate: new Date('2026-09-05'),
    type: 'sale',
    buyerGstin: '27AABCU9603R1ZX',
    shipFromState: '29',
    placeOfSupply: '27',
    hsn: '8517',
    description: 'Wireless Bluetooth Headset',
    quantity: 2,
    uqc: 'NOS',
    taxableValuePaise: 250000, // 2,500.00
    gstRate: 18,
    igstPaise: 45000,
    cgstPaise: 0,
    sgstPaise: 0,
    cessPaise: 0,
    invoiceValuePaise: 295000,
    platformGstin: '29AABCA0027R1ZW',
    sourceRow: 2,
  },
  // B2CS sale to consumer in KA (intra-state)
  {
    platform: 'flipkart',
    orderId: 'OD1234567890',
    invoiceNumber: 'FK-2026-002',
    invoiceDate: new Date('2026-09-12'),
    type: 'sale',
    buyerGstin: '',
    shipFromState: '29',
    placeOfSupply: '29',
    hsn: '8518',
    description: 'Portable Speaker',
    quantity: 1,
    uqc: 'NOS',
    taxableValuePaise: 120000, // 1,200.00
    gstRate: 18,
    igstPaise: 0,
    cgstPaise: 10800,
    sgstPaise: 10800,
    cessPaise: 0,
    invoiceValuePaise: 141600,
    platformGstin: '29AAACF1479P1ZU',
    sourceRow: 3,
  },
  // Return for B2CS in KA
  {
    platform: 'amazon',
    orderId: '402-1234567-0003',
    invoiceNumber: 'CR-2026-003',
    invoiceDate: new Date('2026-09-20'),
    type: 'return',
    buyerGstin: '',
    shipFromState: '29',
    placeOfSupply: '29',
    hsn: '8518',
    description: 'Portable Speaker Return',
    quantity: 1,
    uqc: 'NOS',
    taxableValuePaise: 120000,
    gstRate: 18,
    igstPaise: 0,
    cgstPaise: 10800,
    sgstPaise: 10800,
    cessPaise: 0,
    invoiceValuePaise: 141600,
    platformGstin: '29AABCA0027R1ZW',
    sourceRow: 4,
  }
];

const aggregated = aggregateGstr1(sampleLines, '29', 'Sunrise Traders');
console.log('Aggregated Totals:', JSON.stringify(aggregated.totals, null, 2));
console.log('Section Counts:', aggregated.sectionCounts);

const { payload } = generateGstr1Json({
  gstin: '29AABCU9603R1ZX',
  period: '092026',
  aggregatedData: aggregated,
  outputFilePath: './uploads/test_gstr1.json',
});
console.log('✓ GSTR-1 JSON Generated successfully (keys):', Object.keys(payload));

generateGstr1Excel({
  gstin: '29AABCU9603R1ZX',
  period: '092026',
  aggregatedData: aggregated,
  outputFilePath: './uploads/test_gstr1.xlsx',
});
console.log('✓ GSTR-1 Excel Generated successfully at ./uploads/test_gstr1.xlsx');
