import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateSafeUrl } from '../../server/src/utils/ssrfGuard.js';
import { extractorRegistry } from '../../server/src/services/extractors/ExtractorRegistry.js';
import { detectPlatform, PLATFORMS } from '../../src/image-extractor/mockData.js';

describe('SSRF Guard & URL Safety Verification', () => {
  it('should block localhost and local domain variations', async () => {
    await assert.rejects(
      () => validateSafeUrl('http://localhost:5000/api/secret'),
      (err) => err.code === 'BLOCKED'
    );
    await assert.rejects(
      () => validateSafeUrl('http://sub.localhost:8080'),
      (err) => err.code === 'BLOCKED'
    );
    await assert.rejects(
      () => validateSafeUrl('http://app.local'),
      (err) => err.code === 'BLOCKED'
    );
  });

  it('should block private IPv4 loopback and local ranges', async () => {
    await assert.rejects(
      () => validateSafeUrl('http://127.0.0.1:3000'),
      (err) => err.code === 'BLOCKED'
    );
    await assert.rejects(
      () => validateSafeUrl('http://10.0.0.1:80'),
      (err) => err.code === 'BLOCKED'
    );
    await assert.rejects(
      () => validateSafeUrl('http://192.168.1.1:80'),
      (err) => err.code === 'BLOCKED'
    );
    await assert.rejects(
      () => validateSafeUrl('http://172.16.0.1:8080'),
      (err) => err.code === 'BLOCKED'
    );
  });

  it('should block AWS / Cloud metadata IP (169.254.169.254)', async () => {
    await assert.rejects(
      () => validateSafeUrl('http://169.254.169.254/latest/meta-data/'),
      (err) => err.code === 'BLOCKED'
    );
  });

  it('should reject non-HTTP/HTTPS protocols and invalid URLs', async () => {
    await assert.rejects(
      () => validateSafeUrl('ftp://example.com/file.txt'),
      (err) => err.code === 'INVALID_URL'
    );
    await assert.rejects(
      () => validateSafeUrl('file:///etc/passwd'),
      (err) => err.code === 'INVALID_URL'
    );
    await assert.rejects(
      () => validateSafeUrl('javascript:alert(1)'),
      (err) => err.code === 'INVALID_URL'
    );
    await assert.rejects(
      () => validateSafeUrl(''),
      (err) => err.code === 'INVALID_URL'
    );
  });

  it('should accept valid public URLs', async () => {
    const url = 'https://www.flipkart.com/boat-airdopes/p/itm123';
    const validated = await validateSafeUrl(url);
    assert.strictEqual(validated, url);
  });
});

describe('Platform Detector Engine', () => {
  it('should accurately detect major e-commerce platforms', () => {
    assert.strictEqual(detectPlatform('https://www.amazon.in/dp/B0CX21C8T6'), PLATFORMS.amazon);
    assert.strictEqual(detectPlatform('https://amzn.in/d/2X8abc'), PLATFORMS.amazon);
    assert.strictEqual(detectPlatform('https://www.flipkart.com/shoes/p/itm987'), PLATFORMS.flipkart);
    assert.strictEqual(detectPlatform('https://fkrt.it/xyz'), PLATFORMS.flipkart);
    assert.strictEqual(detectPlatform('https://www.meesho.com/s/p/abc'), PLATFORMS.meesho);
    assert.strictEqual(detectPlatform('https://www.myntra.com/tshirt/nike/123/buy'), PLATFORMS.myntra);
  });

  it('should fall back to generic platform for unknown stores', () => {
    assert.strictEqual(detectPlatform('https://mystore.example.com/item/1'), PLATFORMS.generic);
    assert.strictEqual(detectPlatform('not-a-valid-url'), null);
  });
});

describe('Extractor Registry Routing', () => {
  it('should route Flipkart and Amazon URLs to their dedicated extractors', () => {
    const flipkartExtractor = extractorRegistry.extractors.find(e => e.name === 'flipkart');
    assert.ok(flipkartExtractor);
    assert.strictEqual(flipkartExtractor.canHandle('https://www.flipkart.com/product/p/123'), true);
    assert.strictEqual(flipkartExtractor.canHandle('https://www.amazon.in/dp/123'), false);

    const amazonExtractor = extractorRegistry.extractors.find(e => e.name === 'amazon');
    assert.ok(amazonExtractor);
    assert.strictEqual(amazonExtractor.canHandle('https://www.amazon.in/dp/123'), true);
    assert.strictEqual(amazonExtractor.canHandle('https://www.flipkart.com/p/123'), false);
  });

  it('should route other URLs to OpenGraphExtractor fallback', () => {
    const ogExtractor = extractorRegistry.extractors.find(e => e.name === 'opengraph');
    assert.ok(ogExtractor);
    assert.strictEqual(ogExtractor.canHandle('https://randomstore.com/item'), true);
  });
});
