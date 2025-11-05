const User = require('../models/User');

class UserRepository {
  // Create a new user
  async createUser(userData) {
    try {
      const user = new User(userData);
      await user.save();
      return user.toJSON();
    } catch (error) {
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      return user ? user.toJSON() : null;
    } catch (error) {
      throw error;
    }
  }

  // Get user by email
  async getUserByEmail(email) {
    try {
      const user = await User.findOne({ email });
      return user ? user.toJSON() : null;
    } catch (error) {
      throw error;
    }
  }

  // Get user by username
  async getUserByUsername(username) {
    try {
      const user = await User.findOne({ username });
      return user ? user.toJSON() : null;
    } catch (error) {
      throw error;
    }
  }

  // Update user
  async updateUser(userId, updateData) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );
      return user ? user.toJSON() : null;
    } catch (error) {
      throw error;
    }
  }

  // Delete user (soft delete - set isActive to false)
  async deleteUser(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false },
        { new: true }
      );
      return user ? user.toJSON() : null;
    } catch (error) {
      throw error;
    }
  }

  // Get all users (admin only)
  async getAllUsers(query = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const users = await User.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await User.countDocuments(query);

      return {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Check if user exists by email or username
  async userExists(email, username) {
    try {
      const user = await User.findOne({
        $or: [
          { email },
          { username }
        ]
      });
      return !!user;
    } catch (error) {
      throw error;
    }
  }

  // Add refresh token to user
  async addRefreshToken(userId, refreshToken) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.refreshTokens.push({
        token: refreshToken,
        createdAt: new Date()
      });

      // Keep only last 5 refresh tokens
      if (user.refreshTokens.length > 5) {
        user.refreshTokens = user.refreshTokens.slice(-5);
      }

      await user.save();
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Remove refresh token from user
  async removeRefreshToken(userId, refreshToken) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.refreshTokens = user.refreshTokens.filter(
        token => token.token !== refreshToken
      );

      await user.save();
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Find user with refresh token
  async findUserByRefreshToken(refreshToken) {
    try {
      const user = await User.findOne({
        'refreshTokens.token': refreshToken
      });
      return user;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserRepository();