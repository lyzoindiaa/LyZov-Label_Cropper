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
        timeoutMs: 6000,
      });
    } catch {
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
    const foundImages = [];
    const addImage = (u) => {
      if (!u || typeof u !== 'string') return;
      try {
        const abs = new URL(u.trim(), url).href;
        if (!/^https?:\/\//i.test(abs)) return;
        if (/logo|banner|icon|avatar|favicon/i.test(abs)) return;
        if (!foundImages.includes(abs)) foundImages.push(abs);
      } catch {}
    };

    if (meta.imageUrl) addImage(meta.imageUrl);

    // Collect JSON-LD gallery images if available
    const ldMatches = [
      ...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gis),
    ];
    for (const m of ldMatches) {
      try {
        const data = JSON.parse(m[1]);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item['@type'] === 'Product' || item.image) {
            const imgs = Array.isArray(item.image) ? item.image : [item.image];
            imgs.forEach((img) => {
              if (typeof img === 'string') addImage(img);
              else if (img && typeof img.url === 'string') addImage(img.url);
            });
          }
        }
      } catch {}
    }

    if (foundImages.length === 0) {
      const anyImgs = [...html.matchAll(/https?:\/\/[^"'\s\\]+\.(?:jpg|jpeg|png|webp)/gi)].map(
        (m) => m[0]
      );
      anyImgs.slice(0, 6).forEach(addImage);
    }

    if (foundImages.length === 0) {
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
      title: meta.title || 'Store Product',
      imageUrl: foundImages[0],
      images: foundImages.slice(0, 12),
      platform: platformName,
      category: 'E-Commerce Product',
      sourceUrl: url,
    };
  }
}
