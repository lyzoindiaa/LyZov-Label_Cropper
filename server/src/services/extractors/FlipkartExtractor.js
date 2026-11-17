import { BaseExtractor } from './BaseExtractor.js';
import { safeFetchText, parseHtmlMetadata } from '../../utils/httpHelper.js';

function decodeHtmlEntities(str = '') {
  return String(str || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

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
      .replace(/\/image\/[^/]+\/[^/]+\//i, '/image/1800/1800/');
  }

  extractItemId(url) {
    try {
      const parsed = new URL(url);
      const pid = parsed.searchParams.get('pid');
      if (pid) return pid;
      const match = parsed.pathname.match(/\/p\/(itm[0-9a-z]+)/i);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  async resolveTitleFromId(itemId) {
    if (!itemId) return null;
    try {
      const query = `${itemId} flipkart`;
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const html = await safeFetchText(ddgUrl, {
        timeoutMs: 3500,
      });
      if (!html) return null;

      const links = [...html.matchAll(/class="result__a"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) =>
        decodeHtmlEntities(m[1].replace(/<[^>]+>/g, ''))
      );
      for (const rawTitle of links) {
        if (!rawTitle || /Online Shopping India/i.test(rawTitle)) continue;
        const cleaned = rawTitle
          .replace(/\s*[-:|]\s*Flipkart\.com.*$/i, '')
          .replace(/\.\.\.$/, '')
          .trim();
        if (cleaned.length >= 6) return cleaned;
      }
    } catch {}
    return null;
  }

  async fetchImagesFromSearch(query) {
    if (!query || typeof query !== 'string') return [];
    try {
      const q = `${query} flipkart`;
      const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(q)}&form=HDRSC2`;
      const html = await safeFetchText(searchUrl, {
        timeoutMs: 4000,
        minimalHeaders: true,
        headers: {
          Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
        },
      });
      if (!html) return [];
      const murls = [...html.matchAll(/&quot;murl&quot;:&quot;(https?:[^&]+?)&quot;/gi)].map((m) =>
        m[1].replace(/\\/g, '')
      );

      const cleanMurls = murls.filter((u) => !/logo|banner|icon|avatar/i.test(u));
      const flixcartImages = cleanMurls.filter((u) => /flixcart\.com/i.test(u));
      const targetImages = flixcartImages.length > 0 ? flixcartImages : cleanMurls.slice(0, 6);

      return [...new Set(targetImages.map((img) => this.upgradeResolution(img)))].slice(0, 8);
    } catch {
      return [];
    }
  }

  parseTitleFromSlug(url) {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const pIndex = parts.findIndex((p) => p.toLowerCase() === 'p');
      let slug = '';
      if (pIndex > 0) {
        slug = parts[pIndex - 1];
      } else if (parts.length > 0 && parts[0].toLowerCase() !== 'p' && parts[0].toLowerCase() !== 'dl') {
        slug = parts[0];
      }

      if (slug) {
        const cleaned = decodeURIComponent(slug)
          .replace(/[-_+.]+/g, ' ')
          .split(' ')
          .filter((w) => w && !/^[0-9a-f]{8,}$/i.test(w) && !/^itm[0-9a-z]{5,}$/i.test(w))
          .map((w) => {
            const lower = w.toLowerCase();
            if (['red', 'tape', 'boat', 'nike', 'apple', 'puma', 'adidas', 'sony'].includes(lower)) {
              return w.toUpperCase();
            }
            return w.charAt(0).toUpperCase() + lower.slice(1);
          })
          .join(' ')
          .trim();
        return cleaned || null;
      }
    } catch {}
    return null;
  }

  detectCategory(title = '', url = '') {
    return this.detectCategoryFromTitle(title, url, 'Flipkart Product');
  }

  async extract(url) {
    const slugTitle = this.parseTitleFromSlug(url);
    const itemId = this.extractItemId(url);

    let html = '';
    try {
      html = await safeFetchText(url, {
        timeoutMs: 4500,
      });
    } catch {}

    // Check if Flipkart returned the generic homepage / bot shell
    const isGenericHomepage = (text) => {
      if (!text) return true;
      const t = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
      return /Buy Products Online at Best Price in India|Online Shopping India \| Buy Mobiles/i.test(t);
    };

    if (!html || isGenericHomepage(html)) {
      try {
        const fbHtml = await safeFetchText(url, {
          userAgent: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          minimalHeaders: true,
          timeoutMs: 3000,
          headers: {
            'Accept-Language': 'en-IN,en;q=0.9',
          },
        });
        if (fbHtml && !isGenericHomepage(fbHtml)) {
          html = fbHtml;
        }
      } catch {}
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
      const fileMatch = highRes.match(/\/([^/]+\.(?:jpeg|jpg|png|webp))$/i);
      const filename = fileMatch ? fileMatch[1] : highRes;

      const alreadyExists = foundImages.some((existing) => {
        const m = existing.match(/\/([^/]+\.(?:jpeg|jpg|png|webp))$/i);
        return m ? m[1] === filename : existing === highRes;
      });

      if (!alreadyExists) {
        foundImages.push(highRes);
      }
    };

    if (html && !isGenericHomepage(html)) {
      const unescaped = html.replace(/\\u002f/gi, '/').replace(/\\\//g, '/');

      // 1. JSON-LD scripts (exact official gallery of THIS product)
      const ldMatches = [
        ...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gis),
      ];
      for (const m of ldMatches) {
        try {
          const data = JSON.parse(m[1]);
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item['@type'] === 'Product' || item.name) {
              if (item.name && !foundTitle) {
                foundTitle = decodeHtmlEntities(
                  item.name.replace(/\s*\|\s*Flipkart\.com.*$/i, '')
                );
              }
              if (item.image) {
                const imgs = Array.isArray(item.image) ? item.image : [item.image];
                imgs.forEach(addImage);
              }
            }
          }
        } catch {}
      }

      // 2. OpenGraph & Meta image tags + product image patterns when JSON-LD is incomplete
      if (foundImages.length < 2) {
        const meta = parseHtmlMetadata(html, url);
        if (
          meta.title &&
          !foundTitle &&
          !meta.title.includes('Online Shopping India') &&
          !meta.title.includes('Buy Products Online') &&
          !meta.title.includes('Flipkart.com')
        ) {
          foundTitle = decodeHtmlEntities(
            meta.title.replace(/\s*\|\s*Flipkart\.com.*$/i, '')
          );
        }
        if (meta.imageUrl) {
          addImage(meta.imageUrl);
        }

        // Only scan inline product images if we confirmed this is a product page (meta/title matched)
        if (foundImages.length === 0) {
          const regex =
            /https?:\/\/[a-zA-Z0-9.-]*?flixcart\.com\/[^\s"',<>\\){]+?\.(?:jpeg|jpg|png|webp)/gi;
          let match;
          while ((match = regex.exec(unescaped)) !== null) {
            const candidate = match[0];
            if (candidate.includes('/image/') || candidate.includes('/xif0q/')) {
              addImage(candidate);
              if (foundImages.length >= 10) break;
            }
          }
        }
      }
    }

    if (foundImages.length === 0) {
      if (!foundTitle && itemId) {
        const resolvedTitle = await this.resolveTitleFromId(itemId);
        if (resolvedTitle) foundTitle = resolvedTitle;
      }

      if (foundTitle) {
        const searchImages = await this.fetchImagesFromSearch(foundTitle);
        searchImages.forEach((img) => {
          if (!foundImages.includes(img)) foundImages.push(img);
        });
      }
    }

    if (foundImages.length === 0) {
      const err = new Error(
        'Could not extract images from this Flipkart link. Flipkart may be blocking automated requests or the product was not found.'
      );
      err.code = 'EXTRACTION_FAILED';
      throw err;
    }

    const finalTitle = foundTitle || 'Flipkart Product';
    const category = this.detectCategory(finalTitle, url);

    return {
      title: finalTitle,
      imageUrl: foundImages[0],
      images: foundImages.slice(0, 12),
      platform: 'flipkart',
      category,
      sourceUrl: url,
    };
  }
}
