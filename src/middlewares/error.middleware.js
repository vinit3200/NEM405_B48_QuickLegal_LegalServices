module.exports = function errorHandler(err, req, res, next) {
  try {
    if (res.headersSent) return next(err);

    let status = err && (err.status || err.statusCode) ? (err.status || err.statusCode) : 500;
    let message = err && err.message ? err.message : 'Internal Server Error';

    let env = process.env.NODE_ENV || 'development';
    let payload = { message };

    if (env !== 'production') {
      payload.stack = err.stack;
      if (err.errors) payload.errors = err.errors;
      if (err.details) payload.details = err.details;
    }

    console.error(`[error] ${new Date().toISOString()} ${message}`, { status, path: req.originalUrl });

    res.status(status).json(payload);
  } catch (finalErr) {
    console.error('Error in errorHandler', finalErr);
    res.status(500).json({ message: 'Fatal error' });
  }
};
