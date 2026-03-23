const mongoose = require('mongoose');
const logger = require('./logger').child({ module: 'utils/database' });

const connectDB = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const mongoURI = process.env.MONGODB_URI || 'mongodb://admin:admin123@mongodb:27017/auth_db?authSource=admin';
      
      const conn = await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        maxPoolSize: 50, // Maintain up to 50 socket connections
        minPoolSize: 2, // Maintain at least 2 socket connections
        maxIdleTimeMS: 10000, // Close idle connections after 10s
      });

      logger.info({ host: conn.connection.host }, 'MongoDB connected');

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        logger.error({ err }, 'MongoDB connection error');
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      return; // Successfully connected, exit the function

    } catch (error) {
      logger.error({
        err: error,
        attempt: i + 1,
        retries,
      }, 'MongoDB connection attempt failed');
      
      if (i < retries - 1) {
        logger.warn({ retryInSeconds: delay / 1000 }, 'Retrying MongoDB connection');
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logger.fatal({ retries }, 'All MongoDB connection attempts failed');
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;
