import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'os';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { parseFlipkartReport } from '../src/parsers/flipkartParser.js';
import { aggregateGstr1 } from '../src/engine/aggregator.js';

const SALES_HDR = ['Order ID', 'Order Item ID', 'HSN Code', 'Event Type', 'Event Sub Type', 'Item Quantity',
  'Order Shipped From (State)', 'Taxable Value (Final Invoice Amount -Taxes)', 'IGST Rate', 'IGST Amount',
  'Buyer Invoice ID', 'Buyer Invoice Date', 'Buyer Invoice Amount', "Customer's Delivery State"];

function sale(evt, sub, inv, taxable, igst, amt) {
  return ['OD1', '1', '39264099', evt, sub, 1, 'IN-UP', taxable, 5, igst, inv, '2026-10-10 00:00:00.0', amt, 'Punjab'];
}

test('Flipkart "Return Cancellation" rows are added back, not netted as returns', async () => {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet([
    SALES_HDR,
    sale('Sale', 'Sale', 'NUA1', 101.9, 5.1, 107),
    sale('Return', 'Return', 'MFA1', -101.9, -5.1, 107),
    sale('Return', 'Return Cancellation', 'LOAEADL1', 101.9, 5.1, 107),
  ]);
  xlsx.utils.book_append_sheet(wb, ws, 'Sales Report');
  const file = path.join(os.tmpdir(), `fk_retcancel_${Date.now()}.xlsx`);
  xlsx.writeFile(wb, file);

  const { orderLines } = await parseFlipkartReport(file, '09');
  fs.unlinkSync(file);

  const rc = orderLines.find(l => l.invoiceNumber === 'LOAEADL1');
  assert.equal(rc.type, 'sale');
  assert.equal(rc.docType, 'DR');

  const agg = aggregateGstr1(orderLines, '09', 'T');
  // 101.90 (sale) - 101.90 (return) + 101.90 (return cancelled) = 101.90 net
  assert.equal(agg.sections.b2cs.length, 1);
  assert.equal(agg.sections.b2cs[0].txval, 101.9);
  assert.equal(agg.sections.b2cs[0].iamt, 5.1);
  const debit = agg.sections.doc_issue.doc_det.find(d => d.doc_typ === 'Debit Note');
  assert.equal(debit.docs[0].from, 'LOAEADL1');
});
