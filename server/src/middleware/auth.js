const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/jwt');

/**
 * Requires a valid JWT (sent as an httpOnly cookie). Attaches the decoded
 * identity to req.user as { id, role }.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return next(ApiError.unauthorized());
  }

  const payload = verifyToken(token);
  if (!payload) {
    return next(ApiError.unauthorized('Invalid or expired session, please log in again'));
  }

  req.user = { id: payload.sub, role: payload.role };
  return next();
}

/**
 * Requires the authenticated user to have one of the given roles.
 * Must run after requireAuth.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden());
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
