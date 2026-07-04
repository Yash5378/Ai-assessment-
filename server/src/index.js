const createApp = require('./app');
const env = require('./config/env');
const { pool } = require('./db/pool');
const { migrate } = require('./db/migrate');

const DB_RETRY_ATTEMPTS = 20;
const DB_RETRY_DELAY_MS = 2000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The database container may accept connections a moment after the API
 * starts, even with compose healthchecks — retry instead of crashing.
 */
async function waitForDatabase() {
  for (let attempt = 1; attempt <= DB_RETRY_ATTEMPTS; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      console.log(`Database not ready (attempt ${attempt}/${DB_RETRY_ATTEMPTS}): ${err.message}`);
      await wait(DB_RETRY_DELAY_MS);
    }
  }
  throw new Error('Could not connect to the database after multiple attempts');
}

async function start() {
  await waitForDatabase();
  await migrate();
  console.log('Database schema is up to date');

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`API listening on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
