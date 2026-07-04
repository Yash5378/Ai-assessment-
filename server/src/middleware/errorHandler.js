const env = require('../config/env');

/**
 * Global error handler. Operational (expected) errors return their status
 * and message; anything unexpected is logged and returns a generic 500 so
 * internals are never leaked to clients.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  console.error('Unexpected error:', err);
  return res.status(500).json({
    error: 'Internal server error',
    ...(env.isProduction ? {} : { detail: err.message }),
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
