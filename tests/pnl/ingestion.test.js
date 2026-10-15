import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsvText, detectDelimiter, computeFileHash } from '../../src/pnl-tool/utils/parser.js';

describe('File Ingestion Engine Tests', () => {
  it('should parse standard comma-delimited CSV with quoted strings', () => {
    const csv = `Order ID,Order Date,Seller SKU,Item Price,Quantity\n"ORD-101",2026-10-01,"TSHIRT-BLK",599.00,2\n"ORD-102",2026-10-02,"TSHIRT-WHT",499.00,1`;
    const result = parseCsvText(csv);
    assert.equal(result.headers.length, 5);
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0]['Order ID'], 'ORD-101');
    assert.equal(result.rows[0]['Item Price'], '599.00');
  });

  it('should auto-detect semicolon and tab delimiters', () => {
    const semi = `Order ID;Status;Total\nORD-1;Shipped;100\nORD-2;Delivered;200`;
    assert.equal(detectDelimiter(semi), ';');

    const tab = `Order ID\tStatus\tTotal\nORD-1\tShipped\t100\nORD-2\tDelivered\t200`;
    assert.equal(detectDelimiter(tab), '\t');
  });

  it('should strip UTF-8 BOM and skip junk top rows', () => {
    const withBom = '\uFEFFReport Generated on 2026-10-01\n\nOrder ID,SKU,Amount\nO-1,SKU-A,100';
    const result = parseCsvText(withBom);
    assert.equal(result.headers.includes('Order ID'), true);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0]['Order ID'], 'O-1');
  });

  it('should compute consistent hash for duplicate detection', async () => {
    const content = 'Order ID,SKU,Price\n123,ABC,999';
    const hash1 = await computeFileHash(content);
    const hash2 = await computeFileHash(content);
    assert.equal(hash1, hash2);
    assert.ok(hash1.length > 5);
  });
});
