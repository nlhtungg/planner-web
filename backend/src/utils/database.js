const mongoose = require('mongoose');

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

      console.log(`MongoDB Connected: ${conn.connection.host}`);

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Attempting to reconnect...');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
      });

      return; // Successfully connected, exit the function

    } catch (error) {
      console.error(`MongoDB connection attempt ${i + 1}/${retries} failed:`, error.message);
      
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('All MongoDB connection attempts failed. Exiting...');
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;