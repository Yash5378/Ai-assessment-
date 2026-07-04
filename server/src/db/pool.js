const { Pool } = require('pg');
const env = require('../config/env');

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  max: 10,
  idleTimeoutMillis: 30000,
});

/**
 * Thin wrapper so callers never touch the pool directly.
 * All queries are parameterized ($1, $2, ...) to prevent SQL injection.
 */
const query = (text, params) => pool.query(text, params);

module.exports = { query, pool };
