export function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';

  // Always log internally
  console.error('[API Error]:', err);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ error: 'Validation failed', details: messages });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ error: `A record with this ${field} already exists.` });
  }

  // In production, never leak raw error messages to the client
  const status = err.status || 500;
  const message = isProduction && status === 500
    ? 'An internal server error occurred. Please try again later.'
    : (err.message || 'Internal Server Error');

  res.status(status).json({ error: message });
}
