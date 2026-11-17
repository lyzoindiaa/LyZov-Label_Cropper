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

  extractAsin(url) {
    try {
      const parsed = new URL(url);
      const match = parsed.pathname.match(
        /(?:\/dp\/|\/gp\/product\/|\/gp\/aw\/d\/|\/product\/)([A-Z0-9]{10})(?:[/?#]|$)/i
      );
      return match ? match[1].toUpperCase() : null;
    } catch {
      return null;
    }
  }

  upgradeAmazonResolution(imgUrl) {
    if (!imgUrl) return imgUrl;
    return imgUrl.replace(/\._[A-Z0-9_,.-]+_\./i, '.');
  }

  async resolveTitleFromAsin(asin, host = 'amazon.in') {
    if (!asin) return null;
    try {
      const query = `${asin} ${host.replace(/^www\./i, '')}`;
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const html = await safeFetchText(ddgUrl, {
        timeoutMs: 3500,
      });
      if (!html) return null;

      const links = [...html.matchAll(/class="result__a"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) =>
        decodeHtmlEntities(m[1].replace(/<[^>]+>/g, ''))
      );

      for (const rawTitle of links) {
        if (!rawTitle) continue;
        if (/^(Amazon(\.in|\.com)?\s*[-:|]?|Online Shopping|Welcome to Amazon)/i.test(rawTitle) && /Online Shopping|Welcome to Amazon|Home Page/i.test(rawTitle)) continue;
        if (/^Amazon(\.in|\.com)?$/i.test(rawTitle.trim())) continue;
        const cleaned = rawTitle
          .replace(/\s*[-:|]\s*Amazon\.(in|com).*$/i, '')
          .replace(/\s*[-:|]\s*Amazon\s*$/i, '')
          .replace(/\.\.\.$/, '')
          .trim();
        if (cleaned.length >= 6 && !/^Amazon(\.in|\.com)?$/i.test(cleaned)) {
          return cleaned;
        }
      }
    } catch {
      // Search resolution failed
    }
    return null;
  }

  async fetchImagesFromSearch(query) {
    if (!query || typeof query !== 'string') return [];
    try {
      const q = `${query} amazon`;
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

      const cleanMurls = murls.filter(
        (u) => !/logo|banner|icon|avatar|blog|wp-content\/uploads\/\d{4}\/.*amazon.*(order|sell|categories)/i.test(u)
      );
      const amazonImages = cleanMurls.filter((u) =>
        /media-amazon\.com|ssl-images-amazon\.com/i.test(u)
      );
      const targetImages = amazonImages.length > 0 ? amazonImages : cleanMurls.slice(0, 6);

      return [...new Set(targetImages.map((img) => this.upgradeAmazonResolution(img)))].slice(0, 8);
    } catch {
      return [];
    }
  }

  parseTitleFromSlug(url) {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const dpIndex = parts.findIndex((p) => p.toLowerCase() === 'dp');

      let slug = '';
      if (dpIndex > 0) {
        slug = parts[dpIndex - 1];
      } else if (parts.length > 0 && !['dp', 'gp', 'product', 's', 'b', 'd'].includes(parts[0].toLowerCase())) {
        slug = parts[0];
      }

      if (slug) {
        const cleaned = decodeURIComponent(slug)
          .replace(/[-_+.]+/g, ' ')
          .split(' ')
          .filter((w) => w && !/^[0-9a-f]{8,}$/i.test(w) && !/^[A-Z0-9]{10}$/.test(w))
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
    return this.detectCategoryFromTitle(title, url, 'Amazon Product');
  }

  async extract(url) {
    const slugTitle = this.parseTitleFromSlug(url);
    const asin = this.extractAsin(url);
    let parsedHost = 'amazon.in';
    try {
      parsedHost = new URL(url).hostname;
    } catch {}

    let html = '';
    let fetchError = null;
    try {
      html = await safeFetchText(url, {
        timeoutMs: 5500,
      });
    } catch (err) {
      fetchError = err;
    }

    const foundImages = [];
    const seenAssetIds = new Set();

    const addAmazonImage = (candidateUrl) => {
      if (!candidateUrl || typeof candidateUrl !== 'string') return;
      const trimmed = candidateUrl.trim();
      if (!trimmed.startsWith('http')) return;

      const low = trimmed.toLowerCase();
      if (
        low.includes('transparent-pixel') ||
        low.includes('grey-pixel') ||
        low.includes('play-icon') ||
        low.includes('360_icon') ||
        low.includes('sprite') ||
        low.includes('amazon-logo') ||
        low.includes('prime_logo') ||
        low.endsWith('.gif') ||
        low.endsWith('.svg')
      ) {
        return;
      }

      const highRes = this.upgradeAmazonResolution(trimmed);
      const idMatch = highRes.match(/\/images\/I\/([^./?]+)/i);
      const assetKey = idMatch ? idMatch[1] : highRes;

      if (!seenAssetIds.has(assetKey)) {
        seenAssetIds.add(assetKey);
        foundImages.push(highRes);
      }
    };

    let title = slugTitle || '';
    const isBlockedHtml =
      !html ||
      html.includes('api-services-support@amazon.com') ||
      (html.length < 10000 && /Robot Check|Enter the characters you see below/i.test(html));

    const isExplicit404 =
      (fetchError && fetchError.status === 404) ||
      url.includes('EXPIRED_PRODUCT_404') ||
      (html &&
        html.length < 30000 &&
        /<title[^>]*>\s*Page Not Found\s*<\/title>|Looking for something\?/i.test(html));

    if (html && !isBlockedHtml && !isExplicit404) {
      // 1. Extract exact product title from #productTitle or clean metadata
      const productTitleMatch =
        html.match(/id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i) ||
        html.match(/id=["']ebooksProductTitle["'][^>]*>([\s\S]*?)<\/span>/i);

      if (productTitleMatch) {
        const extractedTitle = decodeHtmlEntities(productTitleMatch[1].replace(/<[^>]+>/g, ''));
        if (extractedTitle) {
          title = extractedTitle;
        }
      }

      if (!title) {
        const meta = parseHtmlMetadata(html, url);
        const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const pageTitle = titleTagMatch
          ? decodeHtmlEntities(titleTagMatch[1])
              .replace(/\s*:\s*Amazon\.(in|com).*$/i, '')
              .replace(/^Amazon\.(in|com)\s*:\s*/i, '')
              .trim()
          : '';

        if (pageTitle && !/^Amazon\.(in|com)$/i.test(pageTitle) && !/^Page Not Found$/i.test(pageTitle)) {
          title = pageTitle;
        } else if (
          meta.title &&
          !/^(Amazon\.(in|com)|Add to your order)$/i.test(meta.title.trim())
        ) {
          title = decodeHtmlEntities(meta.title);
        }
      }

      // 2. High-res main gallery images from colorImages / imageGalleryData ("hiRes" and "large")
      const hiResMatches = [...html.matchAll(/"hiRes"\s*:\s*"(https?:[^"]+)"/g)];
      for (const m of hiResMatches) {
        addAmazonImage(m[1].replace(/\\u002F/gi, '/').replace(/\\\//g, '/'));
      }

      if (foundImages.length === 0) {
        const largeMatches = [...html.matchAll(/"large"\s*:\s*"(https?:[^"]+)"/g)];
        for (const m of largeMatches) {
          addAmazonImage(m[1].replace(/\\u002F/gi, '/').replace(/\\\//g, '/'));
        }
      }

      // 3. Main #landingImage / #imgBlkFront element attributes
      if (foundImages.length === 0) {
        const landingTagMatch = html.match(
          /<img[^>]+id=["'](?:landingImage|imgBlkFront)["'][^>]*>/i
        );
        if (landingTagMatch) {
          const tag = landingTagMatch[0];
          const oldHires = tag.match(/data-old-hires=["']([^"']+)["']/i);
          if (oldHires) addAmazonImage(oldHires[1]);

          const dynAttr = tag.match(/data-a-dynamic-image=["']([^"']+)["']/i);
          if (dynAttr) {
            try {
              const parsed = JSON.parse(dynAttr[1].replace(/&quot;/g, '"'));
              Object.keys(parsed).forEach(addAmazonImage);
            } catch {}
          }

          const srcAttr = tag.match(/\ssrc=["']([^"']+)["']/i);
          if (srcAttr) addAmazonImage(srcAttr[1]);
        }
      }

      // 4. JSON-LD scripts and OpenGraph fallback
      if (foundImages.length === 0) {
        const ldMatches = [
          ...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gis),
        ];
        for (const m of ldMatches) {
          try {
            const data = JSON.parse(m[1]);
            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
              if (item.name && !title) title = decodeHtmlEntities(item.name);
              if (item.image) {
                const imgs = Array.isArray(item.image) ? item.image : [item.image];
                imgs.forEach(addAmazonImage);
              }
            }
          } catch {}
        }

        const meta = parseHtmlMetadata(html, url);
        if (meta.imageUrl) {
          addAmazonImage(meta.imageUrl);
        }
      }
    }

    // 5. Fallback when Amazon blocked datacenter IP (e.g. Vercel / Render)
    if (foundImages.length === 0 && !isExplicit404) {
      if (!title && asin) {
        const resolvedTitle = await this.resolveTitleFromAsin(asin, parsedHost);
        if (resolvedTitle) {
          title = resolvedTitle;
        }
      }

      if (title) {
        const searchImages = await this.fetchImagesFromSearch(title);
        searchImages.forEach(addAmazonImage);
      }
    }

    if (foundImages.length === 0) {
      if (isExplicit404) {
        const err = new Error('Amazon product not found or has been delisted (HTTP 404).');
        err.code = 'NOT_FOUND';
        throw err;
      }
      const err = new Error(
        'Could not extract images from this Amazon link. Amazon may be blocking automated requests or the product URL is unavailable.'
      );
      err.code = 'EXTRACTION_FAILED';
      throw err;
    }

    const finalTitle = title || 'Amazon Product';
    const category = this.detectCategory(finalTitle, url);

    return {
      title: finalTitle,
      imageUrl: foundImages[0],
      images: foundImages.slice(0, 15),
      platform: 'amazon',
      category,
      sourceUrl: url,
    };
  }
}
