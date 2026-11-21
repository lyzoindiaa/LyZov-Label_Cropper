import { detectMagicFileType, readFileHeaderBytes } from './fileValidation.js';

export const MAX_AI_DIMENSION = 2400;

const SUPPORTED_IMGLY_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const MAGIC_TO_MIME = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

let removeBackgroundPromise = null;

/**
 * Lazily loads `@imgly/background-removal` only when the user runs background removal.
 */
async function loadRemoveBackgroundFn() {
  if (!removeBackgroundPromise) {
    removeBackgroundPromise = import('@imgly/background-removal')
      .then((mod) => {
        const removeBackground = mod?.removeBackground || mod?.default;
        if (typeof removeBackground !== 'function') {
          throw new Error('Background removal runtime failed to initialize.');
        }
        return removeBackground;
      })
      .catch((err) => {
        removeBackgroundPromise = null;
        throw err;
      });
  }
  return removeBackgroundPromise;
}

function createWorkingCanvas(width, height) {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  throw new Error('Canvas rendering is not supported in this browser.');
}

function releaseCanvasMemory(canvas) {
  if (!canvas) return;
  try {
    canvas.width = 0;
    canvas.height = 0;
  } catch {
    // Ignore cleanup errors on restricted canvas implementations
  }
}

async function canvasToBlob(canvas, mimeType, quality) {
  if (typeof canvas.convertToBlob === 'function') {
    return canvas.convertToBlob({ type: mimeType, quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not export the processed image.'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

async function decodeImageToSource(blob) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => {
          try {
            bitmap.close();
          } catch {
            // Ignore close errors
          }
        },
      };
    } catch {
      // Fallback to HTMLImageElement below
    }
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        cleanup: () => {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {
            // Ignore revoke errors
          }
        },
      });
    };
    img.onerror = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // Ignore revoke errors
      }
      reject(new Error('Could not decode this image file. Please try another photo.'));
    };
    img.src = objectUrl;
  });
}

/**
 * Ensures the Blob carries a MIME type accepted by `@imgly/background-removal`
 * even when the browser leaves `file.type` empty.
 */
async function ensureSupportedBlobMime(file) {
  if (file.type && SUPPORTED_IMGLY_MIME_TYPES.has(file.type.toLowerCase())) {
    return file;
  }
  const headerBytes = await readFileHeaderBytes(file);
  const detectedType = detectMagicFileType(headerBytes);
  const resolvedMime = MAGIC_TO_MIME[detectedType] || 'image/png';
  return new Blob([file], { type: resolvedMime });
}

/**
 * Pre-resizes oversized images (> MAX_AI_DIMENSION on the longest side) on an
 * offscreen canvas before inference to prevent browser OOM errors.
 */
async function prepareImageForInference(file) {
  const decoded = await decodeImageToSource(file);
  let workingCanvas = null;

  try {
    const originalWidth = decoded.width;
    const originalHeight = decoded.height;
    if (!originalWidth || !originalHeight) {
      throw new Error('This image has invalid dimensions and cannot be processed.');
    }

    const longestSide = Math.max(originalWidth, originalHeight);
    if (longestSide <= MAX_AI_DIMENSION) {
      const inputBlob = await ensureSupportedBlobMime(file);
      return {
        inputBlob,
        width: originalWidth,
        height: originalHeight,
        originalWidth,
        originalHeight,
        wasDownscaled: false,
      };
    }

    const scale = MAX_AI_DIMENSION / longestSide;
    const targetWidth = Math.max(1, Math.round(originalWidth * scale));
    const targetHeight = Math.max(1, Math.round(originalHeight * scale));

    workingCanvas = createWorkingCanvas(targetWidth, targetHeight);
    const ctx = workingCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context is unavailable in this browser.');
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(decoded.source, 0, 0, targetWidth, targetHeight);

    const resizedBlob = await canvasToBlob(workingCanvas, 'image/png', 0.95);
    return {
      inputBlob: resizedBlob,
      width: targetWidth,
      height: targetHeight,
      originalWidth,
      originalHeight,
      wasDownscaled: true,
    };
  } finally {
    decoded.cleanup();
    releaseCanvasMemory(workingCanvas);
  }
}

function createProgressTranslator(onProgress) {
  let sawFetch = false;

  return (key, current, total) => {
    if (typeof onProgress !== 'function') return;

    const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;
    const safeCurrent = Number.isFinite(current) && current >= 0 ? current : 0;
    const rawRatio = safeTotal > 0 ? Math.min(1, Math.max(0, safeCurrent / safeTotal)) : 0;

    if (typeof key === 'string' && key.startsWith('fetch:')) {
      sawFetch = true;
      if (key.includes('/models/')) {
        const pct = safeTotal > 0 ? Math.round(rawRatio * 100) : null;
        const label =
          pct !== null
            ? `Downloading AI model (first time only · ${pct}%)...`
            : 'Downloading AI model (first time only)...';
        onProgress(label, 0.05 + rawRatio * 0.55);
      } else {
        onProgress('Loading AI runtime (first time only)...', 0.6 + rawRatio * 0.15);
      }
      return;
    }

    const base = sawFetch ? 0.76 : 0.15;
    const span = 1 - base;

    switch (key) {
      case 'compute:decode':
        onProgress('Preparing image for AI...', base + span * 0.1);
        break;
      case 'compute:inference':
        onProgress('Removing background...', base + span * 0.45);
        break;
      case 'compute:mask':
        onProgress('Refining cutout edges...', base + span * 0.78);
        break;
      case 'compute:encode':
        if (safeTotal > 0 && safeCurrent >= safeTotal) {
          onProgress('Transparent cutout ready', 1);
        } else {
          onProgress('Saving transparent cutout...', base + span * 0.92);
        }
        break;
      default:
        onProgress('Removing background...', base + span * rawRatio);
        break;
    }
  };
}

/**
 * Runs on-device AI background segmentation via `@imgly/background-removal`.
 *
 * @param {File | Blob} file
 * @param {{
 *   modelQuality?: 'fast' | 'high',
 *   onProgress?: (stageLabel: string, ratio: number) => void,
 * }} [options]
 * @returns {Promise<{
 *   cutoutBlob: Blob,
 *   width: number,
 *   height: number,
 *   originalWidth: number,
 *   originalHeight: number,
 *   wasDownscaled: boolean,
 * }>}
 */
export async function removeImageBackground(file, options = {}) {
  if (!file) {
    throw new Error('Please choose an image file first.');
  }

  const { modelQuality = 'high', onProgress } = options;
  const model = modelQuality === 'fast' ? 'isnet_quint8' : 'isnet_fp16';

  onProgress?.('Preparing image...', 0.03);
  const prepared = await prepareImageForInference(file);

  onProgress?.('Initializing AI background remover...', 0.05);
  const removeBackground = await loadRemoveBackgroundFn();

  const progressHandler = createProgressTranslator(onProgress);
  const cutoutBlob = await removeBackground(prepared.inputBlob, {
    model,
    output: { format: 'image/png', quality: 0.95 },
    progress: progressHandler,
  });

  if (!cutoutBlob || cutoutBlob.size === 0) {
    throw new Error('AI background removal returned an empty result. Please try another photo.');
  }

  onProgress?.('Transparent cutout ready', 1);

  return {
    cutoutBlob,
    width: prepared.width,
    height: prepared.height,
    originalWidth: prepared.originalWidth,
    originalHeight: prepared.originalHeight,
    wasDownscaled: prepared.wasDownscaled,
  };
}

/**
 * Composites a transparent cutout PNG onto transparent, clean white, or a custom solid color
 * without re-running AI inference.
 *
 * @param {Blob} cutoutBlob
 * @param {{
 *   bgMode?: 'transparent' | 'white' | 'custom',
 *   customColor?: string,
 *   outputFormat?: 'image/png' | 'image/jpeg',
 *   quality?: number,
 * }} [options]
 * @returns {Promise<Blob>}
 */
export async function compositeCutoutBackground(cutoutBlob, options = {}) {
  if (!cutoutBlob) {
    throw new Error('Cutout image is missing.');
  }

  const {
    bgMode = 'transparent',
    customColor = '#00c9ff',
    outputFormat = 'image/png',
    quality = 0.94,
  } = options;

  if (bgMode === 'transparent' && outputFormat === 'image/png') {
    return cutoutBlob;
  }

  let fillColor = null;
  if (bgMode === 'white') {
    fillColor = '#ffffff';
  } else if (bgMode === 'custom') {
    fillColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(customColor).trim())
      ? String(customColor).trim()
      : '#00c9ff';
  } else if (outputFormat === 'image/jpeg') {
    // JPEG has no alpha channel; fill with white to prevent black background artifacts
    fillColor = '#ffffff';
  }

  const decoded = await decodeImageToSource(cutoutBlob);
  let canvas = null;

  try {
    canvas = createWorkingCanvas(decoded.width, decoded.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context is unavailable in this browser.');
    }

    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, decoded.width, decoded.height);
    }

    ctx.drawImage(decoded.source, 0, 0, decoded.width, decoded.height);
    return await canvasToBlob(canvas, outputFormat, quality);
  } finally {
    decoded.cleanup();
    releaseCanvasMemory(canvas);
  }
}
