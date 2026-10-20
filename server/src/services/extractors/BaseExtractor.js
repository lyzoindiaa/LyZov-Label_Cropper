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
   * Extracts product title, image URL, category, and metadata from the URL.
   * @param {string} url
   * @returns {Promise<{ title: string, imageUrl: string, category?: string, platform: string }>}
   */
  async extract(url) {
    throw new Error('extract must be implemented by subclass');
  }
}
