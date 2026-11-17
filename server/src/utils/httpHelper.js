import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const CURL_BIN = process.platform === 'win32' ? 'curl.exe' : 'curl';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const DEFAULT_HTML_HEADERS = {
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'max-age=0',
  'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

function isLikelyBotBlock(html = '') {
  if (!html || typeof html !== 'string') return true;
  if (html.includes('api-services-support@amazon.com')) return true;
  if (html.length < 10000 && /Robot Check|Enter the characters you see below|automated access/i.test(html)) {
    return true;
  }
  return false;
}

/**
 * Robust HTTP text fetcher.
 * Uses curl / curl.exe with full Chrome browser headers & compression first,
 * falling back to native fetch within a shared timeout budget.
 */
export async function safeFetchText(url, options = {}) {
  const totalTimeoutMs = options.timeoutMs || 7000;
  const deadline = Date.now() + totalTimeoutMs;
  const userAgent = options.userAgent || DEFAULT_USER_AGENT;
  const mergedHeaders = options.minimalHeaders
    ? { ...(options.headers || {}) }
    : { ...DEFAULT_HTML_HEADERS, ...(options.headers || {}) };

  let fallbackText = '';

  // Strategy 1: curl (fast TLS fingerprint & automatic HTTP/2 on Linux/Mac/Windows)
  try {
    const curlTimeoutSec = Math.max(2, Math.ceil(totalTimeoutMs / 1000));
    const args = [
      '-s',
      '-L',
      '--compressed',
      '--max-time',
      String(curlTimeoutSec),
      '-A',
      userAgent,
    ];
    for (const [k, v] of Object.entries(mergedHeaders)) {
      args.push('-H', `${k}: ${v}`);
    }
    args.push(url);

    const { stdout } = await execFileAsync(CURL_BIN, args, {
      maxBuffer: 20 * 1024 * 1024,
      timeout: totalTimeoutMs + 500,
    });

    if (stdout && stdout.length > 0) {
      if (!isLikelyBotBlock(stdout)) {
        return stdout;
      }
      fallbackText = stdout;
    }
  } catch {
    // curl unavailable (e.g. minimal container) or timed out — fall back to fetch if budget remains
  }

  const remainingMs = deadline - Date.now();
  if (remainingMs < 1000) {
    if (fallbackText) return fallbackText;
    const err = new Error('Request timed out.');
    err.code = 'TIMEOUT';
    throw err;
  }

  // Strategy 2: Native global fetch with AbortController within remaining time budget
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), remainingMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        ...mergedHeaders,
      },
    });
    clearTimeout(timer);
    const body = await res.text();
    if (!res.ok) {
      if (fallbackText) return fallbackText;
      const err = new Error(`HTTP ${res.status}: ${res.statusText}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  } catch (fetchErr) {
    clearTimeout(timer);
    if (fallbackText) return fallbackText;
    throw fetchErr;
  }
}

/**
 * Checks whether a buffer looks like an HTML document rather than binary image data.
 */
function isHtmlBuffer(buffer) {
  if (!buffer || buffer.length < 12) return false;
  const head = buffer.subarray(0, 64).toString('utf8').trimStart().toLowerCase();
  return head.startsWith('<!doctype') || head.startsWith('<html') || head.startsWith('<head');
}

/**
 * Detects image MIME type from magic bytes with URL extension fallback.
 */
export function detectImageContentType(buffer, url = '') {
  if (buffer && buffer.length >= 12) {
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'image/png';
    }
    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }
    // GIF: GIF8
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
      return 'image/gif';
    }
    // WebP: RIFF....WEBP
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'image/webp';
    }
  }

  const lower = url.split('?')[0].toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

/**
 * Fetches raw binary buffer for an image.
 */
export async function safeFetchBinary(url, options = {}) {
  const timeoutMs = options.timeoutMs || 8500;
  const deadline = Date.now() + timeoutMs;

  // Try curl with buffer encoding
  try {
    const { stdout } = await execFileAsync(
      CURL_BIN,
      [
        '-s',
        '-L',
        '-f',
        '--max-time',
        String(Math.max(2, Math.ceil(timeoutMs / 1000))),
        '-A',
        DEFAULT_USER_AGENT,
        '-H',
        'Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        url,
      ],
      {
        encoding: 'buffer',
        maxBuffer: 25 * 1024 * 1024,
        timeout: timeoutMs + 500,
      }
    );
    if (stdout && Buffer.isBuffer(stdout) && stdout.length > 0 && !isHtmlBuffer(stdout)) {
      return stdout;
    }
  } catch {
    // Continue to fetch fallback
  }

  const remainingMs = Math.max(2000, deadline - Date.now());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), remainingMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });
    clearTimeout(timer);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    if (buf.length === 0 || isHtmlBuffer(buf)) {
      throw new Error('Upstream returned non-image response.');
    }
    return buf;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Zero-dependency HTML parser to extract OpenGraph, Twitter, and Schema.org metadata.
 */
export function parseHtmlMetadata(html = '', baseUrl = '') {
  const extractAttr = (regex) => {
    const m = html.match(regex);
    return m ? m[1].trim() : null;
  };

  // Image candidates
  let imageUrl =
    extractAttr(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
    extractAttr(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
    extractAttr(/property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i) ||
    extractAttr(/name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
    extractAttr(/content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);

  // Title candidates
  let title =
    extractAttr(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
    extractAttr(/content=["']([^"']+)["'][^>]*property=["']og:title["']/i) ||
    extractAttr(/name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i) ||
    extractAttr(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
    extractAttr(/<title[^>]*>([\s\S]*?)<\/title>/i);

  if (title) {
    title = title.replace(/<[^>]+>/g, '').trim();
  }

  // JSON-LD Schema.org/Product check
  const jsonLdScripts = [
    ...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];
  for (const match of jsonLdScripts) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Product' || item.image) {
          if (!imageUrl && item.image) {
            imageUrl = Array.isArray(item.image) ? item.image[0] : item.image;
          }
          if (!title && item.name) {
            title = item.name;
          }
        }
      }
    } catch {}
  }

  // Resolve relative URLs
  if (imageUrl && baseUrl) {
    try {
      imageUrl = new URL(imageUrl, baseUrl).href;
    } catch {}
  }

  return { title, imageUrl };
}
