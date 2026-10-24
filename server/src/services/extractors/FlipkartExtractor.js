import { BaseExtractor } from './BaseExtractor.js';
import { safeFetchText, parseHtmlMetadata } from '../../utils/httpHelper.js';

// Curated authentic studio photos for fallback with multiple product angles
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

export class FlipkartExtractor extends BaseExtractor {
  constructor() {
    super('flipkart');
  }

  canHandle(url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      return host.includes('flipkart.com') || host.includes('fkrt.it');
    } catch {
      return false;
    }
  }

  upgradeResolution(imgUrl) {
    if (!imgUrl) return imgUrl;
    return imgUrl
      .replace(/^http:\/\/rukmini[12]\.flixcart\.com/i, 'https://rukminim2.flixcart.com')
      .replace(/^https:\/\/rukmini[12]\.flixcart\.com/i, 'https://rukminim2.flixcart.com')
      .replace(/{@width}/gi, '1800')
      .replace(/{@height}/gi, '1800')
      .replace(/{@quality}/gi, '85')
      .replace(/\/image\/[^\/]+\/[^\/]+\//i, '/image/1800/1800/');
  }

  async fetchImagesFromSearch(query) {
    if (!query || typeof query !== 'string') return [];
    try {
      const q = `${query} flipkart`;
      const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(q)}&form=HDRSC2`;
      const html = await safeFetchText(searchUrl, {
        timeoutMs: 6000,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      });
      if (!html) return [];
      const murls = [...html.matchAll(/&quot;murl&quot;:&quot;(https?:[^&]+?)&quot;/gi)].map((m) =>
        m[1].replace(/\\/g, '')
      );

      const flixcartImages = murls.filter((u) => /flixcart\.com/i.test(u) && !/logo|banner|icon/i.test(u));
      const targetImages = flixcartImages.length > 0 ? flixcartImages : murls.slice(0, 6);

      return targetImages.map((img) => this.upgradeResolution(img));
    } catch {
      return [];
    }
  }

  parseTitleFromSlug(url) {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const slug = parts[0] !== 'p' ? parts[0] : parts[1] || '';
      if (slug) {
        return decodeURIComponent(slug)
          .replace(/[-_+.]+/g, ' ')
          .split(' ')
          .filter((w) => w && !/^[0-9a-f]{8,}$/i.test(w) && !/^itm[0-9a-z]{6,}$/i.test(w))
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
    if (text.includes('shirt') || text.includes('tshirt') || text.includes('jeans') || text.includes('dress') || text.includes('kurti')) {
      return { category: 'Fashion & Apparel', gallery: CURATED_CATEGORY_GALLERIES.shirt };
    }
    if (text.includes('bag') || text.includes('backpack') || text.includes('luggage')) {
      return { category: 'Bags & Luggage', gallery: CURATED_CATEGORY_GALLERIES.backpack };
    }
    if (text.includes('phone') || text.includes('mobile') || text.includes('laptop')) {
      return { category: 'Electronics & Mobiles', gallery: CURATED_CATEGORY_GALLERIES.phone };
    }
    return { category: 'E-Commerce Product', gallery: CURATED_CATEGORY_GALLERIES.generic };
  }

  async extract(url) {
    const slugTitle = this.parseTitleFromSlug(url);
    const { category, gallery: fallbackGallery } = this.detectCategory((slugTitle || '') + ' ' + url);

    let html = '';
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    ];

    for (const ua of userAgents) {
      try {
        html = await safeFetchText(url, {
          userAgent: ua,
          timeoutMs: 7000,
          headers: {
            'Accept-Language': 'en-IN,en;q=0.9',
          },
        });
        if (html && html.length > 5000) break;
      } catch {
        // try next
      }
    }

    const foundImages = [];
    let foundTitle = slugTitle || '';

    const addImage = (candidateUrl) => {
      if (!candidateUrl || typeof candidateUrl !== 'string') return;
      let clean = candidateUrl.split('?')[0].trim();
      if (clean.startsWith('//')) clean = 'https:' + clean;
      if (!clean.startsWith('http')) return;

      const low = clean.toLowerCase();
      if (
        low.includes('logo') ||
        low.includes('banner') ||
        low.includes('icon') ||
        low.includes('promo') ||
        low.includes('linchpin') ||
        low.includes('splash-screen') ||
        low.endsWith('.svg')
      ) {
        return;
      }

      if (!low.includes('flixcart.com')) return;

      const highRes = this.upgradeResolution(clean);
      const fileMatch = highRes.match(/\/([^\/]+\.(?:jpeg|jpg|png|webp))$/i);
      const filename = fileMatch ? fileMatch[1] : highRes;

      const alreadyExists = foundImages.some(existing => {
        const m = existing.match(/\/([^\/]+\.(?:jpeg|jpg|png|webp))$/i);
        return m ? m[1] === filename : existing === highRes;
      });

      if (!alreadyExists) {
        foundImages.push(highRes);
      }
    };

    if (html) {
      const unescaped = html.replace(/\\u002f/gi, '/').replace(/\\\//g, '/');

      // 1. JSON-LD scripts (contains the exact official gallery of THIS product)
      const ldMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis)];
      for (const m of ldMatches) {
        try {
          const data = JSON.parse(m[1]);
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item['@type'] === 'Product' || item.name) {
              if (item.name && !foundTitle) {
                foundTitle = item.name.replace(/\s*\|\s*Flipkart\.com.*$/i, '').trim();
              }
              if (item.image) {
                const imgs = Array.isArray(item.image) ? item.image : [item.image];
                imgs.forEach(addImage);
              }
            }
          }
        } catch {}
      }

      // If JSON-LD provided the authentic product gallery (>= 2 images), use them exclusively
      // to avoid polluting the download gallery with "Similar Products" / "Recommended Products" widgets
      if (foundImages.length < 2) {
        // 2. OpenGraph & Meta image tags
        const meta = parseHtmlMetadata(html, url);
        if (meta.title && !foundTitle && !meta.title.includes('Online Shopping India') && !meta.title.includes('Flipkart.com')) {
          foundTitle = meta.title.replace(/\s*\|\s*Flipkart\.com.*$/i, '').trim();
        }
        if (meta.imageUrl) {
          addImage(meta.imageUrl);
        }

        // 3. Scan flixcart product image URLs in unescaped HTML
        const regex = /https?:\/\/[a-zA-Z0-9.-]*?flixcart\.com\/[^\s"',<>\\)\{]+?\.(?:jpeg|jpg|png|webp)/gi;
        let match;
        while ((match = regex.exec(unescaped)) !== null) {
          const candidate = match[0];
          if (candidate.includes('/image/') || candidate.includes('/xif0q/')) {
            addImage(candidate);
          }
        }

        // 4. Scan srcset attributes
        const srcsetMatches = [...unescaped.matchAll(/srcset=["']([^"']+)["']/gi)];
        for (const s of srcsetMatches) {
          const urls = s[1].split(',').map(part => part.trim().split(/\s+/)[0]);
          urls.forEach(addImage);
        }
      }
    }

    if (foundImages.length === 0 && (foundTitle || slugTitle)) {
      try {
        const searchImages = await this.fetchImagesFromSearch(foundTitle || slugTitle);
        searchImages.forEach(addImage);
      } catch {}
    }

    const finalImages = foundImages.length > 0 ? foundImages : fallbackGallery;

    return {
      title: foundTitle || 'Flipkart Product',
      imageUrl: finalImages[0],
      images: finalImages,
      platform: 'flipkart',
      category: category,
      sourceUrl: url,
    };
  }
}
