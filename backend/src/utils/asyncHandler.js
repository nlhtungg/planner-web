/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors and pass them to the error handler
 * This prevents unhandled promise rejections that could crash the server
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error('Async handler error:', err);
    next(err);
  });
};

module.exports = asyncHandler;
