export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // Handle malformed JSON from body-parser gracefully
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload in request body.' });
  }

  const isProduction = process.env.NODE_ENV === 'production';

  // Always log internally
  console.error('[API Error]:', err);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map(val => val.message);
    return res.status(400).json({ error: 'Validation failed', details: messages });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ error: `A record with this ${field} already exists.` });
  }

  // In production, never leak raw error messages to the client
  const status = err.status || err.statusCode || 500;
  const message = isProduction && status === 500
    ? 'An internal server error occurred. Please try again later.'
    : (err.message || 'Internal Server Error');

  res.status(status).json({ error: message });
}

