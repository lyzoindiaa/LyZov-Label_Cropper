import { calcCompressionPercent, cleanBaseName } from './fileValidation.js';

export const IMAGE_MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
};

export const IMAGE_MIME_LABELS = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'image/bmp': 'BMP',
};

const MAX_DIM = 10000;
const MIN_DIM = 1;

let upngPromise = null;

/**
 * Lazily loads `upng-js` so the main bundle stays small until PNG quantization is needed.
 */
async function loadUpng() {
  if (!upngPromise) {
    upngPromise = import('upng-js')
      .then((mod) => {
        const candidate = mod?.default || mod;
        if (candidate && typeof candidate.encode === 'function') {
          return candidate;
        }
        if (mod && typeof mod.encode === 'function') {
          return mod;
        }
        throw new Error('PNG compression engine failed to initialize.');
      })
      .catch((err) => {
        upngPromise = null;
        throw err;
      });
  }
  return upngPromise;
}

/**
 * Clamps a pixel dimension to valid canvas bounds (1..10000 px).
 *
 * @param {number} value
 * @param {number} [fallback=1]
 * @returns {number}
 */
export function clampPixelDimension(value, fallback = 1) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return Math.max(MIN_DIM, Math.min(MAX_DIM, Math.round(fallback)));
  return Math.max(MIN_DIM, Math.min(MAX_DIM, Math.round(num)));
}

/**
 * Infers canonical image MIME type from File/Blob metadata or filename extension.
 *
 * @param {File | Blob} file
 * @returns {'image/jpeg' | 'image/png' | 'image/webp' | 'image/bmp'}
 */
export function inferImageMime(file) {
  const rawType = String(file?.type || '').toLowerCase();
  if (rawType === 'image/jpeg' || rawType === 'image/jpg') return 'image/jpeg';
  if (rawType === 'image/png') return 'image/png';
  if (rawType === 'image/webp') return 'image/webp';
  if (rawType === 'image/bmp' || rawType === 'image/x-ms-bmp') return 'image/bmp';

  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.bmp')) return 'image/bmp';
  return 'image/png';
}

/**
 * Builds a safe output filename for a processed image.
 *
 * @param {string} originalName
 * @param {string} suffix
 * @param {string} ext
 * @returns {string}
 */
export function buildImageOutputFilename(originalName, suffix, ext) {
  const stem = cleanBaseName(originalName, 'image');
  const safeExt = String(ext || 'png').replace(/^\./, '');
  return suffix ? `${stem}${suffix}.${safeExt}` : `${stem}.${safeExt}`;
}

/**
 * Loads a File/Blob into a canvas-drawable source with dimensions and deterministic cleanup.
 * Uses `createImageBitmap` first (which respects EXIF orientation) and falls back to `Image`.
 *
 * @param {Blob} file
 * @returns {Promise<{ source: ImageBitmap | HTMLImageElement, width: number, height: number, cleanup: () => void }>}
 */
async function loadImageDrawable(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => {
          try {
            bitmap.close();
          } catch {}
        },
      };
    } catch {
      // Fall back to HTMLImageElement below
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode this image file.'));
      el.src = url;
    });

    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      cleanup: () => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      },
    };
  } catch (err) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
    throw err;
  }
}

/**
 * Reads natural pixel dimensions of an uploaded image file.
 *
 * @param {Blob} file
 * @returns {Promise<{ width: number, height: number }>}
 */
export async function readImageMetadata(file) {
  const loaded = await loadImageDrawable(file);
  try {
    return { width: loaded.width, height: loaded.height };
  } finally {
    loaded.cleanup();
  }
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = clampPixelDimension(width);
  canvas.height = clampPixelDimension(height);
  return canvas;
}

function releaseCanvas(canvas) {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error(`Browser could not export image as ${IMAGE_MIME_LABELS[mime] || mime}.`));
        }
      },
      mime,
      quality
    );
  });
}

/**
 * Renders a source image onto a target canvas with multi-step downscaling for crisp details
 * and an optional solid background fill (used when exporting to JPG).
 *
 * @param {CanvasImageSource} source
 * @param {number} srcW
 * @param {number} srcH
 * @param {number} dstW
 * @param {number} dstH
 * @param {string | null} [backgroundColor=null]
 * @returns {HTMLCanvasElement}
 */
function drawResizedToCanvas(source, srcW, srcH, dstW, dstH, backgroundColor = null) {
  const targetW = clampPixelDimension(dstW);
  const targetH = clampPixelDimension(dstH);

  let currentSource = source;
  let currentW = srcW;
  let currentH = srcH;
  const intermediateCanvases = [];

  try {
    // Halve iteratively when shrinking more than 2x so edges stay sharp without aliasing.
    while (currentW * 0.5 > targetW && currentH * 0.5 > targetH) {
      const nextW = Math.max(targetW, Math.round(currentW * 0.5));
      const nextH = Math.max(targetH, Math.round(currentH * 0.5));
      if (nextW === currentW && nextH === currentH) break;

      const stepCanvas = createCanvas(nextW, nextH);
      const stepCtx = stepCanvas.getContext('2d');
      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = 'high';
      stepCtx.drawImage(currentSource, 0, 0, nextW, nextH);

      intermediateCanvases.push(stepCanvas);
      currentSource = stepCanvas;
      currentW = nextW;
      currentH = nextH;
    }

    const outCanvas = createCanvas(targetW, targetH);
    const outCtx = outCanvas.getContext('2d');
    if (backgroundColor) {
      outCtx.fillStyle = backgroundColor;
      outCtx.fillRect(0, 0, targetW, targetH);
    }
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(currentSource, 0, 0, targetW, targetH);
    return outCanvas;
  } finally {
    for (const c of intermediateCanvases) {
      releaseCanvas(c);
    }
  }
}

function getCanvasRgbaBuffer(canvas) {
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imgData;
  if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) {
    return data.buffer;
  }
  return data.slice().buffer;
}

/**
 * Encodes a canvas as PNG using UPNG (`cnum = 0` lossless or `16..256` palette quantization).
 */
async function encodeCanvasWithUpng(canvas, colorCount = 0) {
  const upng = await loadUpng();
  const rgbaBuffer = getCanvasRgbaBuffer(canvas);
  try {
    const encoded = upng.encode([rgbaBuffer], canvas.width, canvas.height, colorCount);
    return new Blob([encoded], { type: 'image/png' });
  } catch {
    // Fallback to lossless encoding on edge-case 1px images if quantization throws
    if (colorCount !== 0) {
      const lossless = upng.encode([rgbaBuffer], canvas.width, canvas.height, 0);
      return new Blob([lossless], { type: 'image/png' });
    }
    return canvasToBlob(canvas, 'image/png');
  }
}

function qualityToPngColorCount(quality) {
  const q = Number(quality);
  if (!Number.isFinite(q) || q >= 100) return 0;
  const clamped = Math.max(10, Math.min(99, q));
  return Math.max(16, Math.min(256, Math.round(16 + ((clamped - 10) / 89) * (256 - 16))));
}

/**
 * Computes target resize dimensions using the same rules used by `resizeImageFile`.
 * Useful for live dimension previews in the UI.
 */
export function calculateResizeDimensions(originalWidth, originalHeight, options = {}) {
  const srcW = clampPixelDimension(originalWidth);
  const srcH = clampPixelDimension(originalHeight);
  const {
    mode = 'preset',
    width,
    height,
    maintainAspectRatio = true,
    scalePercent = 50,
  } = options;

  if (mode === 'percentage') {
    const pct = Math.max(1, Math.min(500, Number(scalePercent) || 100));
    return {
      width: clampPixelDimension(srcW * (pct / 100)),
      height: clampPixelDimension(srcH * (pct / 100)),
    };
  }

  const reqW = Number(width);
  const reqH = Number(height);
  const hasW = Number.isFinite(reqW) && reqW > 0;
  const hasH = Number.isFinite(reqH) && reqH > 0;

  if (!maintainAspectRatio) {
    return {
      width: clampPixelDimension(hasW ? reqW : srcW),
      height: clampPixelDimension(hasH ? reqH : srcH),
    };
  }

  if (hasW && hasH) {
    const scale = Math.min(reqW / srcW, reqH / srcH);
    return {
      width: clampPixelDimension(srcW * scale),
      height: clampPixelDimension(srcH * scale),
    };
  }

  if (hasW) {
    return {
      width: clampPixelDimension(reqW),
      height: clampPixelDimension(reqW * (srcH / srcW)),
    };
  }

  if (hasH) {
    return {
      width: clampPixelDimension(reqH * (srcW / srcH)),
      height: clampPixelDimension(reqH),
    };
  }

  return { width: srcW, height: srcH };
}

/**
 * Binary-searches lossy quality (0.1..0.95) to fit under `targetBytes`.
 */
async function binarySearchLossyQuality(canvas, mime, targetBytes, minQ = 0.1, maxQ = 0.95, maxIterations = 7) {
  let bestFitting = null;
  let smallestSeen = null;

  const firstBlob = await canvasToBlob(canvas, mime, maxQ);
  if (firstBlob.size <= targetBytes) {
    return { blob: firstBlob, metTarget: true };
  }
  smallestSeen = firstBlob;

  let low = minQ;
  let high = maxQ;

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const candidate = await canvasToBlob(canvas, mime, mid);

    if (!smallestSeen || candidate.size < smallestSeen.size) {
      smallestSeen = candidate;
    }

    if (candidate.size <= targetBytes) {
      bestFitting = candidate;
      low = mid;
    } else {
      high = mid;
    }
  }

  if (bestFitting) {
    return { blob: bestFitting, metTarget: true };
  }

  const minBlob = await canvasToBlob(canvas, mime, minQ);
  if (minBlob.size <= targetBytes) {
    return { blob: minBlob, metTarget: true };
  }

  return {
    blob: minBlob.size < smallestSeen.size ? minBlob : smallestSeen,
    metTarget: false,
  };
}

/**
 * Resizes an image file to presets, custom pixel dimensions, or a percentage scale,
 * optionally targeting a maximum KB size.
 *
 * @param {File} file
 * @param {{
 *   mode?: 'preset' | 'custom' | 'percentage',
 *   width?: number,
 *   height?: number,
 *   maintainAspectRatio?: boolean,
 *   scalePercent?: number,
 *   outputFormat?: 'original' | 'image/jpeg' | 'image/png' | 'image/webp',
 *   quality?: number,
 *   targetSizeKb?: number,
 * }} [options]
 */
export async function resizeImageFile(file, options = {}) {
  const {
    mode = 'preset',
    width,
    height,
    maintainAspectRatio = true,
    scalePercent = 50,
    outputFormat = 'original',
    quality = 90,
    targetSizeKb = 0,
  } = options;

  const sourceMime = inferImageMime(file);
  const resolvedOriginalMime =
    sourceMime === 'image/jpeg' || sourceMime === 'image/png' || sourceMime === 'image/webp'
      ? sourceMime
      : 'image/png';
  const targetMime =
    outputFormat && outputFormat !== 'original' ? outputFormat : resolvedOriginalMime;
  const bgFill = targetMime === 'image/jpeg' ? '#ffffff' : null;
  const baseQuality = Math.max(0.1, Math.min(1, (Number(quality) || 90) / 100));
  const targetBytes = Number(targetSizeKb) > 0 ? Math.round(Number(targetSizeKb) * 1024) : 0;

  const loaded = await loadImageDrawable(file);
  let activeCanvas = null;

  try {
    const originalWidth = loaded.width;
    const originalHeight = loaded.height;
    const dims = calculateResizeDimensions(originalWidth, originalHeight, {
      mode,
      width,
      height,
      maintainAspectRatio,
      scalePercent,
    });

    let finalW = dims.width;
    let finalH = dims.height;
    activeCanvas = drawResizedToCanvas(loaded.source, originalWidth, originalHeight, finalW, finalH, bgFill);

    let resultBlob;
    let note = '';

    if (targetBytes <= 0) {
      resultBlob =
        targetMime === 'image/png'
          ? await canvasToBlob(activeCanvas, 'image/png')
          : await canvasToBlob(activeCanvas, targetMime, baseQuality);
    } else if (targetMime === 'image/png') {
      const losslessBlob = await canvasToBlob(activeCanvas, 'image/png');
      if (losslessBlob.size <= targetBytes) {
        resultBlob = losslessBlob;
      } else {
        let bestPng = losslessBlob;
        let met = false;
        const colorSteps = [256, 128, 64, 32];

        for (const cnum of colorSteps) {
          const quantized = await encodeCanvasWithUpng(activeCanvas, cnum);
          if (quantized.size < bestPng.size) {
            bestPng = quantized;
          }
          if (quantized.size <= targetBytes) {
            bestPng = quantized;
            met = true;
            break;
          }
        }

        resultBlob = bestPng;
        note = met
          ? 'Applied smart PNG palette compression to match your target KB.'
          : 'Lossless PNG could not reach that ultra-small KB target cleanly. Try JPG or WEBP for smaller file sizes.';
      }
    } else {
      const maxQ = Math.max(0.1, Math.min(0.95, baseQuality));
      let search = await binarySearchLossyQuality(activeCanvas, targetMime, targetBytes, 0.1, maxQ, 7);
      resultBlob = search.blob;

      if (!search.metTarget) {
        for (let step = 0; step < 3; step++) {
          const nextW = clampPixelDimension(finalW * 0.82);
          const nextH = clampPixelDimension(finalH * 0.82);
          if (nextW === finalW && nextH === finalH) break;

          releaseCanvas(activeCanvas);
          finalW = nextW;
          finalH = nextH;
          activeCanvas = drawResizedToCanvas(loaded.source, originalWidth, originalHeight, finalW, finalH, bgFill);
          search = await binarySearchLossyQuality(activeCanvas, targetMime, targetBytes, 0.1, 0.85, 7);
          if (search.blob.size < resultBlob.size) {
            resultBlob = search.blob;
          }
          if (search.metTarget) {
            resultBlob = search.blob;
            break;
          }
        }

        if (search.metTarget) {
          note = `Scaled dimensions slightly to ${finalW}×${finalH} to fit under ${targetSizeKb} KB.`;
        } else {
          note = `Reached closest size (${Math.round(resultBlob.size / 1024)} KB) without shrinking dimensions further.`;
        }
      }
    }

    return {
      blob: resultBlob,
      width: finalW,
      height: finalH,
      originalWidth,
      originalHeight,
      beforeBytes: file.size,
      afterBytes: resultBlob.size,
      mime: targetMime,
      ext: IMAGE_MIME_TO_EXT[targetMime] || 'png',
      note,
    };
  } finally {
    releaseCanvas(activeCanvas);
    loaded.cleanup();
  }
}

/**
 * Compresses JPG, PNG, or WEBP images using quality control or target KB/MB sizing.
 * Uses UPNG color quantization for real PNG size reduction.
 *
 * @param {File} file
 * @param {{
 *   mode?: 'quality' | 'target',
 *   quality?: number,
 *   targetSizeKb?: number,
 * }} [options]
 */
export async function compressImageFile(file, options = {}) {
  const { mode = 'quality', quality = 75, targetSizeKb = 200 } = options;

  const detectedMime = inferImageMime(file);
  const mime =
    detectedMime === 'image/jpeg' || detectedMime === 'image/png' || detectedMime === 'image/webp'
      ? detectedMime
      : 'image/png';
  const ext = IMAGE_MIME_TO_EXT[mime] || 'png';
  const bgFill = mime === 'image/jpeg' ? '#ffffff' : null;

  const loaded = await loadImageDrawable(file);
  let activeCanvas = null;

  try {
    let finalW = loaded.width;
    let finalH = loaded.height;
    activeCanvas = drawResizedToCanvas(loaded.source, loaded.width, loaded.height, finalW, finalH, bgFill);

    let resultBlob;
    let note = '';

    if (mode === 'target') {
      const targetBytes = Math.max(1024, Math.round((Number(targetSizeKb) || 200) * 1024));

      if (file.size <= targetBytes) {
        return {
          blob: file,
          width: finalW,
          height: finalH,
          beforeBytes: file.size,
          afterBytes: file.size,
          savedPercent: 0,
          mime,
          ext,
          note: 'This image is already within your target size, so the original file was kept.',
        };
      }

      if (mime === 'image/png') {
        const result256 = await encodeCanvasWithUpng(activeCanvas, 256);
        if (result256.size <= targetBytes) {
          const lossless = await encodeCanvasWithUpng(activeCanvas, 0);
          resultBlob = lossless.size <= targetBytes ? lossless : result256;
        } else {
          // Binary search color count between 16 and 256
          let low = 16;
          let high = 256;
          let bestFitting = null;
          let smallest = result256;

          for (let i = 0; i < 6; i++) {
            const mid = Math.round((low + high) / 2);
            const candidate = await encodeCanvasWithUpng(activeCanvas, mid);
            if (candidate.size < smallest.size) smallest = candidate;

            if (candidate.size <= targetBytes) {
              bestFitting = candidate;
              low = mid + 1;
            } else {
              high = mid - 1;
            }
          }

          if (bestFitting) {
            resultBlob = bestFitting;
          } else {
            const minColors = await encodeCanvasWithUpng(activeCanvas, 16);
            resultBlob = minColors.size < smallest.size ? minColors : smallest;

            if (resultBlob.size > targetBytes) {
              let met = false;
              for (let step = 0; step < 3; step++) {
                const nextW = clampPixelDimension(finalW * 0.85);
                const nextH = clampPixelDimension(finalH * 0.85);
                if (nextW === finalW && nextH === finalH) break;

                releaseCanvas(activeCanvas);
                finalW = nextW;
                finalH = nextH;
                activeCanvas = drawResizedToCanvas(loaded.source, loaded.width, loaded.height, finalW, finalH, bgFill);

                for (const cnum of [64, 32, 16]) {
                  const candidate = await encodeCanvasWithUpng(activeCanvas, cnum);
                  if (candidate.size < resultBlob.size) {
                    resultBlob = candidate;
                  }
                  if (candidate.size <= targetBytes) {
                    resultBlob = candidate;
                    met = true;
                    break;
                  }
                }
                if (met) break;
              }

              note = met
                ? `Reduced dimensions slightly to ${finalW}×${finalH} to meet your PNG target size.`
                : 'PNG could not reach that tiny KB target without losing clarity. Convert to JPG or WEBP for much smaller files.';
            }
          }
        }
      } else {
        let search = await binarySearchLossyQuality(activeCanvas, mime, targetBytes, 0.08, 0.95, 8);
        resultBlob = search.blob;

        if (!search.metTarget) {
          for (let step = 0; step < 3; step++) {
            const nextW = clampPixelDimension(finalW * 0.85);
            const nextH = clampPixelDimension(finalH * 0.85);
            if (nextW === finalW && nextH === finalH) break;

            releaseCanvas(activeCanvas);
            finalW = nextW;
            finalH = nextH;
            activeCanvas = drawResizedToCanvas(loaded.source, loaded.width, loaded.height, finalW, finalH, bgFill);

            search = await binarySearchLossyQuality(activeCanvas, mime, targetBytes, 0.08, 0.85, 7);
            if (search.blob.size < resultBlob.size) {
              resultBlob = search.blob;
            }
            if (search.metTarget) {
              resultBlob = search.blob;
              break;
            }
          }

          note = search.metTarget
            ? `Scaled dimensions slightly to ${finalW}×${finalH} to reach your target file size.`
            : `Compressed as far as practical (${Math.round(resultBlob.size / 1024)} KB).`;
        }
      }

      // Guard against rare cases where re-encoding exceeds original size
      if (resultBlob.size >= file.size) {
        resultBlob = file;
        finalW = loaded.width;
        finalH = loaded.height;
        note = 'This image is already well optimized, so the original file was kept.';
      }
    } else {
      const qNum = Math.max(10, Math.min(100, Number(quality) || 75));
      if (mime === 'image/png') {
        const cnum = qualityToPngColorCount(qNum);
        resultBlob = await encodeCanvasWithUpng(activeCanvas, cnum);
      } else {
        resultBlob = await canvasToBlob(activeCanvas, mime, Math.max(0.08, Math.min(1, qNum / 100)));
      }

      if (resultBlob.size >= file.size) {
        resultBlob = file;
        note = 'This image is already well optimized, so the original file was kept.';
      }
    }

    return {
      blob: resultBlob,
      width: finalW,
      height: finalH,
      beforeBytes: file.size,
      afterBytes: resultBlob.size,
      savedPercent: calcCompressionPercent(file.size, resultBlob.size),
      mime,
      ext,
      note,
    };
  } finally {
    releaseCanvas(activeCanvas);
    loaded.cleanup();
  }
}

/**
 * Converts JPG, JPEG, PNG, WEBP, or BMP files into PNG, JPG, or WEBP cleanly.
 * Fills transparent pixels with `backgroundColor` (default white) when exporting to JPG.
 *
 * @param {File} file
 * @param {{
 *   outputMime?: 'image/png' | 'image/jpeg' | 'image/webp',
 *   quality?: number,
 *   backgroundColor?: string,
 * }} [options]
 */
export async function convertImageFile(file, options = {}) {
  const {
    outputMime = 'image/png',
    quality = 92,
    backgroundColor = '#ffffff',
  } = options;

  const targetMime = IMAGE_MIME_TO_EXT[outputMime] ? outputMime : 'image/png';
  const ext = IMAGE_MIME_TO_EXT[targetMime] || 'png';
  const bgFill = targetMime === 'image/jpeg' ? backgroundColor || '#ffffff' : null;

  const loaded = await loadImageDrawable(file);
  let activeCanvas = null;

  try {
    activeCanvas = drawResizedToCanvas(
      loaded.source,
      loaded.width,
      loaded.height,
      loaded.width,
      loaded.height,
      bgFill
    );

    const blob =
      targetMime === 'image/png'
        ? await canvasToBlob(activeCanvas, 'image/png')
        : await canvasToBlob(activeCanvas, targetMime, Math.max(0.1, Math.min(1, (Number(quality) || 92) / 100)));

    return {
      blob,
      width: loaded.width,
      height: loaded.height,
      beforeBytes: file.size,
      afterBytes: blob.size,
      mime: targetMime,
      ext,
    };
  } finally {
    releaseCanvas(activeCanvas);
    loaded.cleanup();
  }
}
