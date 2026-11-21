import JSZip from 'jszip';
import fileSaver from 'file-saver';

const saveAs = fileSaver?.saveAs || fileSaver;

/**
 * Triggers a single file download from a Blob without leaking object URLs.
 *
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  if (!blob) return;
  saveAs(blob, filename);
}

/**
 * Packages multiple processed blobs into a single ZIP archive and saves it.
 * Deduplicates filenames automatically so batch items never overwrite one another.
 *
 * @param {Array<{ blob: Blob, filename: string }>} items
 * @param {string} zipFilename
 * @param {string} [folderName]
 * @returns {Promise<void>}
 */
export async function downloadItemsAsZip(items, zipFilename, folderName = '') {
  const validItems = (items || []).filter((item) => item && item.blob);
  if (validItems.length === 0) {
    throw new Error('No processed files are ready to download.');
  }

  const zip = new JSZip();
  const target = folderName ? zip.folder(folderName) : zip;
  const usedNames = new Map();

  for (const item of validItems) {
    const rawName = item.filename || 'file';
    const count = usedNames.get(rawName) || 0;
    usedNames.set(rawName, count + 1);

    let finalName = rawName;
    if (count > 0) {
      const dotIdx = rawName.lastIndexOf('.');
      finalName =
        dotIdx > 0
          ? `${rawName.slice(0, dotIdx)}_${count + 1}${rawName.slice(dotIdx)}`
          : `${rawName}_${count + 1}`;
    }

    target.file(finalName, item.blob);
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  saveAs(zipBlob, zipFilename || `lyzov_files_${Date.now()}.zip`);
}

/**
 * Helper to manage created Object URLs and revoke them cleanly on unmount or reset.
 */
export function createUrlRegistry() {
  const urls = new Set();

  return {
    create(blob) {
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      urls.add(url);
      return url;
    },
    revoke(url) {
      if (!url) return;
      try {
        URL.revokeObjectURL(url);
      } catch {}
      urls.delete(url);
    },
    revokeAll() {
      for (const url of urls) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
      urls.clear();
    },
  };
}
