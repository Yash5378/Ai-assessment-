const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defense-in-depth on top of the SameSite=Lax cookie: browsers attach
 * an Origin header to cross-site state-changing requests, so any mutating
 * request whose Origin is present but not ours is rejected. Requests
 * without an Origin (curl, server-to-server, same-origin GET nav) pass —
 * they are not CSRF vectors.
 */
function verifyOrigin(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  if (!origin) {
    return next();
  }

  const allowed = new Set([
    env.clientOrigin,
    `http://localhost:${env.port}`,
    `http://127.0.0.1:${env.port}`,
  ]);
  if (allowed.has(origin)) {
    return next();
  }

  return next(ApiError.forbidden('Cross-origin request blocked'));
}

module.exports = verifyOrigin;
