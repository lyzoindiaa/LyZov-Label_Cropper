export function errorHandler(err, req, res, next) {
  console.error('[API Error]:', err);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ error: 'Validation failed', details: messages });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ error: `A record with this ${field} already exists.` });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
}
