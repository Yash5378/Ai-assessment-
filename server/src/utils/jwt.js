const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Signs a JWT carrying only what authorization needs: user id and role.
 * No personal data goes into the token.
 */
function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
}

/**
 * Verifies a token and returns its payload, or null if invalid/expired.
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, env.jwt.secret);
  } catch {
    return null;
  }
}

module.exports = { signToken, verifyToken };
