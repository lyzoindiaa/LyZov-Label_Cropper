/**
 * Client-side file validation using magic-byte signatures (not just filename extensions)
 * and user-friendly error messages.
 */

export const MAX_IMAGE_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_BG_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB (ONNX WASM memory safety)
export const MAX_PDF_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_DOCX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

const SIGNATURE_DETECTORS = [
  {
    type: 'jpeg',
    mime: 'image/jpeg',
    match: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    type: 'png',
    mime: 'image/png',
    match: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    type: 'webp',
    mime: 'image/webp',
    match: (b) =>
      b.length >= 12 &&
      b[0] === 0x52 && // R
      b[1] === 0x49 && // I
      b[2] === 0x46 && // F
      b[3] === 0x46 && // F
      b[8] === 0x57 && // W
      b[9] === 0x45 && // E
      b[10] === 0x42 && // B
      b[11] === 0x50, // P
  },
  {
    type: 'bmp',
    mime: 'image/bmp',
    match: (b) => b.length >= 2 && b[0] === 0x42 && b[1] === 0x4d, // BM
  },
  {
    type: 'gif',
    mime: 'image/gif',
    match: (b) => b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  },
  {
    type: 'pdf',
    mime: 'application/pdf',
    // Allow optional leading whitespace/BOM before %PDF-
    match: (b) => {
      if (b.length < 5) return false;
      const limit = Math.min(b.length - 4, 16);
      for (let i = 0; i <= limit; i++) {
        if (
          b[i] === 0x25 && // %
          b[i + 1] === 0x50 && // P
          b[i + 2] === 0x44 && // D
          b[i + 3] === 0x46 && // F
          b[i + 4] === 0x2d // -
        ) {
          return true;
        }
      }
      return false;
    },
  },
  {
    type: 'zip_ooxml',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    match: (b) =>
      b.length >= 4 &&
      b[0] === 0x50 &&
      b[1] === 0x4b &&
      (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07),
  },
  {
    type: 'doc_ole2',
    mime: 'application/msword',
    match: (b) =>
      b.length >= 8 &&
      b[0] === 0xd0 &&
      b[1] === 0xcf &&
      b[2] === 0x11 &&
      b[3] === 0xe0 &&
      b[4] === 0xa1 &&
      b[5] === 0xb1 &&
      b[6] === 0x1a &&
      b[7] === 0xe1,
  },
];

/**
 * Inspects raw leading bytes and returns the detected file type tag.
 *
 * @param {Uint8Array} bytes
 * @returns {string | null}
 */
export function detectMagicFileType(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) return null;
  for (const detector of SIGNATURE_DETECTORS) {
    if (detector.match(bytes)) {
      return detector.type;
    }
  }
  return null;
}

/**
 * Reads up to 64 header bytes from a File/Blob without reading the whole file into RAM.
 *
 * @param {Blob} file
 * @returns {Promise<Uint8Array>}
 */
export async function readFileHeaderBytes(file) {
  const slice = file.slice(0, 64);
  const buffer = await slice.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Validates a list of files against allowed magic-byte types and max file size.
 *
 * @param {FileList | File[]} fileList
 * @param {{
 *   allowedTypes: string[],
 *   maxFileSizeBytes?: number,
 *   maxFiles?: number,
 *   formatLabel?: string,
 * }} options
 * @returns {Promise<{ valid: Array<{ file: File, detectedType: string }>, errors: string[] }>}
 */
export async function validateUploadedFiles(fileList, options) {
  const files = Array.from(fileList || []);
  const {
    allowedTypes = [],
    maxFileSizeBytes = MAX_IMAGE_FILE_BYTES,
    maxFiles = 50,
    formatLabel = 'selected format',
  } = options || {};

  if (files.length === 0) {
    return { valid: [], errors: ['Please select a file first.'] };
  }

  const valid = [];
  const errors = [];

  for (const file of files) {
    if (!file || file.size === 0) {
      errors.push(`"${file?.name || 'File'}" is empty.`);
      continue;
    }

    if (file.size > maxFileSizeBytes) {
      errors.push(
        `"${file.name}" is too large (${formatBytes(file.size)}). Maximum allowed size is ${formatBytes(maxFileSizeBytes)}.`
      );
      continue;
    }

    let headerBytes;
    try {
      headerBytes = await readFileHeaderBytes(file);
    } catch {
      errors.push(`Could not read "${file.name}". Please try selecting it again.`);
      continue;
    }

    const detected = detectMagicFileType(headerBytes);
    if (!detected || !allowedTypes.includes(detected)) {
      if (detected === 'doc_ole2' && allowedTypes.includes('zip_ooxml')) {
        errors.push(
          `"${file.name}" is an older binary .doc file. Please save it as .docx in Word or Google Docs and try again.`
        );
      } else {
        errors.push(
          `"${file.name}" is not a supported ${formatLabel}. Please upload a valid file.`
        );
      }
      continue;
    }

    if (valid.length >= maxFiles) {
      errors.push(`Maximum ${maxFiles} files can be processed in one batch.`);
      break;
    }

    valid.push({ file, detectedType: detected });
  }

  return { valid, errors };
}

/**
 * Formats byte counts into clean human-readable labels (B, KB, MB).
 *
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb >= 100 ? Math.round(kb) : kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Formats file size reduction percentage safely.
 *
 * @param {number} beforeBytes
 * @param {number} afterBytes
 * @returns {number}
 */
export function calcCompressionPercent(beforeBytes, afterBytes) {
  if (!beforeBytes || beforeBytes <= 0) return 0;
  return Math.round(((beforeBytes - afterBytes) / beforeBytes) * 100);
}

/**
 * Strips extension and unsafe characters to create a clean download filename stem.
 *
 * @param {string} filename
 * @param {string} fallback
 * @returns {string}
 */
export function cleanBaseName(filename = '', fallback = 'file') {
  const withoutExt = String(filename).replace(/\.[^/.]+$/, '');
  const sanitized = withoutExt.replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '');
  return sanitized.slice(0, 64) || fallback;
}

/**
 * Maps unknown errors to safe, plain-English messages for end users.
 *
 * @param {unknown} err
 * @param {string} fallback
 * @returns {string}
 */
export function toFriendlyErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const msg = typeof err === 'string' ? err : err?.message || '';
  if (!msg) return fallback;
  if (/password|encrypted/i.test(msg)) {
    return 'This PDF is password-protected. Please unlock it first and upload the unlocked file.';
  }
  if (/memory|oom|out of memory|allocation/i.test(msg)) {
    return 'This file is too large for your browser memory. Try a smaller file or process fewer items at once.';
  }
  if (/network|fetch|failed to fetch/i.test(msg)) {
    return 'A required browser resource could not be downloaded. Check your internet connection and try again.';
  }
  return msg.length > 220 ? fallback : msg;
}
