import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker in browser environments using the bundled local worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    '/pdf.worker.min.mjs',
    window.location.origin
  ).toString();
}

// Standard thermal label dimensions in PDF points (72 pt = 1 inch)
export const LABEL_PORTRAIT_SIZE = { width: 216, height: 360 }; // 3 x 5 in
export const LABEL_LANDSCAPE_SIZE = { width: 360, height: 216 }; // 5 x 3 in

const INVOICE_HEADING_REGEX = /\b(tax\s*invoice|bill\s*of\s*supply|cash\s*memo)\b/i;

/**
 * Detects the marketplace (Amazon, Flipkart, or Meesho) from extracted PDF text.
 * Used as an informational badge only.
 *
 * @param {string} text
 * @returns {'Amazon' | 'Flipkart' | 'Meesho' | null}
 */
export function detectMarketplaceFromText(text = '') {
  if (!text || typeof text !== 'string') return null;
  if (/\bamazon\b/i.test(text)) return 'Amazon';
  if (/\bflipkart\b|\bekart\b/i.test(text)) return 'Flipkart';
  if (/\bmeesho\b|\bfashnear\b|\bvalmo\b/i.test(text)) return 'Meesho';
  return null;
}

/**
 * Finds the topmost "Tax Invoice", "Bill of Supply", or "Cash Memo" heading
 * in viewport pixel coordinates by grouping PDF.js text items into horizontal lines.
 *
 * @param {Array} textItems - items from page.getTextContent()
 * @param {Object} viewport - PDF.js PageViewport
 * @returns {{ headingTopY: number, headingBaselineY: number, matchedText: string } | null}
 */
export function findInvoiceHeadingPosition(textItems = [], viewport) {
  if (!Array.isArray(textItems) || textItems.length === 0 || !viewport) {
    return null;
  }

  // Convert each text run into viewport coordinates
  const positioned = [];
  for (const item of textItems) {
    const str = item?.str;
    if (!str || !str.trim() || !Array.isArray(item.transform)) continue;

    const [vx, vy] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
    const fontHeightPt = item.height || Math.hypot(item.transform[2], item.transform[3]) || 10;
    const fontHeightPx = Math.max(6, fontHeightPt * (viewport.scale || 1));

    positioned.push({
      str,
      x: vx,
      y: vy,
      heightPx: fontHeightPx,
    });
  }

  if (positioned.length === 0) return null;

  // Sort top-to-bottom, then left-to-right
  positioned.sort((a, b) => a.y - b.y || a.x - b.x);

  // Group runs that sit on the same horizontal text line
  const lines = [];
  for (const run of positioned) {
    const tolerance = Math.max(4, run.heightPx * 0.45);
    let targetLine = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (Math.abs(lines[i].y - run.y) <= tolerance) {
        targetLine = lines[i];
        break;
      }
      if (run.y - lines[i].y > tolerance * 2) break;
    }

    if (targetLine) {
      targetLine.runs.push(run);
      targetLine.maxHeight = Math.max(targetLine.maxHeight, run.heightPx);
    } else {
      lines.push({
        y: run.y,
        maxHeight: run.heightPx,
        runs: [run],
      });
    }
  }

  // Inspect lines from top to bottom for the invoice heading
  for (const line of lines) {
    line.runs.sort((a, b) => a.x - b.x);
    const lineText = line.runs
      .map((r) => r.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const match = lineText.match(INVOICE_HEADING_REGEX);
    if (match) {
      const headingBaselineY = line.y;
      const headingTopY = Math.max(0, headingBaselineY - line.maxHeight);
      return {
        headingTopY,
        headingBaselineY,
        matchedText: match[0],
      };
    }
  }

  return null;
}

function isDarkPixel(data, idx) {
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];
  const a = data[idx + 3];
  return a > 20 && (r < 242 || g < 242 || b < 242);
}

/**
 * Detects an isolated thin dashed/dotted cut line at the bottom of a label region
 * (such as Flipkart's full-width tear line above "Tax Invoice") separated by blank rows.
 * Returns a tighter endY above the cut line if detected, or null otherwise.
 */
function detectBottomCutLineCutoff(data, width, rowCounts, startY, endY) {
  let stripBottom = -1;
  for (let y = endY - 1; y >= startY; y--) {
    if (rowCounts[y - startY] > 0) {
      stripBottom = y;
      break;
    }
  }
  if (stripBottom === -1) return null;

  // Walk up through the bottommost thin band (allow 1 blank row inside for slight slant)
  let stripTop = stripBottom;
  let innerBlanks = 0;
  for (let y = stripBottom - 1; y >= startY; y--) {
    if (rowCounts[y - startY] > 0) {
      stripTop = y;
      innerBlanks = 0;
    } else {
      innerBlanks++;
      if (innerBlanks >= 2) break;
    }
  }

  const stripHeight = stripBottom - stripTop + 1;
  if (stripHeight > 8) return null;

  // Require at least 3 consecutive blank rows separating the cut line from the label box
  let gapTop = -1;
  for (let y = stripTop - 1; y >= startY; y--) {
    if (rowCounts[y - startY] > 0) {
      gapTop = y;
      break;
    }
  }
  if (gapTop === -1 || stripTop - gapTop - 1 < 3 || gapTop - startY < 30) {
    return null;
  }

  // Measure horizontal span & dash density of the bottom strip vs the label above the gap
  let stripMinX = width;
  let stripMaxX = -1;
  let filledStripCols = 0;
  for (let x = 0; x < width; x++) {
    let colHit = false;
    for (let y = stripTop; y <= stripBottom; y++) {
      if (isDarkPixel(data, (y * width + x) * 4)) {
        colHit = true;
        break;
      }
    }
    if (colHit) {
      if (x < stripMinX) stripMinX = x;
      if (x > stripMaxX) stripMaxX = x;
      filledStripCols++;
    }
  }
  if (stripMaxX <= stripMinX) return null;

  const stripSpan = stripMaxX - stripMinX + 1;
  const fillRatio = filledStripCols / stripSpan;

  let aboveMinX = width;
  let aboveMaxX = -1;
  for (let x = 0; x < width; x++) {
    for (let y = startY; y <= gapTop; y++) {
      if (isDarkPixel(data, (y * width + x) * 4)) {
        if (x < aboveMinX) aboveMinX = x;
        if (x > aboveMaxX) aboveMaxX = x;
        break;
      }
    }
  }
  const aboveSpan = aboveMaxX > aboveMinX ? aboveMaxX - aboveMinX + 1 : width;

  const isDashedCutLine = fillRatio < 0.85 && stripSpan > width * 0.25;
  const isWiderTearDivider = stripSpan > aboveSpan * 1.15;

  if (!isDashedCutLine && !isWiderTearDivider) {
    return null;
  }

  // Stop strictly above the cut line with at least 2px clearance
  return Math.max(gapTop + 1, stripTop - 2);
}

/**
 * Scans RGBA pixel data inside a vertical band [topY, bottomY) to find
 * the tight content bounding box (non-white pixels) with small padding.
 *
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} height
 * @param {{ topY?: number, bottomY?: number }} region
 * @param {number} paddingPx
 * @param {{ stripCutLine?: boolean }} [options]
 * @returns {{ minX: number, minY: number, maxX: number, maxY: number, width: number, height: number, pixelCount: number } | null}
 */
export function scanPixelBounds(
  data,
  width,
  height,
  region = { topY: 0, bottomY: height },
  paddingPx = 8,
  options = {}
) {
  const startY = Math.max(0, Math.floor(region.topY ?? 0));
  let endY = Math.min(height, Math.ceil(region.bottomY ?? height));
  if (!data || width <= 0 || endY <= startY) return null;

  const rowCounts = new Int32Array(endY - startY);
  for (let y = startY; y < endY; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (isDarkPixel(data, rowOffset + x * 4)) {
        rowCounts[y - startY]++;
      }
    }
  }

  // Optionally strip an isolated bottom tear/cut dotted line from label regions
  if (options.stripCutLine) {
    const cutoff = detectBottomCutLineCutoff(data, width, rowCounts, startY, endY);
    if (cutoff !== null && cutoff > startY) {
      endY = cutoff;
    }
  }

  const colCounts = new Int32Array(width);
  let totalPixels = 0;
  for (let y = startY; y < endY; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (isDarkPixel(data, rowOffset + x * 4)) {
        colCounts[x]++;
        totalPixels++;
      }
    }
  }

  // Filter out empty or speck-noise regions (blank pages)
  if (totalPixels < 40) {
    return null;
  }

  // Require >= 2 content pixels per row/col when the region is dense to ignore stray 1px artifacts
  const threshold = totalPixels > 250 ? 2 : 1;

  let minY = -1;
  let maxY = -1;
  for (let y = startY; y < endY; y++) {
    if (rowCounts[y - startY] >= threshold) {
      if (minY === -1) minY = y;
      maxY = y;
    }
  }

  let minX = -1;
  let maxX = -1;
  for (let x = 0; x < width; x++) {
    if (colCounts[x] >= threshold) {
      if (minX === -1) minX = x;
      maxX = x;
    }
  }

  // Fallback to threshold=1 if strict threshold missed thin rules
  if (minX === -1 || maxX === -1 || minY === -1 || maxY === -1) {
    for (let y = startY; y < endY; y++) {
      if (rowCounts[y - startY] >= 1) {
        if (minY === -1) minY = y;
        maxY = y;
      }
    }
    for (let x = 0; x < width; x++) {
      if (colCounts[x] >= 1) {
        if (minX === -1) minX = x;
        maxX = x;
      }
    }
  }

  if (minX === -1 || maxX === -1 || minY === -1 || maxY === -1 || minX >= maxX || minY >= maxY) {
    return null;
  }

  const paddedMinX = Math.max(0, minX - paddingPx);
  const paddedMinY = Math.max(startY, minY - paddingPx);
  const paddedMaxX = Math.min(width, maxX + 1 + paddingPx);
  const paddedMaxY = Math.min(endY, maxY + 1 + paddingPx);

  return {
    minX: paddedMinX,
    minY: paddedMinY,
    maxX: paddedMaxX,
    maxY: paddedMaxY,
    width: paddedMaxX - paddedMinX,
    height: paddedMaxY - paddedMinY,
    pixelCount: totalPixels,
  };
}

/**
 * Converts viewport pixel bounds into pdf-lib embedPage boundingBox coordinates.
 *
 * @param {{ minX: number, minY: number, maxX: number, maxY: number }} bounds
 * @param {Object} viewport
 * @returns {{ left: number, bottom: number, right: number, top: number }}
 */
function viewportBoundsToPdfBox(bounds, viewport) {
  const [x1, y1] = viewport.convertToPdfPoint(bounds.minX, bounds.minY);
  const [x2, y2] = viewport.convertToPdfPoint(bounds.maxX, bounds.maxY);
  return {
    left: Math.min(x1, x2),
    bottom: Math.min(y1, y2),
    right: Math.max(x1, x2),
    top: Math.max(y1, y2),
  };
}

/**
 * Embeds a clipped region of srcPage into outDoc and draws it upright onto a target page.
 * Handles source page rotation (0, 90, 180, 270) accurately.
 */
async function appendClippedSlice(outDoc, srcPage, pdfBox, options = {}) {
  const embedded = await outDoc.embedPage(srcPage, pdfBox);
  const rot = ((srcPage.getRotation()?.angle || 0) % 360 + 360) % 360;
  const visW = rot === 90 || rot === 270 ? embedded.height : embedded.width;
  const visH = rot === 90 || rot === 270 ? embedded.width : embedded.height;

  const pageW = options.targetWidth || visW;
  const pageH = options.targetHeight || visH;
  const margin = options.margin ?? 0;

  const availW = Math.max(10, pageW - margin * 2);
  const availH = Math.max(10, pageH - margin * 2);
  const scale = options.fitToTarget ? Math.min(availW / visW, availH / visH) : 1;

  const drawnVisW = visW * scale;
  const drawnVisH = visH * scale;
  const cx = (pageW - drawnVisW) / 2;
  const cy = (pageH - drawnVisH) / 2;

  const drawOpts = {
    width: embedded.width * scale,
    height: embedded.height * scale,
  };

  if (rot === 90) {
    drawOpts.x = cx;
    drawOpts.y = cy + drawnVisH;
    drawOpts.rotate = degrees(-90);
  } else if (rot === 180) {
    drawOpts.x = cx + drawnVisW;
    drawOpts.y = cy + drawnVisH;
    drawOpts.rotate = degrees(180);
  } else if (rot === 270) {
    drawOpts.x = cx + drawnVisW;
    drawOpts.y = cy;
    drawOpts.rotate = degrees(90);
  } else {
    drawOpts.x = cx;
    drawOpts.y = cy;
  }

  const outPage = outDoc.addPage([pageW, pageH]);
  outPage.drawPage(embedded, drawOpts);
}

/**
 * Automatically crops shipping labels and tax invoices from a multi-page e-commerce PDF.
 * - Detects Amazon, Flipkart, or Meesho from PDF text (informational badge).
 * - Splits each page at the "Tax Invoice", "Bill of Supply", or "Cash Memo" heading.
 * - Trims white margins via canvas pixel scanning.
 * - Outputs Labels as 3x5 in portrait (or 5x3 in landscape when wider than tall)
 *   and Invoices at their original trimmed dimensions.
 *
 * @param {File|Blob|ArrayBuffer|Uint8Array} fileInput
 * @param {(progress: { current: number, total: number }) => void} [onProgress]
 * @returns {Promise<{
 *   marketplace: 'Amazon' | 'Flipkart' | 'Meesho' | null,
 *   totalPages: number,
 *   labelCount: number,
 *   invoiceCount: number,
 *   skippedBlankPages: number,
 *   noInvoiceHeadingCount: number,
 *   firstLabelPreviewUrl: string | null,
 *   firstLabelOrientation: 'portrait' | 'landscape' | null,
 *   labelsBlob: Blob | null,
 *   invoicesBlob: Blob | null,
 * }>}
 */
export async function autoCropLabelsAndInvoices(fileInput, onProgress) {
  let rawBytes;
  if (fileInput instanceof Uint8Array) {
    rawBytes = fileInput;
  } else if (fileInput instanceof ArrayBuffer) {
    rawBytes = new Uint8Array(fileInput);
  } else if (fileInput && typeof fileInput.arrayBuffer === 'function') {
    rawBytes = new Uint8Array(await fileInput.arrayBuffer());
  } else {
    throw new Error('Invalid PDF input provided.');
  }

  // Clone bytes because PDF.js transfers/detaches the underlying ArrayBuffer to the worker
  const pdfJsBytes = rawBytes.slice();
  const pdfLibBytes = rawBytes.slice();

  let loadingTask;
  let pdfDoc;
  try {
    loadingTask = pdfjsLib.getDocument({
      data: pdfJsBytes,
      disableWorker: typeof window === 'undefined',
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
    });
    pdfDoc = await loadingTask.promise;
  } catch (err) {
    if (err?.name === 'PasswordException' || /password/i.test(err?.message || '')) {
      const pwErr = new Error(
        'This PDF is password-protected. Please unlock it first and upload the unlocked file.'
      );
      pwErr.code = 'PASSWORD_PROTECTED';
      throw pwErr;
    }
    throw new Error('Could not read this PDF file. Please check that it is a valid, uncorrupted PDF.');
  }

  let srcPdfLibDoc;
  try {
    srcPdfLibDoc = await PDFDocument.load(pdfLibBytes, { ignoreEncryption: true });
  } catch {
    await loadingTask.destroy().catch(() => {});
    throw new Error('Failed to parse PDF structure for cropping.');
  }

  const labelsDoc = await PDFDocument.create();
  const invoicesDoc = await PDFDocument.create();

  const totalPages = pdfDoc.numPages;
  const renderScale = 1.5;

  let marketplace = null;
  let allTextCombined = '';
  let totalTextChars = 0;
  let nonBlankPages = 0;
  let skippedBlankPages = 0;
  let noInvoiceHeadingCount = 0;
  let labelCount = 0;
  let invoiceCount = 0;
  let firstLabelPreviewUrl = null;
  let firstLabelOrientation = null;

  // Reuse one offscreen canvas across pages to keep memory usage low on 40+ page PDFs
  const workCanvas = document.createElement('canvas');
  const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (typeof onProgress === 'function') {
      onProgress({ current: pageNum, total: totalPages });
    }
    // Yield to browser paint loop so the progress bar animates smoothly
    await new Promise((resolve) => setTimeout(resolve, 0));

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: renderScale });

    workCanvas.width = Math.max(1, Math.floor(viewport.width));
    workCanvas.height = Math.max(1, Math.floor(viewport.height));
    workCtx.fillStyle = '#ffffff';
    workCtx.fillRect(0, 0, workCanvas.width, workCanvas.height);

    // Run text extraction and canvas rendering
    const [textContent] = await Promise.all([
      page.getTextContent(),
      page.render({ canvasContext: workCtx, viewport }).promise,
    ]);

    const pageItems = textContent?.items || [];
    const pageText = pageItems
      .map((item) => item.str || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const imageData = workCtx.getImageData(0, 0, workCanvas.width, workCanvas.height);
    const fullPageBounds = scanPixelBounds(
      imageData.data,
      workCanvas.width,
      workCanvas.height,
      { topY: 0, bottomY: workCanvas.height },
      8
    );

    // Skip blank pages when both visual pixels and text are empty
    if (!fullPageBounds && pageText.length === 0) {
      skippedBlankPages++;
      continue;
    }

    nonBlankPages++;
    totalTextChars += pageText.replace(/\s+/g, '').length;
    allTextCombined += ` ${pageText}`;

    if (!marketplace) {
      marketplace = detectMarketplaceFromText(allTextCombined);
    }

    const srcPage = srcPdfLibDoc.getPage(pageNum - 1);
    const heading = findInvoiceHeadingPosition(pageItems, viewport);

    // Helper to crop & append a label slice and capture the first label preview
    const addLabelSlice = async (bounds) => {
      const isLandscape = bounds.width > bounds.height;
      const targetSize = isLandscape ? LABEL_LANDSCAPE_SIZE : LABEL_PORTRAIT_SIZE;
      const pdfBox = viewportBoundsToPdfBox(bounds, viewport);

      await appendClippedSlice(labelsDoc, srcPage, pdfBox, {
        targetWidth: targetSize.width,
        targetHeight: targetSize.height,
        fitToTarget: true,
        margin: 6,
      });

      if (!firstLabelPreviewUrl) {
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = bounds.width;
        previewCanvas.height = bounds.height;
        const previewCtx = previewCanvas.getContext('2d');
        previewCtx.drawImage(
          workCanvas,
          bounds.minX,
          bounds.minY,
          bounds.width,
          bounds.height,
          0,
          0,
          bounds.width,
          bounds.height
        );
        firstLabelPreviewUrl = previewCanvas.toDataURL('image/png');
        firstLabelOrientation = isLandscape ? 'landscape' : 'portrait';
      }

      labelCount++;
    };

    const addInvoiceSlice = async (bounds) => {
      const pdfBox = viewportBoundsToPdfBox(bounds, viewport);
      await appendClippedSlice(invoicesDoc, srcPage, pdfBox, {
        fitToTarget: false,
      });
      invoiceCount++;
    };

    if (heading) {
      // Split slightly above the heading top so the heading remains cleanly inside the invoice
      const splitY = Math.max(0, Math.floor(heading.headingTopY - 4));

      const labelBounds =
        splitY > 12
          ? scanPixelBounds(
              imageData.data,
              workCanvas.width,
              workCanvas.height,
              { topY: 0, bottomY: splitY },
              8,
              { stripCutLine: true }
            )
          : null;

      // Only emit a label if real printable content exists above the heading
      // (Amazon Page 2 invoice-only pages start with "Tax Invoice" at the top)
      if (labelBounds && labelBounds.height >= 16 && labelBounds.pixelCount >= 60) {
        await addLabelSlice(labelBounds);
      }

      const invoiceBounds = scanPixelBounds(
        imageData.data,
        workCanvas.width,
        workCanvas.height,
        { topY: splitY, bottomY: workCanvas.height },
        8
      );

      if (invoiceBounds && invoiceBounds.height >= 16) {
        await addInvoiceSlice(invoiceBounds);
      }
    } else {
      // No invoice heading found on this page -> treat the entire trimmed page as a label
      noInvoiceHeadingCount++;
      const labelOnlyBounds = scanPixelBounds(
        imageData.data,
        workCanvas.width,
        workCanvas.height,
        { topY: 0, bottomY: workCanvas.height },
        8,
        { stripCutLine: true }
      );
      if (labelOnlyBounds) {
        await addLabelSlice(labelOnlyBounds);
      }
    }

    page.cleanup();
  }

  await pdfDoc.cleanup?.();
  await loadingTask.destroy().catch(() => {});

  // Detect scanned/image-only PDFs (non-blank visual content but zero selectable text)
  if (nonBlankPages > 0 && totalTextChars < 5) {
    const scanErr = new Error(
      'This appears to be a scanned or image-only PDF with no selectable text. Please upload a digital shipping label PDF from Amazon, Flipkart, or Meesho.'
    );
    scanErr.code = 'SCANNED_PDF';
    throw scanErr;
  }

  if (labelCount === 0 && invoiceCount === 0) {
    const emptyErr = new Error(
      'No labels or invoices could be extracted because all pages appear to be blank.'
    );
    emptyErr.code = 'EMPTY_PDF';
    throw emptyErr;
  }

  const labelsBlob =
    labelCount > 0
      ? new Blob([await labelsDoc.save()], { type: 'application/pdf' })
      : null;

  const invoicesBlob =
    invoiceCount > 0
      ? new Blob([await invoicesDoc.save()], { type: 'application/pdf' })
      : null;

  return {
    marketplace,
    totalPages,
    labelCount,
    invoiceCount,
    skippedBlankPages,
    noInvoiceHeadingCount,
    firstLabelPreviewUrl,
    firstLabelOrientation,
    labelsBlob,
    invoicesBlob,
  };
}

/**
 * Scans the rendered PDF canvas using pixel analysis to detect
 * the non-white content area (barcodes, borders, labels).
 * Returns normalized bounding ratios with safe padding.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {{ xRatio: number, yRatio: number, widthRatio: number, heightRatio: number } | null}
 */
export function detectLabelBoundingBox(canvas) {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const { width, height } = canvas;
  let imgData;
  try {
    imgData = ctx.getImageData(0, 0, width, height);
  } catch (e) {
    console.error('Canvas pixel read error', e);
    return null;
  }

  const data = imgData.data;
  const step = 2; // pixel sampling step

  // Ignore outer 1.5% margin to exclude PDF crop marks and outer border lines
  const marginX = Math.floor(width * 0.015);
  const marginY = Math.floor(height * 0.015);

  const rowCounts = new Int32Array(height);
  const colCounts = new Int32Array(width);
  let totalDarkPixels = 0;

  for (let y = marginY; y < height - marginY; y += step) {
    for (let x = marginX; x < width - marginX; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      if (a > 30 && brightness < 200) {
        rowCounts[y]++;
        colCounts[x]++;
        totalDarkPixels++;
      }
    }
  }

  // Minimum pixel threshold per row/col to be considered actual content (not noise)
  const minRowContent = Math.max(3, Math.floor((width / step) * 0.008));
  const minColContent = Math.max(3, Math.floor((height / step) * 0.008));

  let minY = -1;
  let maxY = -1;
  for (let y = marginY; y < height - marginY; y++) {
    if (rowCounts[y] >= minRowContent) {
      if (minY === -1) minY = y;
      maxY = y;
    }
  }

  let minX = -1;
  let maxX = -1;
  for (let x = marginX; x < width - marginX; x++) {
    if (colCounts[x] >= minColContent) {
      if (minX === -1) minX = x;
      maxX = x;
    }
  }

  if (
    totalDarkPixels < 80 ||
    minY === -1 ||
    maxY === -1 ||
    minX === -1 ||
    maxX === -1 ||
    minX >= maxX ||
    minY >= maxY
  ) {
    return null;
  }

  // Add 10px safe padding
  const pad = 10;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width, maxX + pad);
  maxY = Math.min(height, maxY + pad);

  return {
    xRatio: Number((minX / width).toFixed(4)),
    yRatio: Number((minY / height).toFixed(4)),
    widthRatio: Number(((maxX - minX) / width).toFixed(4)),
    heightRatio: Number(((maxY - minY) / height).toFixed(4)),
  };
}

/**
 * Normalizes selection coordinates and crops a PDF document.
 *
 * @param {Blob} pdfBlob - original PDF file blob.
 * @param {Object} selectionRatio - { xRatio, yRatio, widthRatio, heightRatio } in 0..1 coordinates
 * @param {Object} options - { pagesToCrop: 'all' | 'first', rotation: 0, splitMode: 'none' | '2-up-vertical' | '2-up-horizontal' | '4-up-grid' }
 * @returns {Promise<Array<{ blob: Blob, suffix: string }>>}
 */
export async function cropPdfBlob(
  pdfBlob,
  selectionRatio,
  options = { pagesToCrop: 'all', rotation: 0, splitMode: 'none' }
) {
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  const totalPages = srcDoc.getPageCount();
  let pageIndicesToProcess = [];
  if (options.pagesToCrop === 'first') {
    pageIndicesToProcess = [0];
  } else if (options.pagesToCrop === 'second' || options.pagesToCrop === 'page2') {
    pageIndicesToProcess = [totalPages >= 2 ? 1 : 0];
  } else if (options.pagesToCrop === 'last') {
    pageIndicesToProcess = [totalPages - 1];
  } else if (typeof options.pagesToCrop === 'number') {
    const targetIdx = Math.max(0, Math.min(totalPages - 1, options.pagesToCrop - 1));
    pageIndicesToProcess = [targetIdx];
  } else {
    pageIndicesToProcess = Array.from({ length: totalPages }, (_, i) => i);
  }

  let sliceRegions = [];
  const split = options.splitMode || 'none';

  if (split === '2-up-vertical') {
    sliceRegions = [
      { xRatio: 0.02, yRatio: 0.02, widthRatio: 0.96, heightRatio: 0.47, suffix: 'part1' },
      { xRatio: 0.02, yRatio: 0.51, widthRatio: 0.96, heightRatio: 0.47, suffix: 'part2' },
    ];
  } else if (split === '2-up-horizontal') {
    sliceRegions = [
      { xRatio: 0.02, yRatio: 0.02, widthRatio: 0.47, heightRatio: 0.96, suffix: 'part1' },
      { xRatio: 0.51, yRatio: 0.02, widthRatio: 0.47, heightRatio: 0.96, suffix: 'part2' },
    ];
  } else if (split === '4-up-grid') {
    sliceRegions = [
      { xRatio: 0.02, yRatio: 0.02, widthRatio: 0.47, heightRatio: 0.47, suffix: 'q1' },
      { xRatio: 0.51, yRatio: 0.02, widthRatio: 0.47, heightRatio: 0.47, suffix: 'q2' },
      { xRatio: 0.02, yRatio: 0.51, widthRatio: 0.47, heightRatio: 0.47, suffix: 'q3' },
      { xRatio: 0.51, yRatio: 0.51, widthRatio: 0.47, heightRatio: 0.47, suffix: 'q4' },
    ];
  } else {
    sliceRegions = [{ ...selectionRatio, suffix: '' }];
  }

  const outputBlobs = [];

  for (let sIdx = 0; sIdx < sliceRegions.length; sIdx++) {
    const region = sliceRegions[sIdx];
    const newDoc = await PDFDocument.create();

    const pagesToEmbed = pageIndicesToProcess.map((idx) => srcDoc.getPage(idx));
    const embeddedPages = await newDoc.embedPages(pagesToEmbed);

    for (let pIdx = 0; pIdx < pageIndicesToProcess.length; pIdx++) {
      const srcPage = pagesToEmbed[pIdx];
      const embedded = embeddedPages[pIdx];
      const { width: origWidth, height: origHeight } = srcPage.getSize();

      const cropWidth = Math.max(10, Math.round(region.widthRatio * origWidth));
      const cropHeight = Math.max(10, Math.round(region.heightRatio * origHeight));
      const cropX = Math.round(region.xRatio * origWidth);
      const cropY = Math.round((1 - region.yRatio - region.heightRatio) * origHeight);

      const newPage = newDoc.addPage([cropWidth, cropHeight]);

      newPage.drawPage(embedded, {
        x: -cropX,
        y: -cropY,
        width: origWidth,
        height: origHeight,
      });

      if (options.rotation && options.rotation !== 0) {
        newPage.setRotation({ angle: options.rotation % 360 });
      }

      if (pIdx > 0 && pIdx % 4 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    const croppedBytes = await newDoc.save();
    outputBlobs.push({
      blob: new Blob([croppedBytes], { type: 'application/pdf' }),
      suffix: region.suffix ? `_${region.suffix}` : '',
    });
  }

  return outputBlobs;
}

/**
 * Merges multiple PDF blobs into a single printable PDF document.
 * @param {Array<{name: string, blob: Blob}>} items
 * @returns {Promise<Blob>}
 */
export async function mergePdfBlobs(items) {
  const mergedDoc = await PDFDocument.create();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const arrayBuffer = await item.blob.arrayBuffer();
    const doc = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach((page) => mergedDoc.addPage(page));

    if (i > 0 && i % 4 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  const mergedBytes = await mergedDoc.save();
  return new Blob([mergedBytes], { type: 'application/pdf' });
}

/**
 * Triggers direct browser printing of a PDF blob via an invisible iframe.
 * @param {Blob} pdfBlob
 */
export function printPdfBlob(pdfBlob) {
  const blobUrl = URL.createObjectURL(pdfBlob);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = blobUrl;

  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch {
      window.open(blobUrl, '_blank')?.print();
    }
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 60000);
  };

  document.body.appendChild(iframe);
}
