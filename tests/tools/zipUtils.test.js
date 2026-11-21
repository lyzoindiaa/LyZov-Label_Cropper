import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { createUrlRegistry } from '../../src/utils/zipUtils.js';

describe('ZIP & URL Registry utilities', () => {
  it('createUrlRegistry creates and cleanly revokes object URLs', () => {
    const registry = createUrlRegistry();
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const url = registry.create(blob);
    assert.ok(typeof url === 'string' && url.startsWith('blob:'));
    registry.revoke(url);
    registry.revokeAll();
  });

  it('JSZip generates a valid ZIP archive buffer from multiple blobs', async () => {
    const zip = new JSZip();
    zip.file('a.txt', 'alpha');
    zip.file('b.txt', 'beta');
    const out = await zip.generateAsync({ type: 'uint8array' });
    assert.equal(out[0], 0x50); // P
    assert.equal(out[1], 0x4b); // K
    const reloaded = await JSZip.loadAsync(out);
    assert.equal(await reloaded.file('a.txt').async('string'), 'alpha');
    assert.equal(await reloaded.file('b.txt').async('string'), 'beta');
  });
});
