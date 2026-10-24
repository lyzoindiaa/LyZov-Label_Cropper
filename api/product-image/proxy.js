import { validateSafeUrl } from '../../server/src/utils/ssrfGuard.js';
import { safeFetchBinary } from '../../server/src/utils/httpHelper.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).send('Image URL required');
  }

  try {
    const safeUrl = await validateSafeUrl(url);
    const buffer = await safeFetchBinary(safeUrl, { timeoutMs: 10000 });

    const lower = safeUrl.toLowerCase();
    const contentType = lower.endsWith('.png')
      ? 'image/png'
      : lower.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return res.status(200).send(buffer);
  } catch (err) {
    return res.status(502).send('Failed to proxy image');
  }
}
