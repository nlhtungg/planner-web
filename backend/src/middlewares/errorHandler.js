const errorHandler = (err, req, res, next) => {
  // Enhanced error logging with more context
  console.error('='.repeat(50));
  console.error('Error occurred:');
  console.error('Time:', new Date().toISOString());
  console.error('Method:', req.method);
  console.error('Path:', req.path);
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  console.error('='.repeat(50));

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return res.status(400).json({
      success: false,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`
    });
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Request timeout
  if (err.statusCode === 408 || err.message === 'Request timeout') {
    return res.status(408).json({
      success: false,
      message: 'Request timeout - the server took too long to respond'
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;