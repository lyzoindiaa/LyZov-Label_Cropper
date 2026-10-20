import { BaseExtractor } from './BaseExtractor.js';
import { safeFetchText, parseHtmlMetadata } from '../../utils/httpHelper.js';

export class OpenGraphExtractor extends BaseExtractor {
  constructor() {
    super('opengraph');
  }

  canHandle(url) {
    return true; // Universal fallback
  }

  async extract(url) {
    let html = '';
    try {
      html = await safeFetchText(url, {
        timeoutMs: 7000,
      });
    } catch (err) {
      const timeoutErr = new Error('Product page request timed out or was unreachable.');
      timeoutErr.code = 'TIMEOUT';
      throw timeoutErr;
    }

    if (!html) {
      const err = new Error('Failed to load product page from e-commerce store.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const meta = parseHtmlMetadata(html, url);

    let imageUrl = meta.imageUrl;
    let title = meta.title;

    if (!imageUrl) {
      // Look for any clean product images in HTML
      const anyImgs = [...html.matchAll(/https?:\/\/[^"'\s\\]+\.(jpg|jpeg|png|webp)/gi)].map(m => m[0]);
      const valid = anyImgs.filter(u => !u.includes('logo') && !u.includes('banner') && !u.includes('icon') && !u.includes('avatar'));
      if (valid.length > 0) {
        imageUrl = valid[0];
      }
    }

    if (!imageUrl) {
      const err = new Error('No product image was found on the specified page.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    let platformName = 'generic';
    try {
      const domain = new URL(url).hostname.replace(/^www\./i, '');
      if (domain.includes('meesho')) platformName = 'meesho';
      else if (domain.includes('myntra')) platformName = 'myntra';
      else if (domain.includes('ajio')) platformName = 'ajio';
      else if (domain.includes('tatacliq')) platformName = 'tatacliq';
    } catch {}

    return {
      title: title || 'Store Product',
      imageUrl,
      images: [imageUrl],
      platform: platformName,
      category: 'E-Commerce Product',
      sourceUrl: url,
    };
  }
}
