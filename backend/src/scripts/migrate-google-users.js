const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

/**
 * Migration script to help identify Google users without googleId
 * This script is for investigation purposes only
 */
async function migrateGoogleUsers() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Find Google auth users without googleId
    const googleUsersWithoutId = await User.find({
      authMethod: 'google',
      googleId: { $exists: false }
    });

    console.log(`Found ${googleUsersWithoutId.length} Google users without googleId:`);
    googleUsersWithoutId.forEach(user => {
      console.log(`- ${user.email} (${user._id})`);
    });

    // Find all Google users
    const allGoogleUsers = await User.find({ authMethod: 'google' });
    console.log(`\nTotal Google users in database: ${allGoogleUsers.length}`);

    if (googleUsersWithoutId.length > 0) {
      console.log('\nNote: Users without googleId will be handled automatically by the authentication flow.');
      console.log('When they sign in again with Google, their googleId will be added.');
    }

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

if (require.main === module) {
  migrateGoogleUsers();
}

module.exports = migrateGoogleUsers;