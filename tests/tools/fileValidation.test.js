import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectMagicFileType,
  validateUploadedFiles,
  formatBytes,
  calcCompressionPercent,
  cleanBaseName,
  toFriendlyErrorMessage,
} from '../../src/utils/fileValidation.js';

describe('Magic-byte file validation & helpers', () => {
  it('detects PNG, JPEG, WEBP, BMP, PDF, OOXML DOCX, and legacy DOC signatures', () => {
    assert.equal(
      detectMagicFileType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      'png'
    );
    assert.equal(detectMagicFileType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'jpeg');
    assert.equal(
      detectMagicFileType(
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
      ),
      'webp'
    );
    assert.equal(detectMagicFileType(new Uint8Array([0x42, 0x4d, 0x10, 0x00])), 'bmp');
    assert.equal(detectMagicFileType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])), 'pdf');
    assert.equal(detectMagicFileType(new Uint8Array([0x50, 0x4b, 0x03, 0x04])), 'zip_ooxml');
    assert.equal(
      detectMagicFileType(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])),
      'doc_ole2'
    );
  });

  it('rejects files with spoofed extensions whose magic bytes do not match', async () => {
    const fakePdf = new File([new Uint8Array([0x4d, 0x5a, 0x90, 0x00])], 'invoice.pdf', {
      type: 'application/pdf',
    });

    const result = await validateUploadedFiles([fakePdf], {
      allowedTypes: ['pdf'],
      formatLabel: 'PDF',
    });

    assert.equal(result.valid.length, 0);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /not a supported PDF/i);
  });

  it('explains legacy binary .doc files clearly when .docx is expected', async () => {
    const legacyDoc = new File(
      [new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])],
      'report.doc',
      { type: 'application/msword' }
    );

    const result = await validateUploadedFiles([legacyDoc], {
      allowedTypes: ['zip_ooxml'],
      formatLabel: 'Word document (.docx)',
    });

    assert.equal(result.valid.length, 0);
    assert.match(result.errors[0], /\.docx/i);
  });

  it('enforces max file size and max batch count', async () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const validFile = new File([pngHeader], 'photo.png', { type: 'image/png' });
    const oversizedFile = new File([new Uint8Array(2048)], 'big.png', { type: 'image/png' });

    const res = await validateUploadedFiles([validFile, oversizedFile], {
      allowedTypes: ['png'],
      maxFileSizeBytes: 1024,
      formatLabel: 'PNG image',
    });

    assert.equal(res.valid.length, 1);
    assert.equal(res.errors.length, 1);
    assert.match(res.errors[0], /too large/i);
  });

  it('formats sizes, compression percentage, filenames, and friendly errors', () => {
    assert.equal(formatBytes(500), '500 B');
    assert.equal(formatBytes(2048), '2.0 KB');
    assert.equal(calcCompressionPercent(1000, 400), 60);
    assert.equal(cleanBaseName('My Photo (Final).png'), 'My_Photo_Final');
    assert.match(toFriendlyErrorMessage(new Error('PasswordException')), /password-protected/i);
  });
});
