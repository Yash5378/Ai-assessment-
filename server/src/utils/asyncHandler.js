/**
 * Wraps an async route handler so rejected promises reach the global
 * error handler (Express 4 does not catch async errors on its own).
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
