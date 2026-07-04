const rateLimit = require('express-rate-limit');

/**
 * Slows down credential brute-forcing. Applied to login and register only,
 * so normal API usage is never throttled.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again in 15 minutes' },
});

module.exports = { authLimiter };
