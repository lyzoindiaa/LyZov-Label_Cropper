import { validateSafeUrl } from '../../server/src/utils/ssrfGuard.js';
import { resolveSafeRedirects } from '../../server/src/utils/urlResolver.js';
import { extractorRegistry } from '../../server/src/services/extractors/ExtractorRegistry.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle both POST body and GET query parameters
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {}
  }

  const url = body?.url || req.query?.url;
  const format = body?.format || req.query?.format || 'png';
  const quality = body?.quality || req.query?.quality || 90;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      code: 'INVALID_URL',
      error: 'Product URL is required.',
    });
  }

  try {
    const safeInitial = await validateSafeUrl(url);
    const resolvedUrl = await resolveSafeRedirects(safeInitial, 3);
    const extractionResult = await extractorRegistry.extract(resolvedUrl);

    const allImages =
      extractionResult.images && extractionResult.images.length > 0
        ? extractionResult.images
        : [extractionResult.imageUrl];

    return res.status(200).json({
      success: true,
      data: {
        title: extractionResult.title,
        imageUrl: extractionResult.imageUrl,
        images: allImages,
        platform: extractionResult.platform,
        category: extractionResult.category || 'Product',
        sourceUrl: resolvedUrl,
        format,
        quality: Number(quality) || 90,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: err.code || 'EXTRACTION_FAILED',
      error: err.message || 'Failed to extract product image.',
    });
  }
}
