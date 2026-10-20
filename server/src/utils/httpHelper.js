import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const CURL_BIN = process.platform === 'win32' ? 'curl.exe' : 'curl';

/**
 * Robust HTTP text fetcher.
 * Uses curl / curl.exe as the primary engine for high-speed, reliable fetching
 * that bypasses Node socket timeouts, falling back to global fetch.
 */
export async function safeFetchText(url, options = {}) {
  const timeoutMs = options.timeoutMs || 8000;
  const userAgent =
    options.userAgent ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  // Strategy 1: curl (works on Linux, Mac, and Windows)
  try {
    const args = ['-s', '-L', '--max-time', String(Math.ceil(timeoutMs / 1000)), '-A', userAgent];
    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        args.push('-H', `${k}: ${v}`);
      }
    }
    args.push(url);

    const { stdout } = await execFileAsync(CURL_BIN, args, {
      maxBuffer: 20 * 1024 * 1024,
      timeout: timeoutMs + 1000,
    });

    if (stdout && stdout.length > 0) {
      return stdout;
    }
  } catch (curlErr) {
    // Continue to fallback
  }

  // Strategy 2: Native global fetch with AbortController
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en;q=0.9',
        ...(options.headers || {}),
      },
    });
    clearTimeout(timer);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}: ${res.statusText}`);
      err.status = res.status;
      throw err;
    }
    return await res.text();
  } catch (fetchErr) {
    clearTimeout(timer);
    throw fetchErr;
  }
}

/**
 * Fetches raw binary buffer for an image.
 */
export async function safeFetchBinary(url, options = {}) {
  const timeoutMs = options.timeoutMs || 10000;

  // Try curl with buffer encoding
  try {
    const { stdout } = await execFileAsync(
      CURL_BIN,
      ['-s', '-L', '--max-time', String(Math.ceil(timeoutMs / 1000)), url],
      {
        encoding: 'buffer',
        maxBuffer: 25 * 1024 * 1024,
        timeout: timeoutMs + 1000,
      }
    );
    if (stdout && Buffer.isBuffer(stdout) && stdout.length > 0) {
      return stdout;
    }
  } catch (curlErr) {
    // Continue to fallback
  }

  // Fallback to fetch
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
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
    extractAttr(/property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    extractAttr(/content=["']([^"']+)["']\s+property=["']og:image["']/i) ||
    extractAttr(/property=["']og:image:secure_url["']\s+content=["']([^"']+)["']/i) ||
    extractAttr(/name=["']twitter:image["']\s+content=["']([^"']+)["']/i) ||
    extractAttr(/content=["']([^"']+)["']\s+name=["']twitter:image["']/i);

  // Title candidates
  let title =
    extractAttr(/property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
    extractAttr(/content=["']([^"']+)["']\s+property=["']og:title["']/i) ||
    extractAttr(/name=["']twitter:title["']\s+content=["']([^"']+)["']/i) ||
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
