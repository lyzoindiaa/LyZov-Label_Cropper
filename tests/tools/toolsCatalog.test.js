import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TOOL_CATEGORIES,
  TOOLS_CATALOG,
  getToolsByCategory,
  findToolById,
} from '../../src/data/toolsCatalog.js';

describe('Tools Catalog & Category Structure', () => {
  it('defines all three core categories and assigns every tool to a valid category', () => {
    assert.deepEqual(
      TOOL_CATEGORIES.map((c) => c.id),
      ['image', 'pdf', 'ecommerce']
    );

    const categoryIds = new Set(TOOL_CATEGORIES.map((c) => c.id));
    for (const tool of TOOLS_CATALOG) {
      assert.ok(categoryIds.has(tool.categoryId), `Unknown categoryId on ${tool.id}`);
      assert.ok(tool.route.startsWith('/'), `Invalid route on ${tool.id}`);
    }
  });

  it('includes all 7 Phase 1 tools plus all 4 existing tools without duplicate IDs or routes', () => {
    const ids = TOOLS_CATALOG.map((t) => t.id);
    const routes = TOOLS_CATALOG.map((t) => t.route);
    assert.equal(new Set(ids).size, TOOLS_CATALOG.length);
    assert.equal(new Set(routes).size, TOOLS_CATALOG.length);

    for (const requiredId of [
      'image-resizer',
      'image-compressor',
      'image-converter',
      'background-remover',
      'merge-pdf',
      'pdf-to-word',
      'word-to-pdf',
      'cropper',
      'gst',
      'pnl',
      'image-extractor',
      'product-description',
    ]) {
      assert.ok(findToolById(requiredId), `Missing catalog entry for ${requiredId}`);
    }
  });

  it('returns clean categorized tool lists for homepage rendering', () => {
    assert.equal(getToolsByCategory('image').length, 4);
    assert.equal(getToolsByCategory('pdf').length, 3);
    assert.equal(getToolsByCategory('ecommerce').length, 5);
  });
});
