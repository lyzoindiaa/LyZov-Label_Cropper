const PAGE_DIMENSIONS_PT = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

const PX_TO_PT = 72 / 96; // 96 CSS px = 72 PDF pt
const MAX_SINGLE_CANVAS_HEIGHT_PX = 12000;
const IMAGE_WAIT_TIMEOUT_MS = 8000;

/**
 * Reports conversion progress safely without breaking if no callback is passed.
 *
 * @param {((stageLabel: string, ratio: number) => void) | undefined} onProgress
 * @param {string} stageLabel
 * @param {number} ratio
 */
function reportProgress(onProgress, stageLabel, ratio) {
  if (typeof onProgress !== 'function') return;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  onProgress(stageLabel, clamped);
}

/**
 * Maps low-level zip/XML/memory errors into clear, plain-English messages.
 *
 * @param {unknown} err
 * @returns {Error}
 */
function toDocxConversionError(err) {
  const msg = typeof err === 'string' ? err : err?.message || '';
  if (/empty/i.test(msg)) {
    return new Error(msg);
  }
  if (/encrypt|password/i.test(msg)) {
    return new Error(
      'This Word document is password-protected or encrypted. Please remove the password and try again.'
    );
  }
  if (/corrupt|central directory|zip|unexpected end|invalid|word\/document\.xml|main document part|not a valid/i.test(msg)) {
    return new Error(
      'Could not read this Word document. The file appears to be corrupted or is not a valid .docx file.'
    );
  }
  if (/memory|allocation|out of memory|oom/i.test(msg)) {
    return new Error(
      'This document is too large for your browser memory. Try Standard quality or split it into smaller documents.'
    );
  }
  return new Error(
    msg && msg.length <= 200
      ? msg
      : 'Could not convert this Word document to PDF. Please make sure it is a valid .docx file.'
  );
}

/**
 * Creates a completely offscreen white-background container attached to document.body.
 *
 * @returns {HTMLDivElement}
 */
function createOffscreenHost() {
  const hostEl = document.createElement('div');
  hostEl.setAttribute('aria-hidden', 'true');
  hostEl.style.position = 'fixed';
  hostEl.style.left = '-100000px';
  hostEl.style.top = '0';
  hostEl.style.width = '1200px';
  hostEl.style.minWidth = '1200px';
  hostEl.style.margin = '0';
  hostEl.style.padding = '0';
  hostEl.style.background = '#ffffff';
  hostEl.style.color = '#000000';
  hostEl.style.zIndex = '-1';
  hostEl.style.pointerEvents = 'none';
  hostEl.style.overflow = 'visible';
  document.body.appendChild(hostEl);
  return hostEl;
}

/**
 * Waits for every <img> inside a container to finish loading/decoding, with a safe timeout.
 *
 * @param {HTMLElement} rootEl
 * @param {number} [timeoutMs]
 * @returns {Promise<void>}
 */
async function waitForImages(rootEl, timeoutMs = IMAGE_WAIT_TIMEOUT_MS) {
  const imgs = Array.from(rootEl.querySelectorAll('img'));
  if (imgs.length === 0) return;

  await Promise.all(
    imgs.map((img) => {
      const waitOne = new Promise((resolve) => {
        let settled = false;
        let timerId = null;

        const finish = () => {
          if (settled) return;
          settled = true;
          if (timerId !== null) clearTimeout(timerId);
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', finish);
          resolve();
        };

        const decodeAndFinish = () => {
          if (img.naturalWidth > 0 && typeof img.decode === 'function') {
            img.decode().catch(() => {}).finally(finish);
          } else {
            finish();
          }
        };

        const onLoad = () => decodeAndFinish();

        timerId = setTimeout(finish, timeoutMs);

        if (img.complete) {
          decodeAndFinish();
        } else {
          img.addEventListener('load', onLoad, { once: true });
          img.addEventListener('error', finish, { once: true });
        }
      });

      return waitOne;
    })
  );
}

/**
 * Yields two animation frames so fonts, CSS, and images settle before canvas capture.
 *
 * @returns {Promise<void>}
 */
function waitForLayoutPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 20);
      });
    });
  });
}

/**
 * Resolves the target PDF page dimensions in points for a rendered docx-preview section.
 *
 * @param {HTMLElement} sectionEl
 * @param {'auto' | 'a4' | 'letter'} pageFormat
 * @returns {{ pdfW: number, pdfH: number, pxW: number, pxH: number }}
 */
function resolveSectionDimensions(sectionEl, pageFormat) {
  let rect = sectionEl.getBoundingClientRect();
  if (rect.width < 200) {
    sectionEl.style.width = '794px';
    rect = sectionEl.getBoundingClientRect();
  }

  const computed = window.getComputedStyle(sectionEl);
  const pxW = Math.max(200, rect.width || sectionEl.offsetWidth || 794);
  const pxH = Math.max(200, sectionEl.scrollHeight || rect.height || sectionEl.offsetHeight || 1123);

  const parsedMinH = parseFloat(computed.minHeight);
  const nativeW = pxW * PX_TO_PT;
  const nativeSinglePageH =
    Number.isFinite(parsedMinH) && parsedMinH >= 150
      ? parsedMinH * PX_TO_PT
      : nativeW > 605 && nativeW < 620
        ? 792
        : nativeW * (841.89 / 595.28);

  const isLandscape = nativeW > nativeSinglePageH * 1.05;

  if (pageFormat === 'a4') {
    const [w, h] = PAGE_DIMENSIONS_PT.a4;
    return isLandscape ? { pdfW: h, pdfH: w, pxW, pxH } : { pdfW: w, pdfH: h, pxW, pxH };
  }

  if (pageFormat === 'letter') {
    const [w, h] = PAGE_DIMENSIONS_PT.letter;
    return isLandscape ? { pdfW: h, pdfH: w, pxW, pxH } : { pdfW: w, pdfH: h, pxW, pxH };
  }

  return {
    pdfW: Math.round(nativeW * 100) / 100,
    pdfH: Math.round(nativeSinglePageH * 100) / 100,
    pxW,
    pxH,
  };
}

/**
 * Checks whether a single horizontal pixel row of ImageData is effectively solid white.
 *
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} yOffsetInImageData
 * @returns {boolean}
 */
function isImageDataRowWhite(data, width, yOffsetInImageData) {
  const rowStart = yOffsetInImageData * width * 4;
  const step = width > 1200 ? 3 : 2;
  for (let x = 0; x < width; x += step) {
    const idx = rowStart + x * 4;
    const a = data[idx + 3];
    if (a < 10) continue;
    if (data[idx] < 248 || data[idx + 1] < 248 || data[idx + 2] < 248) {
      return false;
    }
  }
  return true;
}

/**
 * Checks whether an entire rectangular canvas slice is blank white.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} startY
 * @param {number} height
 * @param {number} width
 * @returns {boolean}
 */
function isCanvasSliceBlank(ctx, startY, height, width) {
  if (height <= 0 || width <= 0) return true;
  const imgData = ctx.getImageData(0, startY, width, height);
  const { data } = imgData;
  const rowStep = height > 80 ? 3 : 1;
  for (let y = 0; y < height; y += rowStep) {
    if (!isImageDataRowWhite(data, width, y)) {
      return false;
    }
  }
  return true;
}

/**
 * Searches upward near idealEndY for a white horizontal band between lines/rows
 * so text is not sliced through the middle across page boundaries.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} idealEndY
 * @param {number} minEndY
 * @param {number} searchWindowPx
 * @returns {number}
 */
function findCleanBreakY(ctx, width, idealEndY, minEndY, searchWindowPx) {
  const searchTop = Math.max(minEndY, idealEndY - searchWindowPx);
  const span = idealEndY - searchTop;
  if (span <= 4) return idealEndY;

  const imgData = ctx.getImageData(0, searchTop, width, span + 1);
  const { data } = imgData;

  let bestRunEnd = -1;
  let bestRunLen = 0;
  let currentRunLen = 0;

  for (let offset = span; offset >= 0; offset--) {
    if (isImageDataRowWhite(data, width, offset)) {
      currentRunLen += 1;
      if (currentRunLen > bestRunLen) {
        bestRunLen = currentRunLen;
        bestRunEnd = offset + Math.floor(currentRunLen / 2);
      }
      // A clean gap of >= 6px is plenty; pick the middle of this gap
      if (currentRunLen >= 6 && offset <= span - 2) {
        return searchTop + offset + Math.floor(currentRunLen / 2);
      }
    } else {
      currentRunLen = 0;
    }
  }

  if (bestRunLen >= 2 && bestRunEnd >= 0) {
    return Math.min(idealEndY, Math.max(searchTop, searchTop + bestRunEnd));
  }

  return idealEndY;
}

/**
 * Draws a portion of sourceCanvas onto a white sliceCanvas and appends it to jsPDF.
 *
 * @param {Object} params
 */
function addCanvasSliceToPdf({
  sourceCanvas,
  sliceCanvas,
  sliceCtx,
  startY,
  sliceHeightPx,
  pdfW,
  pdfH,
  topMarginPt,
  docState,
  jsPDFCtor,
}) {
  const srcW = sourceCanvas.width;
  sliceCanvas.width = srcW;
  sliceCanvas.height = sliceHeightPx;

  sliceCtx.fillStyle = '#ffffff';
  sliceCtx.fillRect(0, 0, srcW, sliceHeightPx);
  sliceCtx.drawImage(sourceCanvas, 0, startY, srcW, sliceHeightPx, 0, 0, srcW, sliceHeightPx);

  const imgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
  const orientation = pdfW > pdfH ? 'landscape' : 'portrait';

  if (!docState.doc) {
    docState.doc = new jsPDFCtor({
      orientation,
      unit: 'pt',
      format: [pdfW, pdfH],
      compress: true,
    });
  } else {
    docState.doc.addPage([pdfW, pdfH], orientation);
  }

  const drawH = (sliceHeightPx / srcW) * pdfW;
  docState.doc.addImage(imgData, 'JPEG', 0, topMarginPt, pdfW, drawH, undefined, 'FAST');
  docState.pageCount += 1;
}

/**
 * Captures a DOM element (even very tall elements) via html2canvas and appends
 * cleanly sliced pages into docState.doc without clipping or aspect distortion.
 *
 * @param {Object} params
 */
async function renderElementToPdfPages({
  element,
  html2canvas,
  scale,
  pdfW,
  pdfH,
  pxW,
  pxH,
  isMammothFallback,
  docState,
  jsPDFCtor,
  onProgressUpdate,
}) {
  const sliceCanvas = document.createElement('canvas');
  const sliceCtx = sliceCanvas.getContext('2d');
  if (!sliceCtx) {
    throw new Error('Could not initialize browser canvas context.');
  }

  const windowWidth = Math.max(window.innerWidth || 1200, Math.ceil(pxW) + 120);
  const totalCssH = Math.ceil(pxH);

  let cssY = 0;
  let sectionSliceIndex = 0;

  while (cssY < totalCssH) {
    const remainingCssH = totalCssH - cssY;
    const isBandMode = totalCssH * scale > MAX_SINGLE_CANVAS_HEIGHT_PX;
    const bandCssH = isBandMode
      ? Math.min(remainingCssH, Math.floor(10000 / scale))
      : remainingCssH;

    const captureOpts = {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth,
    };

    if (isBandMode) {
      captureOpts.y = cssY;
      captureOpts.height = bandCssH;
    }

    const canvas = await html2canvas(element, captureOpts);
    const canvasCtx = canvas.getContext('2d', { willReadFrequently: true });

    if (!canvasCtx || canvas.width === 0 || canvas.height === 0) {
      sliceCanvas.width = 0;
      sliceCanvas.height = 0;
      throw new Error('Failed to render document page canvas.');
    }

    const pxTolerance = Math.ceil(8 * scale);
    let localY = 0;
    let stopInBand = false;

    while (localY < canvas.height) {
      const isFirstSliceInSection = sectionSliceIndex === 0 && cssY === 0 && localY === 0;
      const topMarginPt = isMammothFallback && !isFirstSliceInSection ? 28 : 0;
      const bottomMarginPt = isMammothFallback ? 28 : isFirstSliceInSection ? 0 : 20;
      const usablePdfH = Math.max(100, pdfH - topMarginPt - bottomMarginPt);

      const maxSliceCanvasPx = Math.max(
        60,
        Math.floor(canvas.width * (usablePdfH / pdfW))
      );

      const remainingInCanvas = canvas.height - localY;
      const isAtDocumentEnd = !isBandMode || cssY + bandCssH >= totalCssH;

      // In band mode, if we don't have enough left in this band for a full page AND
      // more CSS height remains below this band (after consuming at least one slice),
      // break out and start the next band cleanly at cssY + localY/scale.
      if (!isAtDocumentEnd && remainingInCanvas < maxSliceCanvasPx && localY > 0) {
        stopInBand = true;
        break;
      }

      let sliceH;
      if (isAtDocumentEnd && remainingInCanvas <= maxSliceCanvasPx + pxTolerance) {
        // Fits on one final page (within minor subpixel overflow tolerance)
        sliceH = Math.min(remainingInCanvas, maxSliceCanvasPx);
        // Check if any tiny spillover beyond maxSliceCanvasPx is blank white
        if (remainingInCanvas > maxSliceCanvasPx) {
          const spilloverBlank = isCanvasSliceBlank(
            canvasCtx,
            localY + maxSliceCanvasPx,
            remainingInCanvas - maxSliceCanvasPx,
            canvas.width
          );
          if (!spilloverBlank) {
            // Actual content exists at the bottom: split normally so nothing is clipped
            sliceH = findCleanBreakY(
              canvasCtx,
              canvas.width,
              localY + maxSliceCanvasPx,
              localY + Math.floor(maxSliceCanvasPx * 0.65),
              Math.round(40 * scale)
            ) - localY;
          }
        }
      } else {
        const idealEndY = localY + maxSliceCanvasPx;
        const cleanEndY = findCleanBreakY(
          canvasCtx,
          canvas.width,
          idealEndY,
          localY + Math.floor(maxSliceCanvasPx * 0.65),
          Math.round(44 * scale)
        );
        sliceH = Math.max(1, cleanEndY - localY);
      }

      // Skip trailing blank white slices after page 1 of the document
      const sliceIsBlank =
        docState.pageCount > 0 && isCanvasSliceBlank(canvasCtx, localY, sliceH, canvas.width);

      if (!sliceIsBlank) {
        addCanvasSliceToPdf({
          sourceCanvas: canvas,
          sliceCanvas,
          sliceCtx,
          startY: localY,
          sliceHeightPx: sliceH,
          pdfW,
          pdfH,
          topMarginPt,
          docState,
          jsPDFCtor,
        });
      }

      sectionSliceIndex += 1;
      localY += sliceH;

      // If spillover was intentionally absorbed as white margin, exit cleanly
      if (isAtDocumentEnd && canvas.height - localY <= pxTolerance) {
        const tailBlank = isCanvasSliceBlank(
          canvasCtx,
          localY,
          canvas.height - localY,
          canvas.width
        );
        if (tailBlank) {
          localY = canvas.height;
          break;
        }
      }

      onProgressUpdate?.(docState.pageCount);
    }

    const consumedCssPx = localY / scale;
    canvas.width = 0;
    canvas.height = 0;

    if (stopInBand && consumedCssPx > 0) {
      cssY += consumedCssPx;
    } else if (!isBandMode) {
      break;
    } else {
      cssY += bandCssH;
    }

    // Stop if remaining tail is subpixel or pure whitespace at the end
    if (totalCssH - cssY < 2) break;
  }

  sliceCanvas.width = 0;
  sliceCanvas.height = 0;
}

/**
 * Injects mammoth HTML into a clean print-styled A4-width (794px) container inside hostEl.
 *
 * @param {HTMLElement} hostEl
 * @param {string} html
 */
function mountMammothPrintContainer(hostEl, html) {
  hostEl.innerHTML = '';

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .lyzov-mammoth-page {
      width: 794px;
      box-sizing: border-box;
      padding: 56px 60px;
      background: #ffffff;
      color: #111827;
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.55;
      overflow-wrap: break-word;
      word-wrap: break-word;
    }
    .lyzov-mammoth-page h1 {
      font-size: 18pt;
      font-weight: 700;
      margin: 14pt 0 8pt 0;
      line-height: 1.25;
      color: #0f172a;
    }
    .lyzov-mammoth-page h2 {
      font-size: 14pt;
      font-weight: 700;
      margin: 12pt 0 6pt 0;
      line-height: 1.3;
      color: #0f172a;
    }
    .lyzov-mammoth-page h3,
    .lyzov-mammoth-page h4 {
      font-size: 12pt;
      font-weight: 700;
      margin: 10pt 0 5pt 0;
      line-height: 1.35;
      color: #0f172a;
    }
    .lyzov-mammoth-page p {
      margin: 0 0 8pt 0;
    }
    .lyzov-mammoth-page ul,
    .lyzov-mammoth-page ol {
      margin: 0 0 8pt 0;
      padding-left: 20pt;
    }
    .lyzov-mammoth-page li {
      margin-bottom: 3pt;
    }
    .lyzov-mammoth-page table {
      width: 100%;
      border-collapse: collapse;
      margin: 10pt 0;
      font-size: 10pt;
    }
    .lyzov-mammoth-page th,
    .lyzov-mammoth-page td {
      border: 1px solid #cbd5e1;
      padding: 6pt 8pt;
      text-align: left;
      vertical-align: top;
    }
    .lyzov-mammoth-page th {
      background: #f8fafc;
      font-weight: 700;
    }
    .lyzov-mammoth-page img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 8pt 0;
    }
    .lyzov-mammoth-page blockquote {
      border-left: 3pt solid #cbd5e1;
      margin: 8pt 0;
      padding-left: 12pt;
      color: #334155;
    }
    .lyzov-mammoth-page a {
      color: #0284c7;
      text-decoration: underline;
    }
  `;

  const contentEl = document.createElement('div');
  contentEl.className = 'lyzov-mammoth-page';
  contentEl.innerHTML = html;

  hostEl.appendChild(styleEl);
  hostEl.appendChild(contentEl);
  return contentEl;
}

/**
 * Converts a Word (.docx) File into a multi-page PDF Blob cleanly inside the browser.
 * Uses `docx-preview` for high-fidelity layout rendering and falls back to `mammoth`
 * HTML print typography when needed.
 *
 * @param {File} file
 * @param {{
 *   pageFormat?: 'auto' | 'a4' | 'letter',
 *   qualityScale?: number,
 *   onProgress?: (stageLabel: string, ratio: number) => void,
 * }} [options]
 * @returns {Promise<{ blob: Blob, pageCount: number, engineUsed: 'docx-preview' | 'mammoth-fallback' }>}
 */
export async function convertDocxToPdf(file, options = {}) {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) {
    throw new Error('This Word document is empty or unreadable. Please select a valid .docx file.');
  }

  const pageFormat = ['auto', 'a4', 'letter'].includes(options.pageFormat)
    ? options.pageFormat
    : 'auto';
  const qualityScale =
    Number.isFinite(Number(options.qualityScale)) && Number(options.qualityScale) > 0
      ? Math.min(3, Math.max(1, Number(options.qualityScale)))
      : 1.75;
  const { onProgress } = options;

  let hostEl = null;

  try {
    reportProgress(onProgress, 'Reading Word document...', 0.05);
    const arrayBuffer = await file.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('This Word document is empty.');
    }

    reportProgress(onProgress, 'Loading conversion engine...', 0.15);
    const [docxPreviewMod, html2canvasMod, jsPdfMod] = await Promise.all([
      import('docx-preview'),
      import('html2canvas'),
      import('jspdf'),
    ]);

    const renderAsync = docxPreviewMod.renderAsync || docxPreviewMod.default?.renderAsync;
    const html2canvas = html2canvasMod.default || html2canvasMod;
    const jsPDFCtor = jsPdfMod.jsPDF || jsPdfMod.default?.jsPDF || jsPdfMod.default;

    if (typeof renderAsync !== 'function' || typeof html2canvas !== 'function' || typeof jsPDFCtor !== 'function') {
      throw new Error('Required browser conversion modules could not be initialized.');
    }

    hostEl = createOffscreenHost();
    const docState = { doc: null, pageCount: 0 };
    let engineUsed = 'docx-preview';
    let sections = [];
    let primaryErr = null;

    reportProgress(onProgress, 'Rendering document pages...', 0.28);
    try {
      await renderAsync(arrayBuffer, hostEl, null, {
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        breakPages: true,
        useBase64URL: true,
        renderHeaders: true,
        renderFooters: true,
      });

      reportProgress(onProgress, 'Loading embedded images...', 0.42);
      await waitForImages(hostEl);
      await waitForLayoutPaint();

      sections = Array.from(hostEl.querySelectorAll('section.docx'));
    } catch (err) {
      primaryErr = err;
      sections = [];
    }

    if (sections.length > 0) {
      for (let i = 0; i < sections.length; i++) {
        const sectionEl = sections[i];
        sectionEl.style.boxShadow = 'none';
        sectionEl.style.marginBottom = '0';

        const { pdfW, pdfH, pxW, pxH } = resolveSectionDimensions(sectionEl, pageFormat);
        const startRatio = 0.48 + (i / sections.length) * 0.44;
        reportProgress(
          onProgress,
          `Capturing section ${i + 1} of ${sections.length}...`,
          startRatio
        );

        await renderElementToPdfPages({
          element: sectionEl,
          html2canvas,
          scale: qualityScale,
          pdfW,
          pdfH,
          pxW,
          pxH,
          isMammothFallback: false,
          docState,
          jsPDFCtor,
          onProgressUpdate: (pagesSoFar) => {
            reportProgress(
              onProgress,
              `Captured ${pagesSoFar} ${pagesSoFar === 1 ? 'page' : 'pages'}...`,
              0.48 + ((i + 0.7) / sections.length) * 0.44
            );
          },
        });
      }
    } else {
      // Fallback to mammoth HTML rendering
      engineUsed = 'mammoth-fallback';
      reportProgress(onProgress, 'Preparing fallback document layout...', 0.4);

      const mammothMod = await import('mammoth');
      const mammoth = mammothMod.default || mammothMod;
      if (typeof mammoth?.convertToHtml !== 'function') {
        throw primaryErr || new Error('Could not initialize document fallback converter.');
      }

      let mammothResult;
      try {
        mammothResult = await mammoth.convertToHtml({ arrayBuffer });
      } catch (fallbackErr) {
        throw primaryErr || fallbackErr;
      }

      const html = (mammothResult?.value || '').trim();
      if (!html) {
        if (primaryErr) throw primaryErr;
        throw new Error(
          'This Word document appears to be empty (no readable text, tables, or images found).'
        );
      }

      const fallbackEl = mountMammothPrintContainer(hostEl, html);
      reportProgress(onProgress, 'Loading embedded images...', 0.5);
      await waitForImages(fallbackEl);
      await waitForLayoutPaint();

      const [pdfW, pdfH] =
        pageFormat === 'letter' ? PAGE_DIMENSIONS_PT.letter : PAGE_DIMENSIONS_PT.a4;
      const rect = fallbackEl.getBoundingClientRect();
      const pxW = Math.max(200, rect.width || fallbackEl.offsetWidth || 794);
      const pxH = Math.max(200, fallbackEl.scrollHeight || rect.height || fallbackEl.offsetHeight || 1123);

      await renderElementToPdfPages({
        element: fallbackEl,
        html2canvas,
        scale: qualityScale,
        pdfW,
        pdfH,
        pxW,
        pxH,
        isMammothFallback: true,
        docState,
        jsPDFCtor,
        onProgressUpdate: (pagesSoFar) => {
          reportProgress(
            onProgress,
            `Captured ${pagesSoFar} ${pagesSoFar === 1 ? 'page' : 'pages'}...`,
            0.55 + Math.min(0.37, pagesSoFar * 0.05)
          );
        },
      });
    }

    if (!docState.doc || docState.pageCount === 0) {
      throw new Error('No printable pages could be generated from this Word document.');
    }

    reportProgress(onProgress, 'Building PDF file...', 0.96);
    const blob = docState.doc.output('blob');
    reportProgress(onProgress, 'Conversion complete', 1);

    return {
      blob,
      pageCount: docState.pageCount,
      engineUsed,
    };
  } catch (err) {
    throw toDocxConversionError(err);
  } finally {
    if (hostEl && hostEl.parentNode) {
      hostEl.parentNode.removeChild(hostEl);
    }
  }
}
