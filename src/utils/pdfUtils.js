import { PDFDocument } from 'pdf-lib';

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
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let darkPixelCount = 0;

  // Scan pixels in steps of 3 for speed
  const step = 3;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Detect non-white / dark content (brightness < 225 and not transparent)
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      if (a > 30 && brightness < 225) {
        darkPixelCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If no substantial content found
  if (darkPixelCount < 100 || minX >= maxX || minY >= maxY) {
    return null;
  }

  // Add 12px safe padding
  const pad = 12;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width, maxX + pad);
  maxY = Math.min(height, maxY + pad);

  return {
    xRatio: minX / width,
    yRatio: minY / height,
    widthRatio: (maxX - minX) / width,
    heightRatio: (maxY - minY) / height,
  };
}

/**
 * Normalizes selection coordinates and crops a PDF document.
 * Supports both manual rectangle crops and multi-label sheet splitting (2-up, 4-up).
 *
 * @param {Blob} pdfBlob - original PDF file blob.
 * @param {Object} selectionRatio - { xRatio, yRatio, widthRatio, heightRatio } in 0..1 coordinates
 * @param {Object} options - { pagesToCrop: 'all' | 'first', rotation: 0, splitMode: 'none' | '2-up-vertical' | '2-up-horizontal' | '4-up-grid' }
 * @returns {Promise<Array<Blob>>} - array of cropped PDF blobs.
 */
export async function cropPdfBlob(pdfBlob, selectionRatio, options = { pagesToCrop: 'all', rotation: 0, splitMode: 'none' }) {
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  const totalPages = srcDoc.getPageCount();
  const pageIndicesToProcess = options.pagesToCrop === 'first'
    ? [0]
    : Array.from({ length: totalPages }, (_, i) => i);

  // Determine slice zones per page
  let sliceRegions = [];
  const split = options.splitMode || 'none';

  if (split === '2-up-vertical') {
    // Top half & Bottom half
    sliceRegions = [
      { xRatio: 0.02, yRatio: 0.02, widthRatio: 0.96, heightRatio: 0.47, suffix: 'part1' },
      { xRatio: 0.02, yRatio: 0.51, widthRatio: 0.96, heightRatio: 0.47, suffix: 'part2' },
    ];
  } else if (split === '2-up-horizontal') {
    // Left half & Right half
    sliceRegions = [
      { xRatio: 0.02, yRatio: 0.02, widthRatio: 0.47, heightRatio: 0.96, suffix: 'part1' },
      { xRatio: 0.51, yRatio: 0.02, widthRatio: 0.47, heightRatio: 0.96, suffix: 'part2' },
    ];
  } else if (split === '4-up-grid') {
    // 2x2 quadrants
    sliceRegions = [
      { xRatio: 0.02, yRatio: 0.02, widthRatio: 0.47, heightRatio: 0.47, suffix: 'q1' },
      { xRatio: 0.51, yRatio: 0.02, widthRatio: 0.47, heightRatio: 0.47, suffix: 'q2' },
      { xRatio: 0.02, yRatio: 0.51, widthRatio: 0.47, heightRatio: 0.47, suffix: 'q3' },
      { xRatio: 0.51, yRatio: 0.51, widthRatio: 0.47, heightRatio: 0.47, suffix: 'q4' },
    ];
  } else {
    // Single custom region
    sliceRegions = [{ ...selectionRatio, suffix: '' }];
  }

  const outputBlobs = [];

  for (let sIdx = 0; sIdx < sliceRegions.length; sIdx++) {
    const region = sliceRegions[sIdx];
    const newDoc = await PDFDocument.create();

    for (const pageIdx of pageIndicesToProcess) {
      const srcPage = srcDoc.getPage(pageIdx);
      const { width: origWidth, height: origHeight } = srcPage.getSize();

      const cropWidth = Math.max(10, Math.round(region.widthRatio * origWidth));
      const cropHeight = Math.max(10, Math.round(region.heightRatio * origHeight));
      const cropX = Math.round(region.xRatio * origWidth);
      const cropY = Math.round((1 - region.yRatio - region.heightRatio) * origHeight);

      const [embedded] = await newDoc.embedPages([srcPage]);
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

  for (const item of items) {
    const arrayBuffer = await item.blob.arrayBuffer();
    const doc = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach((page) => mergedDoc.addPage(page));
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
