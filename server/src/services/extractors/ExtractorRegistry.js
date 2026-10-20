import { FlipkartExtractor } from './FlipkartExtractor.js';
import { AmazonExtractor } from './AmazonExtractor.js';
import { OpenGraphExtractor } from './OpenGraphExtractor.js';

export class ExtractorRegistry {
  constructor() {
    this.extractors = [
      new FlipkartExtractor(),
      new AmazonExtractor(),
      new OpenGraphExtractor(), // Fallback
    ];
  }

  /**
   * Finds the best extractor for a given URL and executes extraction.
   * @param {string} url
   */
  async extract(url) {
    for (const extractor of this.extractors) {
      if (extractor.canHandle(url)) {
        try {
          return await extractor.extract(url);
        } catch (err) {
          // If a platform-specific extractor fails with NOT_FOUND, try fallback
          if (extractor !== this.extractors[this.extractors.length - 1]) {
            continue;
          }
          throw err;
        }
      }
    }

    const err = new Error('No extractor could process this URL.');
    err.code = 'UNSUPPORTED_PLATFORM';
    throw err;
  }
}

export const extractorRegistry = new ExtractorRegistry();
