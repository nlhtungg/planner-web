/**
 * Request Timeout Middleware
 * Prevents long-running requests from hanging the server
 */

const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    // Set request timeout
    req.setTimeout(timeoutMs, () => {
      const err = new Error('Request timeout');
      err.statusCode = 408;
      next(err);
    });

    // Set response timeout
    res.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timeout - the server took too long to respond'
        });
      }
    });

    next();
  };
};

module.exports = requestTimeout;
