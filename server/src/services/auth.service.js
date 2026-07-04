const db = require('../db/pool');
const ApiError = require('../utils/ApiError');
const { hashPassword, verifyPassword } = require('../utils/password');

const PUBLIC_USER_FIELDS = 'id, name, email, role, created_at AS "createdAt"';

/**
 * Registers an account as either HR (recruiter) or CANDIDATE. The role is
 * whitelisted by the zod enum before it reaches this function, so nothing
 * outside those two roles can ever be created.
 */
async function register({ name, email, password, role }) {
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const result = await db.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_USER_FIELDS}`,
    [name, email, passwordHash, role]
  );
  return result.rows[0];
}

/**
 * Verifies credentials. The same generic message is used whether the email
 * is unknown or the password is wrong, so accounts cannot be enumerated.
 */
async function login({ email, password }) {
  const result = await db.query(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
    [email]
  );
  const user = result.rows[0];

  const passwordMatches = user ? await verifyPassword(password, user.password_hash) : false;
  if (!user || !passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const { password_hash: _omitted, ...publicUser } = user;
  return publicUser;
}

async function getUserById(id) {
  const result = await db.query(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = $1`, [id]);
  if (result.rows.length === 0) {
    throw ApiError.unauthorized('Account no longer exists');
  }
  return result.rows[0];
}

module.exports = { register, login, getUserById };
