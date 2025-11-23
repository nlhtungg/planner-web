const express = require('express');
const config = require('./config/app.config');
const { configureHelmet, configureCors, configureRateLimit } = require('./middlewares/security');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

/**
 * Security Middleware
 */
app.use(configureHelmet());
app.use(configureCors());
app.use(configureRateLimit());

/**
 * Body Parsing Middleware
 */
app.use(express.json({ limit: config.bodyParser.jsonLimit }));
app.use(express.urlencoded({ 
  extended: true, 
  limit: config.bodyParser.urlEncodedLimit 
}));

/**
 * Request Logging (development only)
 */
if (config.env === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

/**
 * Routes
 */
app.use(routes);

/**
 * Error Handling Middleware (must be last)
 */
app.use(errorHandler);

module.exports = app;
