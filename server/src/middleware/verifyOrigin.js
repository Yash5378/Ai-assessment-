const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defense-in-depth on top of the SameSite=Lax cookie: browsers attach
 * an Origin header to state-changing requests, so a mutating request whose
 * Origin is neither same-origin nor explicitly allowed is rejected.
 *
 * "Same-origin" is computed against the host the request was addressed to
 * (X-Forwarded-* from the nginx proxy, or the direct Host header), so the
 * app works identically on localhost, a LAN IP, or any deployed domain.
 * Requests without an Origin (curl, server-to-server) pass — they are not
 * CSRF vectors.
 */
function verifyOrigin(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  if (!origin) {
    return next();
  }

  const host = req.headers['x-forwarded-host'] ?? req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
  if (origin === `${protocol}://${host}`) {
    return next();
  }

  // Explicit extras: the configured client origin and the API's own port
  // (covers direct-to-API tools that send an Origin).
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
