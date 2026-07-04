const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

/**
 * Builds the Express app. Kept separate from the HTTP listener (index.js)
 * so tests can exercise the app without opening a port.
 */
function createApp() {
  const app = express();

  // Exactly one proxy (nginx) sits in front of the API in Docker; trusting
  // it lets rate limiting see the real client IP from X-Forwarded-For
  // instead of treating every visitor as the proxy's address.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  if (env.nodeEnv === 'development') {
    app.use(morgan('dev'));
  }

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
