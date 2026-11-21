import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampPixelDimension,
  inferImageMime,
  buildImageOutputFilename,
  calculateResizeDimensions,
} from '../../src/utils/imageProcessing.js';

describe('Image Processing Helpers', () => {
  it('clamps pixel dimensions cleanly within 1..10000 px', () => {
    assert.equal(clampPixelDimension(0, 500), 500);
    assert.equal(clampPixelDimension(-25, 100), 100);
    assert.equal(clampPixelDimension(15000), 10000);
    assert.equal(clampPixelDimension(1234.6), 1235);
  });

  it('infers image MIME from file type or filename extension', () => {
    assert.equal(inferImageMime({ type: 'image/webp', name: 'a.bin' }), 'image/webp');
    assert.equal(inferImageMime({ type: '', name: 'product.jpg' }), 'image/jpeg');
    assert.equal(inferImageMime({ type: '', name: 'scan.bmp' }), 'image/bmp');
    assert.equal(inferImageMime({ type: '', name: 'logo.png' }), 'image/png');
  });

  it('builds sanitized output filenames with suffix and extension', () => {
    assert.equal(
      buildImageOutputFilename('Product Photo (1).png', '_resized', 'jpg'),
      'Product_Photo_1_resized.jpg'
    );
    assert.equal(buildImageOutputFilename('hero.webp', '', '.png'), 'hero.png');
  });

  it('calculates preset, custom aspect-locked, unlocked, and percentage dimensions accurately', () => {
    // Aspect-locked 2000x1000 fit inside 1000x1000 preset -> 1000x500
    assert.deepEqual(
      calculateResizeDimensions(2000, 1000, {
        mode: 'preset',
        width: 1000,
        height: 1000,
        maintainAspectRatio: true,
      }),
      { width: 1000, height: 500 }
    );

    // Aspect-unlocked custom 800x600
    assert.deepEqual(
      calculateResizeDimensions(2000, 1000, {
        mode: 'custom',
        width: 800,
        height: 600,
        maintainAspectRatio: false,
      }),
      { width: 800, height: 600 }
    );

    // Percentage 50% of 1200x800 -> 600x400
    assert.deepEqual(
      calculateResizeDimensions(1200, 800, {
        mode: 'percentage',
        scalePercent: 50,
      }),
      { width: 600, height: 400 }
    );
  });
});
