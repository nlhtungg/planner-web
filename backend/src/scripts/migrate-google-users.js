const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../utils/logger').child({ module: 'scripts/migrate-google-users' });

require('dotenv').config();

/**
 * Migration script to help identify Google users without googleId
 * This script is for investigation purposes only
 */
async function migrateGoogleUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to database');

    const googleUsersWithoutId = await User.find({
      authMethod: 'google',
      googleId: { $exists: false },
    });

    logger.info({ count: googleUsersWithoutId.length }, 'Found Google users without googleId');
    googleUsersWithoutId.forEach((user) => {
      logger.info({ userId: user._id.toString() }, 'Google user missing googleId');
    });

    const allGoogleUsers = await User.find({ authMethod: 'google' });
    logger.info({ count: allGoogleUsers.length }, 'Total Google users in database');

    if (googleUsersWithoutId.length > 0) {
      logger.info('Users without googleId will be handled automatically by the authentication flow');
      logger.info('googleId will be added when the user signs in again with Google');
    }
  } catch (error) {
    logger.error({ err: error }, 'Migration error');
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from database');
  }
}

if (require.main === module) {
  migrateGoogleUsers();
}

module.exports = migrateGoogleUsers;
