import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  LABEL_PORTRAIT_SIZE,
  LABEL_LANDSCAPE_SIZE,
  detectMarketplaceFromText,
  findInvoiceHeadingPosition,
  scanPixelBounds,
  cropPdfBlob,
  mergePdfBlobs,
} from '../../src/utils/pdfUtils.js';

describe('Simplified PDF Label & Invoice Cropper Helpers', () => {
  it('detects Amazon, Flipkart, and Meesho from PDF text', () => {
    assert.strictEqual(detectMarketplaceFromText('Ship via Amazon Transportation Services'), 'Amazon');
    assert.strictEqual(detectMarketplaceFromText('Flipkart Internet Private Limited FMPP123'), 'Flipkart');
    assert.strictEqual(detectMarketplaceFromText('Ordered via Ekart Logistics'), 'Flipkart');
    assert.strictEqual(detectMarketplaceFromText('Meesho Fashnear Technologies Sub Order'), 'Meesho');
    assert.strictEqual(detectMarketplaceFromText('Shipped by Valmo Express'), 'Meesho');
    assert.strictEqual(detectMarketplaceFromText('Generic courier shipping label'), null);
  });

  it('finds Tax Invoice, Bill of Supply, and Cash Memo positions from real pdf.js text content', async () => {
    const doc = await PDFDocument.create();

    // Page 1: Flipkart-style narrow portrait label + Tax Invoice below
    const p1 = doc.addPage([595, 842]);
    p1.drawText('Flipkart Ekart STD', { x: 220, y: 780, size: 14, color: rgb(0, 0, 0) });
    p1.drawText('AWB: FMPP123456', { x: 220, y: 650, size: 12, color: rgb(0, 0, 0) });
    p1.drawText('Tax Invoice', { x: 60, y: 420, size: 13, color: rgb(0, 0, 0) });
    p1.drawText('Total Amount Rs. 499', { x: 60, y: 320, size: 11, color: rgb(0, 0, 0) });

    // Page 2: Meesho-style wide landscape label + Bill of Supply split across runs
    const p2 = doc.addPage([595, 842]);
    p2.drawText('Meesho Customer Address', { x: 40, y: 790, size: 14, color: rgb(0, 0, 0) });
    p2.drawText('Bill', { x: 40, y: 460, size: 13, color: rgb(0, 0, 0) });
    p2.drawText('of Supply', { x: 75, y: 460, size: 13, color: rgb(0, 0, 0) });

    // Page 3: Cash Memo heading
    const p3 = doc.addPage([595, 842]);
    p3.drawText('Amazon Easy Ship Label', { x: 80, y: 760, size: 14, color: rgb(0, 0, 0) });
    p3.drawText('Cash Memo', { x: 80, y: 400, size: 13, color: rgb(0, 0, 0) });

    // Page 4: Label only (no invoice heading)
    const p4 = doc.addPage([595, 842]);
    p4.drawText('Shipping Label Only Page', { x: 100, y: 700, size: 14, color: rgb(0, 0, 0) });

    const pdfBytes = await doc.save();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBytes),
      disableWorker: true,
    });
    const pdfJsDoc = await loadingTask.promise;

    assert.strictEqual(pdfJsDoc.numPages, 4);

    // Check Page 1 (Tax Invoice around y=420 from bottom => ~422 from top at scale 1)
    const page1 = await pdfJsDoc.getPage(1);
    const vp1 = page1.getViewport({ scale: 1 });
    const tc1 = await page1.getTextContent();
    const h1 = findInvoiceHeadingPosition(tc1.items, vp1);
    assert.ok(h1);
    assert.match(h1.matchedText, /Tax Invoice/i);
    assert.ok(h1.headingTopY > 390 && h1.headingTopY < 430);

    // Check Page 2 (Bill of Supply split across two runs)
    const page2 = await pdfJsDoc.getPage(2);
    const vp2 = page2.getViewport({ scale: 1 });
    const tc2 = await page2.getTextContent();
    const h2 = findInvoiceHeadingPosition(tc2.items, vp2);
    assert.ok(h2);
    assert.match(h2.matchedText, /Bill of Supply/i);

    // Check Page 3 (Cash Memo)
    const page3 = await pdfJsDoc.getPage(3);
    const vp3 = page3.getViewport({ scale: 1 });
    const tc3 = await page3.getTextContent();
    const h3 = findInvoiceHeadingPosition(tc3.items, vp3);
    assert.ok(h3);
    assert.match(h3.matchedText, /Cash Memo/i);

    // Check Page 4 (no heading -> null)
    const page4 = await pdfJsDoc.getPage(4);
    const vp4 = page4.getViewport({ scale: 1 });
    const tc4 = await page4.getTextContent();
    const h4 = findInvoiceHeadingPosition(tc4.items, vp4);
    assert.strictEqual(h4, null);

    await pdfJsDoc.cleanup?.();
    await loadingTask.destroy();
  });

  it('trims white margins accurately and skips blank pixel buffers', () => {
    const width = 200;
    const height = 300;
    const white = new Uint8ClampedArray(width * height * 4).fill(255);

    // Blank buffer returns null
    assert.strictEqual(scanPixelBounds(white, width, height), null);

    // Draw a 60x120 portrait rectangle in the center (simulating 3x5 Flipkart label)
    const buf = new Uint8ClampedArray(white);
    for (let y = 40; y < 160; y++) {
      for (let x = 70; x < 130; x++) {
        const idx = (y * width + x) * 4;
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
      }
    }

    const portraitBounds = scanPixelBounds(buf, width, height, { topY: 0, bottomY: 180 }, 4);
    assert.ok(portraitBounds);
    assert.strictEqual(portraitBounds.minX, 66);
    assert.strictEqual(portraitBounds.minY, 36);
    assert.strictEqual(portraitBounds.maxX, 134);
    assert.strictEqual(portraitBounds.maxY, 164);
    assert.ok(portraitBounds.width < portraitBounds.height);

    // Verify thermal output constants
    assert.deepStrictEqual(LABEL_PORTRAIT_SIZE, { width: 216, height: 360 });
    assert.deepStrictEqual(LABEL_LANDSCAPE_SIZE, { width: 360, height: 216 });
  });

  it('strips full-width bottom dashed cut line so Flipkart labels remain tight portrait 3x5', () => {
    const width = 500;
    const height = 500;
    const buf = new Uint8ClampedArray(width * height * 4).fill(255);

    const setBlack = (x, y) => {
      const idx = (y * width + x) * 4;
      buf[idx] = 0;
      buf[idx + 1] = 0;
      buf[idx + 2] = 0;
    };

    // Draw centered Flipkart portrait label box: x=[160..340] (w=180), y=[20..300] (h=280)
    for (let y = 20; y <= 300; y++) {
      setBlack(160, y);
      setBlack(161, y);
      setBlack(340, y);
      setBlack(339, y);
    }
    for (let x = 160; x <= 340; x++) {
      setBlack(x, 20);
      setBlack(x, 21);
      setBlack(x, 300);
      setBlack(x, 299);
    }

    // Draw wide dashed cut line at bottom: x=[25..475] (w=450), y=[314..316] (h=3)
    for (let x = 25; x <= 475; x++) {
      if (x % 10 < 5) {
        setBlack(x, 314);
        setBlack(x, 315);
        setBlack(x, 316);
      }
    }

    const stripped = scanPixelBounds(
      buf,
      width,
      height,
      { topY: 0, bottomY: 360 },
      8,
      { stripCutLine: true }
    );
    assert.ok(stripped);
    assert.ok(stripped.maxY <= 312, `Expected maxY <= 312, got ${stripped.maxY}`);
    assert.ok(stripped.minX >= 150 && stripped.maxX <= 350, `Unexpected X span: ${stripped.minX}..${stripped.maxX}`);
    assert.ok(stripped.width < stripped.height, 'Trimmed Flipkart label should be portrait (width < height)');
  });

  it('merges and crops multi-page PDFs with pdf-lib cleanly', async () => {
    const d1 = await PDFDocument.create();
    d1.addPage([400, 600]).drawText('Label 1', { x: 50, y: 500 });
    const b1 = new Blob([await d1.save()], { type: 'application/pdf' });

    const d2 = await PDFDocument.create();
    d2.addPage([400, 600]).drawText('Label 2', { x: 50, y: 500 });
    const b2 = new Blob([await d2.save()], { type: 'application/pdf' });

    const merged = await mergePdfBlobs([
      { name: 'a.pdf', blob: b1 },
      { name: 'b.pdf', blob: b2 },
    ]);
    const loadedMerged = await PDFDocument.load(await merged.arrayBuffer());
    assert.strictEqual(loadedMerged.getPageCount(), 2);

    const cropped = await cropPdfBlob(
      merged,
      { xRatio: 0.05, yRatio: 0.05, widthRatio: 0.9, heightRatio: 0.45 },
      { pagesToCrop: 'all', rotation: 0, splitMode: 'none' }
    );
    assert.strictEqual(cropped.length, 1);
    const loadedCropped = await PDFDocument.load(await cropped[0].blob.arrayBuffer());
    assert.strictEqual(loadedCropped.getPageCount(), 2);
  });
});
