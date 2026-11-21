/**
 * Client-side PDF to Word (.docx) conversion engine with layout heuristics,
 * multi-column table reconstruction, embedded image extraction, and Tesseract OCR fallback.
 */

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIN_DIGITAL_CHARS_THRESHOLD = 15;
const MAX_EXTRACTED_IMAGES_PER_DOC = 30;
const MAX_IMAGE_CANVAS_PX = 1000;
const MAX_DOCX_IMAGE_WIDTH_PX = 520;
const MAX_DOCX_IMAGE_HEIGHT_PX = 400;
const BOLD_FONT_REGEX = /bold|black|heavy|semibold|demi/i;
const BULLET_LINE_REGEX = /^(?:[\u2022\u2023\u25E6\u2043\u2219•\-*]|\d+[.)]|[a-zA-Z][.)])\s+/;

/**
 * Resolves a PDF.js page object (image XObject) safely with a timeout fallback.
 */
function resolvePdfPageObject(page, objId, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const store = typeof objId === 'string' && objId.startsWith('g_') ? page.commonObjs : page.objs;
    if (!store) {
      resolve(null);
      return;
    }

    if (store.has(objId)) {
      try {
        resolve(store.get(objId));
        return;
      } catch {
        // Fall through to callback-based resolution
      }
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, timeoutMs);

    try {
      store.get(objId, (obj) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(obj || null);
        }
      });
    } catch {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

/**
 * Converts a PDF.js image XObject (ImageBitmap or raw pixel buffer) into a PNG Uint8Array.
 */
async function pdfImageObjectToPng(imgData, ImageKind) {
  if (!imgData) return null;
  const width = Number(imgData.width) || 0;
  const height = Number(imgData.height) || 0;

  // Skip tiny decorative 1px/mask spacers
  if (width < 24 || height < 24) return null;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = width;
  srcCanvas.height = height;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) return null;

  try {
    if (imgData.bitmap) {
      srcCtx.drawImage(imgData.bitmap, 0, 0, width, height);
    } else if (imgData.data) {
      const imageData = srcCtx.createImageData(width, height);
      const dest = imageData.data;
      const src = imgData.data;
      const kind = imgData.kind;

      if (kind === ImageKind.RGBA_32BPP) {
        if (src.length < width * height * 4) return null;
        dest.set(src.subarray(0, width * height * 4));
      } else if (kind === ImageKind.RGB_24BPP) {
        if (src.length < width * height * 3) return null;
        let s = 0;
        let d = 0;
        const total = width * height;
        for (let i = 0; i < total; i++) {
          dest[d++] = src[s++];
          dest[d++] = src[s++];
          dest[d++] = src[s++];
          dest[d++] = 255;
        }
      } else if (kind === ImageKind.GRAYSCALE_1BPP) {
        const rowBytes = Math.ceil(width / 8);
        if (src.length < rowBytes * height) return null;
        let srcPos = 0;
        let destPos = 0;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const byteVal = src[srcPos + (x >> 3)];
            const bit = (byteVal >> (7 - (x & 7))) & 1;
            const lum = bit ? 255 : 0;
            dest[destPos++] = lum;
            dest[destPos++] = lum;
            dest[destPos++] = lum;
            dest[destPos++] = 255;
          }
          srcPos += rowBytes;
        }
      } else {
        return null;
      }

      srcCtx.putImageData(imageData, 0, 0);
    } else {
      return null;
    }

    // Scale down oversized raster bitmaps before PNG encoding
    const rasterScale = Math.min(1, MAX_IMAGE_CANVAS_PX / Math.max(width, height));
    const outW = Math.max(1, Math.round(width * rasterScale));
    const outH = Math.max(1, Math.round(height * rasterScale));

    let exportCanvas = srcCanvas;
    let scaledCanvas = null;
    if (rasterScale < 1) {
      scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = outW;
      scaledCanvas.height = outH;
      const scaledCtx = scaledCanvas.getContext('2d');
      if (scaledCtx) {
        scaledCtx.drawImage(srcCanvas, 0, 0, outW, outH);
        exportCanvas = scaledCanvas;
      }
    }

    const blob = await new Promise((resolve) => exportCanvas.toBlob(resolve, 'image/png'));
    if (scaledCanvas) {
      scaledCanvas.width = 0;
      scaledCanvas.height = 0;
    }
    if (!blob) return null;

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const docScale = Math.min(1, MAX_DOCX_IMAGE_WIDTH_PX / width, MAX_DOCX_IMAGE_HEIGHT_PX / height);

    return {
      bytes,
      docWidth: Math.max(24, Math.round(width * docScale)),
      docHeight: Math.max(24, Math.round(height * docScale)),
    };
  } finally {
    srcCanvas.width = 0;
    srcCanvas.height = 0;
  }
}

/**
 * Safely extracts embedded images on a PDF page. Never throws.
 */
async function extractPageImages(page, pdfjsLib, remainingQuota, preloadedOpList = null) {
  const images = [];
  if (remainingQuota <= 0) return images;

  try {
    const opList = preloadedOpList || (await page.getOperatorList());
    if (!opList?.fnArray || !opList?.argsArray) return images;

    const seenObjIds = new Set();
    const { paintImageXObject } = pdfjsLib.OPS;

    for (let i = 0; i < opList.fnArray.length; i++) {
      if (images.length >= remainingQuota) break;
      if (opList.fnArray[i] !== paintImageXObject) continue;

      const objId = opList.argsArray[i]?.[0];
      if (!objId || seenObjIds.has(objId)) continue;
      seenObjIds.add(objId);

      try {
        const imgObj = await resolvePdfPageObject(page, objId);
        const pngImage = await pdfImageObjectToPng(imgObj, pdfjsLib.ImageKind);
        if (pngImage) {
          images.push(pngImage);
        }
      } catch {
        // Ignore individual corrupt/unsupported images
      }
    }
  } catch {
    // Operator list failures should never abort text conversion
  }

  return images;
}

/**
 * Checks whether a PDF.js font key represents a bold typeface.
 */
function isFontBold(page, fontName, styles) {
  if (BOLD_FONT_REGEX.test(fontName)) return true;
  if (BOLD_FONT_REGEX.test(styles[fontName]?.fontFamily || '')) return true;

  if (fontName && page.commonObjs?.has(fontName)) {
    try {
      const fontObj = page.commonObjs.get(fontName);
      if (fontObj?.bold === true || BOLD_FONT_REGEX.test(fontObj?.name || '')) {
        return true;
      }
    } catch {
      // Ignore unresolved font descriptors
    }
  }
  return false;
}

/**
 * Counts non-whitespace characters from a PDF.js textContent payload.
 */
function countNonWhitespaceChars(textContent) {
  let count = 0;
  for (const item of textContent?.items || []) {
    if (!item || typeof item.str !== 'string') continue;
    count += item.str.replace(/\s+/g, '').length;
  }
  return count;
}

/**
 * Extracts positioned text runs from an already-fetched PDF.js textContent object.
 */
function extractPositionedTextRunsFromContent(page, textContent) {
  const styles = textContent?.styles || {};
  const runs = [];

  for (const item of textContent?.items || []) {
    if (!item || typeof item.str !== 'string') continue;
    const trimmed = item.str.trim();
    if (!trimmed) continue;

    const tx = Array.isArray(item.transform) ? item.transform : [11, 0, 0, 11, 0, 0];
    const rawSize =
      item.height > 0
        ? item.height
        : Math.hypot(tx[2], tx[3]) || Math.hypot(tx[0], tx[1]) || 11;
    const fontSize = Math.max(5, Math.min(96, rawSize));
    const fontName = item.fontName || '';
    const isBold = isFontBold(page, fontName, styles);

    runs.push({
      str: item.str,
      x: Number(tx[4]) || 0,
      y: Number(tx[5]) || 0,
      width: Math.max(0, Number(item.width) || 0),
      fontSize,
      isBold,
    });
  }

  return runs;
}

/**
 * Computes the weighted median body font size across all digital text runs.
 */
function computeMedianBodyFontSize(digitalPages) {
  const samples = [];

  for (const pageData of digitalPages) {
    for (const run of pageData.runs) {
      const charWeight = Math.min(30, Math.max(1, run.str.trim().length));
      const rounded = Math.round(run.fontSize * 2) / 2;
      for (let w = 0; w < charWeight; w++) {
        samples.push(rounded);
      }
    }
  }

  if (samples.length === 0) return 11;
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)] || 11;
}

/**
 * Groups positioned runs into top-to-bottom horizontal lines, sorted left-to-right.
 */
function groupRunsIntoLines(runs) {
  if (!runs || runs.length === 0) return [];

  const sortedByY = [...runs].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];

  for (const run of sortedByY) {
    let matchedLine = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      const tolerance = Math.max(3, Math.min(run.fontSize, line.avgFontSize) * 0.45);
      if (Math.abs(line.y - run.y) <= tolerance) {
        matchedLine = line;
        break;
      }
      if (line.y - run.y > Math.max(18, run.fontSize * 2)) {
        break;
      }
    }

    if (matchedLine) {
      const count = matchedLine.runs.length;
      matchedLine.y = (matchedLine.y * count + run.y) / (count + 1);
      matchedLine.avgFontSize = (matchedLine.avgFontSize * count + run.fontSize) / (count + 1);
      matchedLine.runs.push(run);
    } else {
      lines.push({
        y: run.y,
        avgFontSize: run.fontSize,
        runs: [run],
      });
    }
  }

  lines.sort((a, b) => b.y - a.y);
  for (const line of lines) {
    line.runs.sort((a, b) => a.x - b.x);
  }

  return lines;
}

/**
 * Joins runs inside a single segment into clean text & styled run descriptors.
 */
function buildSegmentFromRuns(runs) {
  const styledPieces = [];
  let plainText = '';
  let totalWeight = 0;
  let weightedSizeSum = 0;
  let boldChars = 0;

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    const prev = i > 0 ? runs[i - 1] : null;
    let prefix = '';

    if (prev) {
      const prevEndsSpace = /\s$/.test(prev.str);
      const currStartsSpace = /^\s/.test(run.str);
      const dx = run.x - (prev.x + prev.width);
      const spaceThreshold = Math.min(prev.fontSize, run.fontSize) * 0.18;
      if (!prevEndsSpace && !currStartsSpace && dx > spaceThreshold) {
        prefix = ' ';
      }
    }

    const pieceText = `${prefix}${run.str}`;
    plainText += pieceText;

    const charCount = run.str.trim().length;
    totalWeight += charCount;
    weightedSizeSum += run.fontSize * charCount;
    if (run.isBold) boldChars += charCount;

    const last = styledPieces[styledPieces.length - 1];
    if (last && last.isBold === run.isBold && Math.abs(last.fontSize - run.fontSize) < 1) {
      last.text += pieceText;
    } else {
      styledPieces.push({
        text: pieceText,
        isBold: run.isBold,
        fontSize: run.fontSize,
      });
    }
  }

  const first = runs[0];
  const last = runs[runs.length - 1];

  return {
    startX: first.x,
    endX: last.x + last.width,
    text: plainText.replace(/\s+/g, ' ').trim(),
    styledPieces,
    avgFontSize: totalWeight > 0 ? weightedSizeSum / totalWeight : first.fontSize,
    isMostlyBold: totalWeight > 0 ? boldChars / totalWeight >= 0.75 : false,
  };
}

/**
 * Splits a grouped line into horizontal column segments separated by large horizontal gaps.
 */
function splitLineIntoSegments(line, bodyFontSize) {
  const gapThreshold = bodyFontSize * 2.2;
  const rawSegments = [];
  let currentRuns = [line.runs[0]];
  let currentEndX = line.runs[0].x + line.runs[0].width;

  for (let i = 1; i < line.runs.length; i++) {
    const run = line.runs[i];
    const gap = run.x - currentEndX;
    if (gap >= gapThreshold) {
      rawSegments.push(currentRuns);
      currentRuns = [run];
      currentEndX = run.x + run.width;
    } else {
      currentRuns.push(run);
      currentEndX = Math.max(currentEndX, run.x + run.width);
    }
  }
  rawSegments.push(currentRuns);

  const segments = rawSegments.map(buildSegmentFromRuns).filter((seg) => seg.text.length > 0);
  const fullText = segments.map((s) => s.text).join('   ');
  const maxFontSize = line.runs.reduce((m, r) => Math.max(m, r.fontSize), 0);

  return {
    y: line.y,
    avgFontSize: line.avgFontSize,
    maxFontSize,
    startX: segments[0]?.startX ?? 0,
    endX: segments[segments.length - 1]?.endX ?? 0,
    segments,
    text: fullText,
  };
}

/**
 * Creates DOCX TextRun instances from styled run pieces.
 */
function createDocxTextRuns(docx, styledPieces, useExplicitSize = true) {
  return styledPieces.map((piece) => {
    const halfPoints = Math.max(16, Math.min(36, Math.round(piece.fontSize * 2)));
    return new docx.TextRun({
      text: piece.text,
      bold: piece.isBold || undefined,
      size: useExplicitSize ? halfPoints : undefined,
    });
  });
}

/**
 * Attempts to convert a contiguous block of multi-segment lines into an aligned DOCX Table.
 */
function buildDocxTableFromBlock(docx, blockLines, bodyFontSize) {
  const colTolerance = Math.max(24, bodyFontSize * 2.2);
  const allStarts = [];

  for (const line of blockLines) {
    for (const seg of line.segments) {
      allStarts.push(seg.startX);
    }
  }

  allStarts.sort((a, b) => a - b);

  // Cluster column start X anchors
  const columnAnchors = [];
  for (const x of allStarts) {
    const lastAnchor = columnAnchors[columnAnchors.length - 1];
    if (!lastAnchor || x - lastAnchor.mean > colTolerance) {
      columnAnchors.push({ mean: x, count: 1 });
    } else {
      lastAnchor.mean = (lastAnchor.mean * lastAnchor.count + x) / (lastAnchor.count + 1);
      lastAnchor.count += 1;
    }
  }

  const colCount = columnAnchors.length;
  if (colCount < 2 || colCount > 10) {
    return null;
  }

  // Track max right edge per column to estimate proportional widths
  const colMinX = columnAnchors.map((c) => c.mean);
  const colMaxX = columnAnchors.map((c) => c.mean + 40);

  const rowsData = blockLines.map((line) => {
    const cells = Array.from({ length: colCount }, () => []);
    for (const seg of line.segments) {
      let bestCol = 0;
      let bestDist = Infinity;
      for (let c = 0; c < colCount; c++) {
        const dist = Math.abs(seg.startX - columnAnchors[c].mean);
        if (dist < bestDist) {
          bestDist = dist;
          bestCol = c;
        }
      }
      cells[bestCol].push(seg);
      colMinX[bestCol] = Math.min(colMinX[bestCol], seg.startX);
      colMaxX[bestCol] = Math.max(colMaxX[bestCol], seg.endX);
    }
    return cells;
  });

  // Compute proportional column widths in twips (~9000 twips total content width)
  const totalWidthTwips = 9000;
  const rawSpans = colMinX.map((minX, idx) => Math.max(36, colMaxX[idx] - minX));
  const spanSum = rawSpans.reduce((a, b) => a + b, 0) || colCount;
  const columnWidths = rawSpans.map((span) =>
    Math.max(700, Math.round((span / spanSum) * totalWidthTwips))
  );

  const borderDef = {
    style: docx.BorderStyle.SINGLE,
    size: 4,
    color: 'CBD5E1',
  };

  const tableRows = rowsData.map((rowCells) => {
    const tableCells = rowCells.map((cellSegments, colIdx) => {
      const paragraphs =
        cellSegments.length === 0
          ? [new docx.Paragraph({ children: [new docx.TextRun('')] })]
          : [
              new docx.Paragraph({
                spacing: { before: 20, after: 20 },
                children: cellSegments.flatMap((seg, segIdx) => {
                  const runs = createDocxTextRuns(docx, seg.styledPieces, true);
                  if (segIdx > 0) {
                    return [new docx.TextRun(' '), ...runs];
                  }
                  return runs;
                }),
              }),
            ];

      return new docx.TableCell({
        width: { size: columnWidths[colIdx], type: docx.WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 110, right: 110 },
        children: paragraphs,
      });
    });

    return new docx.TableRow({ children: tableCells });
  });

  return new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    columnWidths,
    borders: {
      top: borderDef,
      bottom: borderDef,
      left: borderDef,
      right: borderDef,
      insideHorizontal: borderDef,
      insideVertical: borderDef,
    },
    rows: tableRows,
  });
}

/**
 * Converts segmented lines of a digital PDF page into DOCX Paragraphs and Tables.
 */
function buildDocxElementsForDigitalPage(docx, runs, bodyFontSize) {
  const groupedLines = groupRunsIntoLines(runs);
  const lines = groupedLines
    .map((line) => splitLineIntoSegments(line, bodyFontSize))
    .filter((line) => line.text.length > 0);

  if (lines.length === 0) {
    return { elements: [], tableCount: 0, previewLines: [] };
  }

  const maxLineEndX = lines.reduce((max, l) => Math.max(max, l.endX), 0);
  const wrapThresholdX = maxLineEndX - bodyFontSize * 6;
  const elements = [];
  const previewLines = [];
  let tableCount = 0;

  let i = 0;
  let pendingParagraphPieces = null;
  let prevBodyLine = null;

  const flushPendingParagraph = () => {
    if (!pendingParagraphPieces || pendingParagraphPieces.length === 0) return;
    elements.push(
      new docx.Paragraph({
        spacing: { after: 120 },
        children: createDocxTextRuns(docx, pendingParagraphPieces, true),
      })
    );
    pendingParagraphPieces = null;
    prevBodyLine = null;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Check for contiguous multi-column block (>= 2 consecutive lines with >= 2 segments)
    if (line.segments.length >= 2) {
      let endIdx = i + 1;
      while (endIdx < lines.length && lines[endIdx].segments.length >= 2) {
        endIdx += 1;
      }

      if (endIdx - i >= 2) {
        flushPendingParagraph();
        const block = lines.slice(i, endIdx);
        const table = buildDocxTableFromBlock(docx, block, bodyFontSize);
        if (table) {
          elements.push(table);
          elements.push(new docx.Paragraph({ spacing: { after: 100 }, children: [] }));
          tableCount += 1;
          for (const bLine of block) {
            previewLines.push(bLine.segments.map((s) => s.text).join(' | '));
          }
          i = endIdx;
          continue;
        }
      }
    }

    // Single-line (or non-table) paragraph / heading assembly
    const isH1 = line.maxFontSize >= bodyFontSize * 1.45 && line.text.length <= 180;
    const isH2 = !isH1 && line.maxFontSize >= bodyFontSize * 1.2 && line.text.length <= 180;

    // Combine segments on this line cleanly (preserving wide spacing if isolated 2-segment row)
    const combinedPieces = [];
    line.segments.forEach((seg, segIdx) => {
      if (segIdx > 0) {
        combinedPieces.push({
          text: '   ',
          isBold: false,
          fontSize: line.avgFontSize,
        });
      }
      combinedPieces.push(...seg.styledPieces);
    });

    previewLines.push(line.text);

    if (isH1 || isH2) {
      flushPendingParagraph();
      elements.push(
        new docx.Paragraph({
          heading: isH1 ? docx.HeadingLevel.HEADING_1 : docx.HeadingLevel.HEADING_2,
          spacing: { before: isH1 ? 200 : 140, after: 100 },
          children: createDocxTextRuns(docx, combinedPieces, false),
        })
      );
      i += 1;
      continue;
    }

    const isBullet = BULLET_LINE_REGEX.test(line.text);
    const canMergeWithPrev =
      prevBodyLine &&
      pendingParagraphPieces &&
      !isBullet &&
      line.segments.length === 1 &&
      prevBodyLine.segments.length === 1 &&
      prevBodyLine.y - line.y <= bodyFontSize * 1.65 &&
      prevBodyLine.endX >= wrapThresholdX;

    if (canMergeWithPrev) {
      pendingParagraphPieces.push({
        text: ' ',
        isBold: false,
        fontSize: line.avgFontSize,
      });
      pendingParagraphPieces.push(...combinedPieces);
      prevBodyLine = line;
    } else {
      flushPendingParagraph();
      pendingParagraphPieces = [...combinedPieces];
      prevBodyLine = line;
    }

    i += 1;
  }

  flushPendingParagraph();
  return { elements, tableCount, previewLines };
}

/**
 * Converts a PDF File/Blob into a genuine Microsoft Word (.docx) Blob.
 *
 * @param {Blob} fileOrBlob
 * @param {{
 *   enableOcr?: boolean,
 *   extractImages?: boolean,
 *   onProgress?: (info: { stage: string, page: number, totalPages: number, message: string, ocrProgress?: number }) => void,
 *   signal?: AbortSignal,
 * }} [options]
 * @returns {Promise<{
 *   blob: Blob,
 *   pageCount: number,
 *   ocrPageCount: number,
 *   tableCount: number,
 *   imageCount: number,
 *   extractedPreviewText: string,
 * }>}
 */
export async function convertPdfToDocx(fileOrBlob, options = {}) {
  const {
    enableOcr = true,
    extractImages = true,
    onProgress,
    signal,
  } = options;

  const checkAborted = () => {
    if (signal?.aborted) {
      throw new Error('Conversion was cancelled.');
    }
  };

  onProgress?.({
    stage: 'init',
    page: 0,
    totalPages: 1,
    message: 'Loading PDF and Word document engine...',
  });

  const [docx, pdfjsLib] = await Promise.all([import('docx'), import('pdfjs-dist')]);

  if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      '/pdf.worker.min.mjs',
      window.location.origin
    ).toString();
  }

  const rawBuffer = await fileOrBlob.arrayBuffer();
  checkAborted();

  let pdfDoc = null;
  let ocrWorker = null;

  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(rawBuffer) });
    pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages || 0;

    if (numPages === 0) {
      throw new Error('This PDF has no pages to convert.');
    }

    const pageRecords = [];
    const digitalPages = [];
    let ocrPageCount = 0;
    let totalExtractedImages = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      checkAborted();

      onProgress?.({
        stage: 'extract',
        page: pageNum,
        totalPages: numPages,
        message: `Reading page ${pageNum} of ${numPages}...`,
      });

      const page = await pdfDoc.getPage(pageNum);

      try {
        const textContent = await page.getTextContent();
        const nonWsCount = countNonWhitespaceChars(textContent);

        if (nonWsCount < MIN_DIGITAL_CHARS_THRESHOLD && enableOcr) {
          ocrPageCount += 1;

          onProgress?.({
            stage: 'ocr',
            page: pageNum,
            totalPages: numPages,
            ocrProgress: 0,
            message: `Scanned page detected (${pageNum}/${numPages}). Preparing OCR...`,
          });

          const baseViewport = page.getViewport({ scale: 1.0 });
          const ocrScale = Math.min(
            2.0,
            3200 / Math.max(baseViewport.width || 1, baseViewport.height || 1)
          );
          const viewport = page.getViewport({ scale: ocrScale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(viewport.width));
          canvas.height = Math.max(1, Math.round(viewport.height));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Browser canvas context is unavailable for OCR.');
          }

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          try {
            await page.render({ canvasContext: ctx, viewport }).promise;
            checkAborted();

            if (!ocrWorker) {
              const { createWorker } = await import('tesseract.js');
              ocrWorker = await createWorker('eng', 1, {
                logger: (m) => {
                  if (m && typeof m.progress === 'number') {
                    onProgress?.({
                      stage: 'ocr',
                      page: pageNum,
                      totalPages: numPages,
                      ocrProgress: m.progress,
                      message: `Running OCR on page ${pageNum} of ${numPages} (${Math.round(
                        m.progress * 100
                      )}%)...`,
                    });
                  }
                },
              });
            }

            const ocrResult = await ocrWorker.recognize(canvas);
            const rawText = ocrResult?.data?.text || '';
            const ocrLines = rawText
              .replace(/\r\n/g, '\n')
              .split('\n')
              .map((line) => line.replace(/\s+/g, ' ').trim())
              .filter(Boolean);

            pageRecords.push({ kind: 'ocr', lines: ocrLines });
          } finally {
            canvas.width = 0;
            canvas.height = 0;
          }
        } else {
          let opList = null;
          try {
            opList = await page.getOperatorList();
          } catch {
            // Operator list is optional; text extraction proceeds safely without it
          }

          const runs = extractPositionedTextRunsFromContent(page, textContent);
          let images = [];
          if (extractImages && totalExtractedImages < MAX_EXTRACTED_IMAGES_PER_DOC) {
            const quota = MAX_EXTRACTED_IMAGES_PER_DOC - totalExtractedImages;
            images = await extractPageImages(page, pdfjsLib, quota, opList);
            totalExtractedImages += images.length;
          }

          const record = { kind: 'digital', runs, images };
          pageRecords.push(record);
          digitalPages.push(record);
        }
      } finally {
        page.cleanup?.();
      }
    }

    checkAborted();

    onProgress?.({
      stage: 'assemble',
      page: numPages,
      totalPages: numPages,
      message: 'Building Word (.docx) document...',
    });

    const bodyFontSize = computeMedianBodyFontSize(digitalPages);
    const docChildren = [];
    const previewLines = [];
    let tableCount = 0;

    for (let idx = 0; idx < pageRecords.length; idx++) {
      const record = pageRecords[idx];

      if (record.kind === 'ocr') {
        if (record.lines.length === 0) {
          docChildren.push(
            new docx.Paragraph({
              children: [
                new docx.TextRun({
                  text: `[Page ${idx + 1}: No readable text detected]`,
                  italics: true,
                  color: '64748B',
                }),
              ],
            })
          );
        } else {
          for (const lineText of record.lines) {
            previewLines.push(lineText);
            docChildren.push(
              new docx.Paragraph({
                spacing: { after: 120 },
                children: [new docx.TextRun({ text: lineText, size: 22 })],
              })
            );
          }
        }
      } else {
        const {
          elements,
          tableCount: pageTables,
          previewLines: pagePreview,
        } = buildDocxElementsForDigitalPage(docx, record.runs, bodyFontSize);
        tableCount += pageTables;
        previewLines.push(...pagePreview);
        docChildren.push(...elements);

        for (const img of record.images) {
          docChildren.push(
            new docx.Paragraph({
              spacing: { before: 120, after: 140 },
              children: [
                new docx.ImageRun({
                  type: 'png',
                  data: img.bytes,
                  transformation: {
                    width: img.docWidth,
                    height: img.docHeight,
                  },
                }),
              ],
            })
          );
        }

        if (elements.length === 0 && record.images.length === 0) {
          docChildren.push(
            new docx.Paragraph({
              children: [
                new docx.TextRun({
                  text: `[Page ${idx + 1}: Image-only or blank page]`,
                  italics: true,
                  color: '64748B',
                }),
              ],
            })
          );
        }
      }

      if (idx < pageRecords.length - 1) {
        docChildren.push(
          new docx.Paragraph({
            children: [new docx.PageBreak()],
          })
        );
      }
    }

    if (docChildren.length === 0) {
      docChildren.push(
        new docx.Paragraph({
          children: [new docx.TextRun('No extractable text found in this PDF.')],
        })
      );
    }

    const doc = new docx.Document({
      sections: [
        {
          properties: {},
          children: docChildren,
        },
      ],
    });

    const rawBlob = await docx.Packer.toBlob(doc);
    const finalBlob =
      rawBlob.type === DOCX_MIME ? rawBlob : new Blob([rawBlob], { type: DOCX_MIME });

    return {
      blob: finalBlob,
      pageCount: numPages,
      ocrPageCount,
      tableCount,
      imageCount: totalExtractedImages,
      extractedPreviewText: previewLines.join('\n').slice(0, 4000),
    };
  } catch (err) {
    if (err?.name === 'PasswordException' || /password/i.test(err?.message || '')) {
      throw new Error(
        'This PDF is password-protected. Please unlock it first and upload the unlocked file.'
      );
    }
    throw err;
  } finally {
    if (ocrWorker) {
      try {
        await ocrWorker.terminate();
      } catch {
        // Ignore worker termination failures
      }
    }
    if (pdfDoc) {
      try {
        await pdfDoc.destroy();
      } catch {
        // Ignore PDF cleanup failures
      }
    }
  }
}
