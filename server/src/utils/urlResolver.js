import { execFile } from 'child_process';
import { promisify } from 'util';
import { validateSafeUrl } from './ssrfGuard.js';

const execFileAsync = promisify(execFile);
const CURL_BIN = process.platform === 'win32' ? 'curl.exe' : 'curl';

const KNOWN_SHORTENERS = [
  'amzn.in',
  'amzn.to',
  'fkrt.it',
  'bit.ly',
  'tinyurl.com',
  't.co',
];

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function probeRedirectLocation(targetUrl, timeoutMs = 2500) {
  // Strategy 1: Native fetch with manual redirect (works without curl and handles HEAD/GET)
  for (const method of ['HEAD', 'GET']) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(targetUrl, {
        method,
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT },
      });
      clearTimeout(timer);
      const loc = res.headers.get('location');
      if (res.body) {
        res.body.cancel().catch(() => {});
      }
      if (loc) return loc;
      // Only retry GET if HEAD didn't give a redirect location
      if (res.status >= 200 && res.status < 400 && method === 'HEAD') continue;
      break;
    } catch {
      clearTimeout(timer);
    }
  }

  // Strategy 2: curl fallback
  try {
    const { stdout } = await execFileAsync(
      CURL_BIN,
      ['-s', '-I', '-A', USER_AGENT, '--max-time', '3', targetUrl],
      { timeout: 3500 }
    );
    const locationMatch = stdout.match(/^location:\s*([^\r\n]+)/im);
    if (locationMatch) return locationMatch[1].trim();
  } catch {
    // Ignore curl errors
  }

  return null;
}

/**
 * Resolves redirects safely up to maxHops using fetch/curl with SSRF validation on every hop.
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

    const location = await probeRedirectLocation(currentUrl, 2500);
    if (!location) {
      return currentUrl;
    }

    const nextUrl = new URL(location, currentUrl).href;
    currentUrl = await validateSafeUrl(nextUrl);
  }

  return currentUrl;
}
