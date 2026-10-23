import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSkuKey,
  formatDisplaySku,
  resolveSku,
  generateProductMasterTemplateCsv,
  parseProductMasterRows,
} from '../../src/pnl-tool/domain/sku.js';

describe('SKU Normalization & Aliases Unit Tests', () => {
  it('should normalize SKU key by stripping quotes, SKU prefix, trimming spaces, and lowercasing', () => {
    assert.equal(normalizeSkuKey('" BUDDHA_LOTUS_07"'), 'buddha_lotus_07');
    assert.equal(normalizeSkuKey('BUDDHA_LOTUS_07'), 'buddha_lotus_07');
    assert.equal(normalizeSkuKey('SKU: GANESHA_11'), 'ganesha_11');
    assert.equal(normalizeSkuKey(" '  SKU: ITEM-999  ' "), 'item-999');
    assert.equal(normalizeSkuKey(''), '');
    assert.equal(normalizeSkuKey(null), '');
  });

  it('should format clean display SKU preserving case and removing clutter', () => {
    assert.equal(formatDisplaySku('" BUDDHA_LOTUS_07"'), 'BUDDHA_LOTUS_07');
    assert.equal(formatDisplaySku('SKU: Ganesha_11'), 'Ganesha_11');
    assert.equal(formatDisplaySku(''), 'UNKNOWN-SKU');
  });

  it('should resolve SKU through alias list correctly', () => {
    const aliases = {
      ganesah_21: 'ganesha_21', // seller typo mapped to canonical
      'buddha-small': 'buddha_lotus_07',
    };

    const res1 = resolveSku('Ganesah_21', aliases);
    assert.equal(res1.isAliased, true);
    assert.equal(res1.skuKey, 'ganesha_21');
    assert.equal(res1.originalSku, 'Ganesah_21');

    const res2 = resolveSku('Ganesha_21', aliases);
    assert.equal(res2.isAliased, false);
    assert.equal(res2.skuKey, 'ganesha_21');

    const res3 = resolveSku(' "BUDDHA-SMALL" ', aliases);
    assert.equal(res3.isAliased, true);
    assert.equal(res3.skuKey, 'buddha_lotus_07');
  });

  it('should generate valid product template CSV with example row', () => {
    const csv = generateProductMasterTemplateCsv();
    assert.ok(csv.includes('SKU,Product cost (₹)'));
    assert.ok(csv.includes('Ganesha_11,114'));
  });

  it('should parse product master rows accurately', () => {
    const sampleRows = [
      {
        SKU: ' "Ganesha_11" ',
        'Product cost (₹)': '114.50',
        'Product name': 'Ganesha Idol',
        'Packaging/handling per unit': '15',
        'GST rate': '5%',
        Marketplace: 'Flipkart',
      },
    ];
    const parsed = parseProductMasterRows(sampleRows);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].skuKey, 'ganesha_11');
    assert.equal(parsed[0].originalSku, 'Ganesha_11');
    assert.equal(parsed[0].costPaise, 11450);
    assert.equal(parsed[0].cogsUnitPaise, 11450);
    assert.equal(parsed[0].packagingCostPaise, 1500);
    assert.equal(parsed[0].gstRate, 5);
  });
});
