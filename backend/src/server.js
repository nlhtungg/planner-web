const app = require('./app');
const config = require('./config/app.config');
const connectDB = require('./utils/database');

/**
 * Connect to Database
 */
connectDB();

/**
 * Start Server
 */
const server = app.listen(config.port, () => {
  console.log('=================================');
  console.log(`🚀 Server running on port ${config.port}`);
  console.log(`📝 Environment: ${config.env}`);
  console.log(`🗄️  Database: MongoDB`);
  console.log('=================================');
});

/**
 * Graceful Shutdown
 */
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Close database connection
    if (global.mongoose && global.mongoose.connection) {
      global.mongoose.connection.close(() => {
        console.log('✅ Database connection closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

module.exports = server;
