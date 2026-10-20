import { execFile } from 'child_process';
import { promisify } from 'util';
import { validateSafeUrl } from './ssrfGuard.js';

const execFileAsync = promisify(execFile);

const KNOWN_SHORTENERS = [
  'amzn.in',
  'amzn.to',
  'fkrt.it',
  'bit.ly',
  'tinyurl.com',
  't.co',
];

/**
 * Resolves redirects safely up to maxHops using curl.exe for high speed and reliability.
 */
export async function resolveSafeRedirects(initialUrl, maxHops = 3) {
  let currentUrl = await validateSafeUrl(initialUrl);

  for (let hop = 0; hop < maxHops; hop++) {
    const parsed = new URL(currentUrl);
    const isShort = KNOWN_SHORTENERS.some((d) => parsed.hostname.toLowerCase().includes(d));

    // If not a known shortener, no redirect resolution needed
    if (!isShort) {
      return currentUrl;
    }

    try {
      // Use curl to get Location header quickly
      const { stdout } = await execFileAsync(
        'curl.exe',
        ['-s', '-I', '--max-time', '4', currentUrl],
        { timeout: 5000 }
      );

      const locationMatch = stdout.match(/^location:\s*([^\r\n]+)/im);
      if (locationMatch) {
        const nextUrl = new URL(locationMatch[1].trim(), currentUrl).href;
        currentUrl = await validateSafeUrl(nextUrl);
      } else {
        return currentUrl;
      }
    } catch {
      return currentUrl;
    }
  }

  return currentUrl;
}
