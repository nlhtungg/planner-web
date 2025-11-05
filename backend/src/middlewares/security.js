const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('../config/app.config');

/**
 * Configure and return helmet middleware
 */
const configureHelmet = () => {
  return helmet();
};

/**
 * Configure and return CORS middleware
 */
const configureCors = () => {
  return cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  });
};

/**
 * Configure and return rate limiting middleware
 */
const configureRateLimit = () => {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: config.rateLimit.message,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

module.exports = {
  configureHelmet,
  configureCors,
  configureRateLimit,
};
