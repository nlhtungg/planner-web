const crypto = require('crypto');
const express = require('express');
const morgan = require('morgan');
const config = require('./config/app.config');
const { configureHelmet, configureCors, configureRateLimit } = require('./middlewares/security');
const requestTimeout = require('./middlewares/requestTimeout');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./utils/logger').child({ module: 'app' });

const app = express();

app.set('trust proxy', 1);

/**
 * Security Middleware
 */
app.use(configureHelmet());
app.use(configureCors());
//app.use(configureRateLimit());

/**
 * Request Timeout Middleware
 * Prevents hanging requests from blocking the server
 */
app.use(requestTimeout(30000)); // 30 second timeout

/**
 * Body Parsing Middleware
 */
app.use(express.json({ limit: config.bodyParser.jsonLimit }));
app.use(express.urlencoded({
  extended: true,
  limit: config.bodyParser.urlEncodedLimit
}));

app.use((req, res, next) => {
  const startTime = process.hrtime.bigint();
  const requestId = crypto.randomUUID();

  req.requestId = requestId;
  req.log = logger.child({
    requestId,
    method: req.method,
    path: req.originalUrl || req.path,
  });

  req.log.info('Request started');

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    req.log.info({
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    }, 'Request completed');
  });

  next();
});

/**
 * Routes
 */
app.use(routes);

/**
 * Error Handling Middleware (must be last)
 */
app.use(errorHandler);

module.exports = app;
