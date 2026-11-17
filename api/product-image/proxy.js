import { validateSafeUrl } from '../../server/src/utils/ssrfGuard.js';
import { safeFetchBinary, detectImageContentType } from '../../server/src/utils/httpHelper.js';

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
    const buffer = await safeFetchBinary(safeUrl, { timeoutMs: 8500 });
    const contentType = detectImageContentType(buffer, safeUrl);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return res.status(200).send(buffer);
  } catch {
    return res.status(502).send('Failed to proxy image');
  }
}
