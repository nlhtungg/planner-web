const logger = require('./utils/logger').child({ module: 'setupTests' });

// Jest global setup for backend tests
// Add shared mocks, environment variables, or custom matchers here.

// Example: extend expect (add only if needed)
// const customMatchers = { /* ... */ };
// expect.extend(customMatchers);

// Increase default timeout if API/DB interactions are slower in CI
jest.setTimeout(30000);

// Prevent unhandled promise rejections from silently passing
process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled Promise Rejection (test)');
});
