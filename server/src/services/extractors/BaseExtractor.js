/**
 * Base abstract class for all marketplace extractors.
 */
export class BaseExtractor {
  constructor(name) {
    this.name = name;
  }

  /**
   * Returns true if this extractor can handle the specified URL.
   * @param {string} url
   * @returns {boolean}
   */
  canHandle(url) {
    throw new Error('canHandle must be implemented by subclass');
  }

  /**
   * Detects product category using title and URL pathname (ignoring query parameters)
   * with word-boundary matching to avoid false positives like "swatchAttr" -> "watch".
   * @param {string} title
   * @param {string} url
   * @param {string} fallback
   * @returns {string}
   */
  detectCategoryFromTitle(title = '', url = '', fallback = 'E-Commerce Product') {
    let pathPart = '';
    if (url) {
      try {
        pathPart = new URL(url).pathname.replace(/[-_/+]+/g, ' ');
      } catch {}
    }
    const text = `${title || ''} ${pathPart}`.toLowerCase();

    if (/\b(shoes?|sneakers?|footwear|sandals?|boots?|loafers?|heels?|clogs?|trainers?|slides?)\b/.test(text)) {
      return 'Footwear / Shoes';
    }
    if (/\b(watch|watches|smartwatch|smartwatches|chronograph|wristband)\b/.test(text)) {
      return 'Watches';
    }
    if (/\b(headphones?|earbuds?|airpods?|earphones?|audio|speakers?)\b/.test(text)) {
      return 'Audio & Gadgets';
    }
    if (/\b(shirts?|t-?shirts?|sarees?|kurtis?|dresses?|pants?|jeans|denim|hoodies?|jackets?|trousers?|apparel)\b/.test(text)) {
      return 'Fashion & Apparel';
    }
    if (/\b(bags?|backpacks?|luggage|suitcases?|handbags?)\b/.test(text)) {
      return 'Bags & Luggage';
    }
    if (/\b(phones?|smartphones?|mobiles?|laptops?|tablets?|galaxy|iphones?)\b/.test(text)) {
      return 'Electronics & Mobiles';
    }
    return fallback;
  }

  /**
   * Extracts product title, image URL, category, and metadata from the URL.
   * @param {string} url
   * @returns {Promise<{ title: string, imageUrl: string, category?: string, platform: string }>}
   */
  async extract(url) {
    throw new Error('extract must be implemented by subclass');
  }
}
