require('dotenv').config();

const isDevelopment = (process.env.NODE_ENV || 'development') === 'development';
const enforceStrictProductionEnv = process.env.STRICT_PRODUCTION_ENV === 'true';
const invalidProductionHosts = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'host.docker.internal',
]);

const requireProductionUrl = (value, name, { allowWildcard = false } = {}) => {
  if (!value) {
    throw new Error(`${name} must be set when NODE_ENV=production`);
  }

  if (!allowWildcard && value === '*') {
    throw new Error(`${name} must not be '*' when NODE_ENV=production`);
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch (error) {
    throw new Error(`${name} must be a valid absolute URL when NODE_ENV=production`);
  }

  if (invalidProductionHosts.has(parsedUrl.hostname)) {
    throw new Error(`${name} must not point to a local-only host when NODE_ENV=production`);
  }

  return value;
};

const productionCorsOrigin = isDevelopment || !enforceStrictProductionEnv
  ? true
  : requireProductionUrl(process.env.CORS_ORIGIN, 'CORS_ORIGIN');
const googleRedirectUri = isDevelopment || !enforceStrictProductionEnv
  ? process.env.GOOGLE_REDIRECT_URI
  : requireProductionUrl(process.env.GOOGLE_REDIRECT_URI, 'GOOGLE_REDIRECT_URI');

module.exports = {
  port: process.env.PORT || 3001,
  env: process.env.NODE_ENV || 'development',

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: googleRedirectUri,
  },

  // CORS
  cors: {
    origin: productionCorsOrigin,
    credentials: true,
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  },

  // Body parser limits
  bodyParser: {
    jsonLimit: '10mb',
    urlEncodedLimit: '10mb',
  },
};
