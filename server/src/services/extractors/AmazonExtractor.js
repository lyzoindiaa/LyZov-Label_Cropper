import { BaseExtractor } from './BaseExtractor.js';
import { safeFetchText, parseHtmlMetadata } from '../../utils/httpHelper.js';

const CURATED_CATEGORY_GALLERIES = {
  shoes: [
    '/products/shoes.jpg',
    '/products/shoes_2.jpg',
    '/products/shoes_3.jpg',
    '/products/shoes_4.jpg',
  ],
  footwear: [
    '/products/shoes.jpg',
    '/products/shoes_2.jpg',
    '/products/shoes_3.jpg',
    '/products/shoes_4.jpg',
  ],
  sneakers: [
    '/products/shoes.jpg',
    '/products/shoes_2.jpg',
    '/products/shoes_3.jpg',
    '/products/shoes_4.jpg',
  ],
  watch: [
    '/products/watch.jpg',
    '/products/watch_2.jpg',
  ],
  smartwatch: [
    '/products/watch.jpg',
    '/products/watch_2.jpg',
  ],
  headphones: [
    '/products/headphones.jpg',
  ],
  shirt: [
    '/products/shirt.jpg',
    '/products/shirt_2.jpg',
  ],
  backpack: [
    '/products/generic.jpg',
  ],
  phone: [
    '/products/generic.jpg',
  ],
  generic: [
    '/products/generic.jpg',
  ],
};

export class AmazonExtractor extends BaseExtractor {
  constructor() {
    super('amazon');
  }

  canHandle(url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      return host.includes('amazon.') || host.includes('amzn.in') || host.includes('amzn.to');
    } catch {
      return false;
    }
  }

  upgradeAmazonResolution(imgUrl) {
    if (!imgUrl) return imgUrl;
    return imgUrl.replace(/\._[A-Z0-9_,-]+_\./i, '.');
  }

  parseTitleFromSlug(url) {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const slug = parts[0] !== 'dp' ? parts[0] : parts[1] || '';
      if (slug) {
        return decodeURIComponent(slug)
          .replace(/[-_+.]+/g, ' ')
          .split(' ')
          .filter((w) => w && !/^[0-9a-f]{8,}$/i.test(w) && !/^B0[0-9A-Z]{8}$/i.test(w))
          .map((w) => {
            const lower = w.toLowerCase();
            if (['red', 'tape', 'boat', 'nike', 'apple', 'puma', 'adidas', 'sony'].includes(lower)) {
              return w.toUpperCase();
            }
            return w.charAt(0).toUpperCase() + lower.slice(1);
          })
          .join(' ');
      }
    } catch {}
    return null;
  }

  detectCategory(titleOrUrl = '') {
    const text = titleOrUrl.toLowerCase();
    if (text.includes('shoe') || text.includes('sneaker') || text.includes('walking') || text.includes('footwear')) {
      return { category: 'Footwear / Shoes', gallery: CURATED_CATEGORY_GALLERIES.shoes };
    }
    if (text.includes('watch') || text.includes('dial') || text.includes('strap')) {
      return { category: 'Watches', gallery: CURATED_CATEGORY_GALLERIES.watch };
    }
    if (text.includes('headphone') || text.includes('earbud') || text.includes('airpods') || text.includes('audio')) {
      return { category: 'Audio & Gadgets', gallery: CURATED_CATEGORY_GALLERIES.headphones };
    }
    if (text.includes('shirt') || text.includes('tshirt') || text.includes('jeans') || text.includes('dress')) {
      return { category: 'Fashion & Apparel', gallery: CURATED_CATEGORY_GALLERIES.shirt };
    }
    if (text.includes('bag') || text.includes('backpack') || text.includes('luggage')) {
      return { category: 'Bags & Luggage', gallery: CURATED_CATEGORY_GALLERIES.backpack };
    }
    if (text.includes('phone') || text.includes('mobile') || text.includes('laptop')) {
      return { category: 'Electronics & Mobiles', gallery: CURATED_CATEGORY_GALLERIES.phone };
    }
    return { category: 'Amazon Product', gallery: CURATED_CATEGORY_GALLERIES.generic };
  }

  async extract(url) {
    const slugTitle = this.parseTitleFromSlug(url);
    const { category, gallery: fallbackGallery } = this.detectCategory((slugTitle || '') + ' ' + url);

    let html = '';
    try {
      html = await safeFetchText(url, {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        timeoutMs: 6000,
      });
    } catch {}

    const foundImages = [];
    let title = slugTitle || '';

    if (html && !html.includes('api-services-support@amazon.com')) {
      const meta = parseHtmlMetadata(html, url);
      if (meta.title && !meta.title.includes('Amazon.in')) {
        title = meta.title;
      }
      // Check JSON-LD scripts
      const ldMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis)];
      for (const m of ldMatches) {
        try {
          const data = JSON.parse(m[1]);
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item.name && !title) title = item.name;
            if (item.image) {
              const imgs = Array.isArray(item.image) ? item.image : [item.image];
              imgs.forEach(u => {
                const highRes = this.upgradeAmazonResolution(u);
                if (!foundImages.includes(highRes)) foundImages.push(highRes);
              });
            }
          }
        } catch {}
      }

      if (meta.imageUrl) {
        const highRes = this.upgradeAmazonResolution(meta.imageUrl);
        if (!foundImages.includes(highRes)) {
          foundImages.push(highRes);
        }
      }

      // Check dynamic images
      const dynMatches = [...html.matchAll(/data-a-dynamic-image=["']([^"']+)["']/gi)];
      for (const dynMatch of dynMatches) {
        try {
          const parsed = JSON.parse(dynMatch[1].replace(/&quot;/g, '"'));
          const urls = Object.keys(parsed);
          for (const u of urls) {
            const highRes = this.upgradeAmazonResolution(u);
            if (!foundImages.includes(highRes)) {
              foundImages.push(highRes);
            }
          }
        } catch {}
      }

      // Also check 'colorImages': { 'initial': [ { 'hiRes': '...', 'large': '...' } ] }
      const colorImagesMatch = html.match(/'colorImages':\s*\{\s*'initial':\s*(\[[^\]]+\])/);
      if (colorImagesMatch) {
        try {
          const items = JSON.parse(colorImagesMatch[1].replace(/'/g, '"'));
          for (const item of items) {
            const candidate = item.hiRes || item.large;
            if (candidate) {
              const highRes = this.upgradeAmazonResolution(candidate);
              if (!foundImages.includes(highRes)) {
                foundImages.push(highRes);
              }
            }
          }
        } catch {}
      }
    }

    const finalImages = foundImages.length > 0 ? foundImages : fallbackGallery;

    return {
      title: title || 'Amazon Product',
      imageUrl: finalImages[0],
      images: finalImages,
      platform: 'amazon',
      category,
      sourceUrl: url,
    };
  }
}
