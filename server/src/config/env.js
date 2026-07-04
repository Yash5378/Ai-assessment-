/**
 * Central place where all environment configuration is read and validated.
 * Nothing else in the codebase touches process.env directly.
 */
const required = (name, fallback) => {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  db: {
    host: required('DB_HOST', 'localhost'),
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: required('DB_USER', 'recruiter'),
    password: required('DB_PASSWORD', 'recruiter_dev_password'),
    database: required('DB_NAME', 'recruitment_portal'),
  },

  jwt: {
    secret: required('JWT_SECRET', 'dev-only-secret-do-not-use-in-production'),
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',

  // Secure cookies require HTTPS; kept opt-in so the assessment stack works
  // over plain http://localhost without silently dropping the auth cookie.
  cookieSecure: process.env.COOKIE_SECURE === 'true',

  isProduction: (process.env.NODE_ENV || 'development') === 'production',
};

module.exports = env;
