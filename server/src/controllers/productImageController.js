import crypto from 'crypto';
import { validateSafeUrl } from '../utils/ssrfGuard.js';
import { resolveSafeRedirects } from '../utils/urlResolver.js';
import { extractorRegistry } from '../services/extractors/ExtractorRegistry.js';
import { ProductCache } from '../models/ProductCache.js';
import { ConversionLog } from '../models/ConversionLog.js';
import { safeFetchBinary, detectImageContentType } from '../utils/httpHelper.js';

function hashUrl(url) {
  return crypto.createHash('sha256').update(url.trim().toLowerCase()).digest('hex');
}

function isValidExtractableUrl(imageUrl) {
  return (
    typeof imageUrl === 'string' &&
    /^https?:\/\//i.test(imageUrl) &&
    !imageUrl.startsWith('/products/')
  );
}

function mapErrorStatus(code) {
  if (code === 'INVALID_URL') return 400;
  if (code === 'BLOCKED') return 403;
  if (code === 'NOT_FOUND') return 404;
  if (code === 'EXTRACTION_FAILED') return 422;
  if (code === 'TIMEOUT') return 504;
  return 500;
}

/**
 * POST /api/product-image/extract
 * Extracts product image & title from an e-commerce link.
 */
export async function extractProductImage(req, res) {
  const startTime = Date.now();
  const { url, format = 'png', quality = 90 } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      code: 'INVALID_URL',
      error: 'Product URL is required.',
    });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const userId = req.user?.id || null;

  try {
    // 1. SSRF check
    const safeInitial = await validateSafeUrl(url);

    // 2. Safe redirect resolution (e.g., amzn.in, fkrt.it)
    const resolvedUrl = await resolveSafeRedirects(safeInitial, 3);
    const urlHash = hashUrl(resolvedUrl);

    // 3. Check 24h cache (skip stale fallback entries)
    try {
      const cached = await ProductCache.findOne({ urlHash });
      if (cached && isValidExtractableUrl(cached.imageUrl)) {
        ConversionLog.create({
          userId,
          ip: clientIp,
          platform: cached.platform,
          sourceUrl: resolvedUrl,
          format: cached.format || format,
          status: 'SUCCESS',
          latencyMs: Date.now() - startTime,
          cached: true,
        }).catch(() => {});

        return res.json({
          success: true,
          cached: true,
          data: {
            title: cached.title,
            imageUrl: cached.imageUrl,
            images: cached.images && cached.images.length > 0 ? cached.images : [cached.imageUrl],
            platform: cached.platform,
            category: cached.category,
            sourceUrl: cached.sourceUrl,
            format: cached.format,
            quality: cached.quality,
          },
        });
      }
    } catch {
      // Cache lookup failed, continue with live extraction
    }

    // 4. Live extraction via Registry
    const extractionResult = await extractorRegistry.extract(resolvedUrl);
    const allImages =
      extractionResult.images && extractionResult.images.length > 0
        ? extractionResult.images
        : [extractionResult.imageUrl];

    // 5. Save to Cache (only real remote URLs)
    if (isValidExtractableUrl(extractionResult.imageUrl)) {
      try {
        await ProductCache.findOneAndUpdate(
          { urlHash },
          {
            urlHash,
            platform: extractionResult.platform,
            title: extractionResult.title,
            category: extractionResult.category || 'E-Commerce Product',
            imageUrl: extractionResult.imageUrl,
            images: allImages,
            sourceUrl: resolvedUrl,
            format,
            quality: Number(quality) || 90,
            createdAt: new Date(),
          },
          { upsert: true, new: true }
        );
      } catch {
        // Cache write error non-fatal
      }
    }

    // 6. Log success
    ConversionLog.create({
      userId,
      ip: clientIp,
      platform: extractionResult.platform,
      sourceUrl: resolvedUrl,
      format,
      status: 'SUCCESS',
      latencyMs: Date.now() - startTime,
      cached: false,
    }).catch(() => {});

    return res.json({
      success: true,
      cached: false,
      data: {
        title: extractionResult.title,
        imageUrl: extractionResult.imageUrl,
        images: allImages,
        platform: extractionResult.platform,
        category: extractionResult.category,
        sourceUrl: resolvedUrl,
        format,
        quality: Number(quality) || 90,
      },
    });
  } catch (err) {
    const errorCode = err.code || 'EXTRACTION_FAILED';
    const status = mapErrorStatus(errorCode);

    // Log failure
    ConversionLog.create({
      userId,
      ip: clientIp,
      platform: 'unknown',
      sourceUrl: url,
      format,
      status: errorCode,
      latencyMs: Date.now() - startTime,
      cached: false,
    }).catch(() => {});

    return res.status(status).json({
      success: false,
      code: errorCode,
      error: err.message || 'An error occurred while processing the product link.',
    });
  }
}

/**
 * GET /api/product-image/proxy
 * Proxies and streams product image safely with CORS headers to eliminate canvas tainting.
 */
export async function proxyImage(req, res) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).send('Image URL is required.');
  }

  try {
    const safeUrl = await validateSafeUrl(url);
    const buffer = await safeFetchBinary(safeUrl, { timeoutMs: 8500 });
    const contentType = detectImageContentType(buffer, safeUrl);

    res.set({
      'Content-Type': contentType,
      'Content-Length': buffer.length,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    });

    return res.send(buffer);
  } catch {
    return res.status(502).send('Failed to proxy product image.');
  }
}

/**
 * GET /api/product-image/recent
 * Returns recent conversions for logged-in user or IP.
 */
export async function getRecentExtractions(req, res) {
  try {
    const userId = req.user?.id || null;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    const query = userId ? { userId } : { ip: clientIp };
    const logs = await ConversionLog.find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('platform sourceUrl format status createdAt');

    return res.json({ success: true, logs });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to retrieve recent logs.' });
  }
}
