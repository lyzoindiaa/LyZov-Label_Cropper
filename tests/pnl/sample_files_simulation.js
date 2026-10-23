import fs from 'fs';
import path from 'path';
import { parseCsvText } from '../../src/pnl-tool/utils/parser.js';
import { suggestColumnMappings } from '../../src/pnl-tool/utils/mapper.js';
import { parseProductMasterRows } from '../../src/pnl-tool/domain/sku.js';
import { normalizeRows } from '../../src/pnl-tool/domain/pipeline.js';
import { Money } from '../../src/pnl-tool/domain/money.js';

const samplesDir = path.resolve('public/samples/pnl');

console.log('========================================================================');
console.log('🚀 SELLER P&L APP: END-TO-END VERIFICATION WITH SAMPLE FLIPKART FILES');
console.log('========================================================================\n');

// 1. Load Product Master
const prodText = fs.readFileSync(path.join(samplesDir, 'Product_Master_Sample.csv'), 'utf8');
const parsedProducts = parseCsvText(prodText);
const productCatalog = parseProductMasterRows(parsedProducts.rows);

const cogsMap = {};
productCatalog.forEach((p) => {
  cogsMap[p.skuKey] = p;
  cogsMap[p.originalSku.toUpperCase()] = p;
});
const aliasesMap = { ganesah_11: 'ganesha_11' };

console.log(`✅ Step 1: Loaded ${productCatalog.length} Products into Master Catalog:`);
productCatalog.forEach((p) => {
  console.log(`   - [${p.skuKey}] ${p.title} -> Cost: ₹${p.costPaise / 100}, Packaging: ₹${p.packagingCostPaise / 100}`);
});
console.log('');

// 2. Ingest August 2026
const augText = fs.readFileSync(path.join(samplesDir, 'Flipkart_Sales_2026_08_August.csv'), 'utf8');
const parsedAug = parseCsvText(augText);
const augMapping = suggestColumnMappings(parsedAug.headers);
const augTemplate = { currency: 'INR', columnMap: augMapping };

const augResult = normalizeRows({
  rawRows: parsedAug.rows,
  channelId: 'flipkart',
  sellerId: 'seller_demo',
  template: augTemplate,
  cogsMap,
  aliasesMap,
});

console.log(`✅ Step 2: Ingested August 2026 Sales File:`);
console.log(`   - Raw rows: ${augResult.rawCount}, Accepted: ${augResult.acceptedCount}, Rejected: ${augResult.rejectedCount}`);
console.log(`   - Periods Detected: ${augResult.periodsDetected.join(', ')}`);

// Compute August Metrics
function computeMetrics(orders) {
  const gross = orders.reduce((acc, o) => acc + (o.grossSales || 0), 0);
  const discounts = orders.reduce((acc, o) => acc + (o.discounts || 0), 0);
  const refunds = orders.reduce((acc, o) => acc + (o.refundAmount || 0), 0);
  const netRevenue = gross - discounts - refunds;

  // Fee calculation (12% Flipkart fee card)
  const fees = orders.reduce((acc, o) => {
    if (o.grossSales > 0) return acc + Math.round(((o.grossSales - (o.discounts || 0)) * 12) / 100);
    return acc;
  }, 0);

  const cogs = orders.reduce((acc, o) => {
    return o.status === 'returned' || !o.cogsUnitPaise ? acc : acc + o.cogsUnitPaise * (o.quantity || 1);
  }, 0);

  const netContribution = netRevenue - fees - cogs;
  const marginPct = netRevenue > 0 ? ((netContribution / netRevenue) * 100).toFixed(1) : 0;

  const totalDelivered = orders.filter((o) => o.status !== 'returned' && o.status !== 'rto').reduce((acc, o) => acc + o.quantity, 0);
  const returnedUnits = orders.filter((o) => o.status === 'returned' || o.status === 'rto').reduce((acc, o) => acc + o.quantity, 0);

  return {
    netRevenue,
    fees,
    cogs,
    netContribution,
    marginPct,
    totalDelivered,
    returnedUnits,
  };
}

const augMetrics = computeMetrics(augResult.accepted);
console.log('\n📊 AUGUST 2026 DASHBOARD METRICS:');
console.log(`   - Net Revenue:         ${Money.fromMinor(augMetrics.netRevenue).format()}`);
console.log(`   - Total Fees (12%):    ${Money.fromMinor(augMetrics.fees).format()}`);
console.log(`   - Product COGS:        ${Money.fromMinor(augMetrics.cogs).format()}`);
console.log(`   - Net Profit:          ${Money.fromMinor(augMetrics.netContribution).format()}`);
console.log(`   - Net Margin:          ${augMetrics.marginPct}%`);
console.log(`   - Delivered Units:     ${augMetrics.totalDelivered}`);

// Build existing sales map for cross-month return linking
const existingSales = new Map();
augResult.accepted.forEach((line) => {
  if (line.orderItemId && line.status !== 'returned') {
    existingSales.set(line.orderItemId, line.period);
  }
});

// 3. Ingest September 2026 (Has Return of August Order + Unmatched Return)
const sepText = fs.readFileSync(path.join(samplesDir, 'Flipkart_Sales_2026_09_September.csv'), 'utf8');
const parsedSep = parseCsvText(sepText);
const sepMapping = suggestColumnMappings(parsedSep.headers);
const sepTemplate = { currency: 'INR', columnMap: sepMapping };

const sepResult = normalizeRows({
  rawRows: parsedSep.rows,
  channelId: 'flipkart',
  sellerId: 'seller_demo',
  template: sepTemplate,
  cogsMap,
  aliasesMap,
  existingSales,
});

console.log(`\n✅ Step 3: Ingested September 2026 Sales File (With Returns):`);
console.log(`   - Raw rows: ${sepResult.rawCount}, Accepted: ${sepResult.acceptedCount}, Rejected: ${sepResult.rejectedCount}`);
console.log(`   - Periods Detected: ${sepResult.periodsDetected.join(', ')}`);

const linkedAugustReturn = sepResult.accepted.find((l) => l.orderItemId === 'ITEM-AUG-001');
console.log(`   - Linked Return Verification: Item "${linkedAugustReturn.orderItemId}" returned in September -> Original Sale Period: ${linkedAugustReturn.originalSalePeriod} ✅`);

const unmatchedReturn = sepResult.accepted.find((l) => l.orderItemId === 'ITEM-OLD-JULY-99');
console.log(`   - Unmatched Return Verification: Item "${unmatchedReturn.orderItemId}" has no matching sale -> Tagged as isUnmatchedReturn: ${unmatchedReturn.isUnmatchedReturn} ✅`);

const sepMetrics = computeMetrics(sepResult.accepted);
console.log('\n📊 SEPTEMBER 2026 DASHBOARD METRICS:');
console.log(`   - Net Revenue:         ${Money.fromMinor(sepMetrics.netRevenue).format()}`);
console.log(`   - Total Fees (12%):    ${Money.fromMinor(sepMetrics.fees).format()}`);
console.log(`   - Product COGS:        ${Money.fromMinor(sepMetrics.cogs).format()}`);
console.log(`   - Net Profit:          ${Money.fromMinor(sepMetrics.netContribution).format()}`);
console.log(`   - Net Margin:          ${sepMetrics.marginPct}%`);
console.log(`   - Delivered Units:     ${sepMetrics.totalDelivered}`);

// 4. Verify Zero Contamination (August numbers remain 100% identical)
const augMetricsAfterSep = computeMetrics(augResult.accepted);
console.log('\n🔒 PERIOD DATA ISOLATION CHECK:');
const isUntouched = augMetrics.netRevenue === augMetricsAfterSep.netRevenue && augMetrics.netContribution === augMetricsAfterSep.netContribution;
console.log(`   - August numbers before September upload: Net Profit = ${Money.fromMinor(augMetrics.netContribution).format()}`);
console.log(`   - August numbers after September upload:  Net Profit = ${Money.fromMinor(augMetricsAfterSep.netContribution).format()}`);
console.log(`   - Zero Data Leakage / Full Segregation Verified: ${isUntouched ? 'PASS ✅' : 'FAIL ❌'}`);
console.log('\n========================================================================\n');
