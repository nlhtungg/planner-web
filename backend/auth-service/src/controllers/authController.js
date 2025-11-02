const jwt = require('jsonwebtoken');
const User = require('../models/User');
const userRepository = require('../repositories/userRepository');
const authService = require('../services/authService');
const googleAuthService = require('../services/googleAuthService');
const { 
  validateRegistration, 
  validateLogin, 
  validateGoogleAuth,
  validateGoogleCallback 
} = require('../utils/validation');

class AuthController {
  // Register a new user with email/password (local auth)
  async register(req, res) {
    try {
      const { error } = validateRegistration(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { username, email, password, firstName, lastName } = req.body;

      // Check if email already exists
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        // Check the authentication method
        if (existingEmail.authMethod === 'google') {
          return res.status(400).json({
            success: false,
            message: 'This email is already registered with Google. Please sign in with Google instead.'
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }

      // Check if username exists
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }

      // Create new user with local auth method
      const userData = {
        username,
        email,
        password,
        firstName,
        lastName,
        authMethod: 'local'
      };

      const user = await userRepository.createUser(userData);
      
      // Generate tokens
      const { accessToken, refreshToken } = authService.generateTokens(user._id);
      
      // Save refresh token
      await authService.saveRefreshToken(user._id, refreshToken);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Login user with email/password (local auth)
  async login(req, res) {
    try {
      const { error } = validateLogin(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { identifier, password } = req.body;

      // Find user by email or username
      const user = await User.findByEmailOrUsername(identifier).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if user registered with Google
      if (user.authMethod === 'google') {
        return res.status(400).json({
          success: false,
          message: 'This account was created with Google. Please sign in with Google instead.'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } = authService.generateTokens(user._id);
      
      // Save refresh token
      await authService.saveRefreshToken(user._id, refreshToken);

      // Update last login
      await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

      // Remove password from user object
      const userResponse = user.toJSON();

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      const result = await authService.refreshAccessToken(refreshToken);
      
      if (!result.success) {
        return res.status(401).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Google OAuth - Sign in with ID token (client-side flow)
  async googleAuth(req, res) {
    try {
      const { error } = validateGoogleAuth(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { idToken } = req.body;

      // Verify Google ID token
      const googleUser = await googleAuthService.verifyIdToken(idToken);

      if (!googleUser.emailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email not verified by Google'
        });
      }

      // Check if user exists by email
      let user = await User.findOne({ email: googleUser.email });

      if (user) {
        // User exists - check auth method
        if (user.authMethod === 'local') {
          return res.status(400).json({
            success: false,
            message: 'This email is already registered with a password. Please sign in with your email and password instead.'
          });
        }

        // Update last login for Google user
        await User.findByIdAndUpdate(user._id, { 
          lastLogin: new Date(),
          avatar: googleUser.avatar || user.avatar // Update avatar if changed
        });
      } else {
        // Create new user with Google auth
        const userData = {
          email: googleUser.email,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          avatar: googleUser.avatar,
          authMethod: 'google',
          googleId: googleUser.googleId,
          isEmailVerified: true
        };

        user = await userRepository.createUser(userData);
      }

      // Generate tokens
      const { accessToken, refreshToken } = authService.generateTokens(user._id);
      
      // Save refresh token
      await authService.saveRefreshToken(user._id, refreshToken);

      res.status(200).json({
        success: true,
        message: user.isNew ? 'Account created successfully' : 'Login successful',
        data: {
          user,
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Google OAuth - Get authorization URL (server-side flow)
  async getGoogleAuthUrl(req, res) {
    try {
      const authUrl = googleAuthService.getAuthUrl();
      
      res.status(200).json({
        success: true,
        data: {
          authUrl
        }
      });
    } catch (error) {
      console.error('Get Google auth URL error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Google OAuth - Handle callback (server-side flow)
  async googleCallback(req, res) {
    try {
      const { error } = validateGoogleCallback(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { code } = req.body;

      // Exchange code for tokens and get user info
      const { userInfo } = await googleAuthService.getTokensFromCode(code);

      if (!userInfo.emailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email not verified by Google'
        });
      }

      // Check if user exists by email
      let user = await User.findOne({ email: userInfo.email });

      if (user) {
        // User exists - check auth method
        if (user.authMethod === 'local') {
          return res.status(400).json({
            success: false,
            message: 'This email is already registered with a password. Please sign in with your email and password instead.'
          });
        }

        // Update last login
        await User.findByIdAndUpdate(user._id, { 
          lastLogin: new Date(),
          avatar: userInfo.avatar || user.avatar
        });
      } else {
        // Create new user with Google auth
        const userData = {
          email: userInfo.email,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          avatar: userInfo.avatar,
          authMethod: 'google',
          googleId: userInfo.googleId,
          isEmailVerified: true
        };

        user = await userRepository.createUser(userData);
      }

      // Generate tokens
      const { accessToken, refreshToken } = authService.generateTokens(user._id);
      
      // Save refresh token
      await authService.saveRefreshToken(user._id, refreshToken);

      res.status(200).json({
        success: true,
        message: user.isNew ? 'Account created successfully' : 'Login successful',
        data: {
          user,
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Google callback error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.id;

      if (refreshToken) {
        await authService.removeRefreshToken(userId, refreshToken);
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await userRepository.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updates = req.body;

      // Remove sensitive fields from updates
      delete updates.password;
      delete updates.email;
      delete updates.role;
      delete updates.refreshTokens;

      const user = await userRepository.updateUser(userId, updates);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Change password (only for local auth users)
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      const user = await User.findById(userId).select('+password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is using local auth
      if (user.authMethod !== 'local') {
        return res.status(400).json({
          success: false,
          message: 'Password change is not available for Google authenticated accounts'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Invalidate all refresh tokens for security
      await User.findByIdAndUpdate(userId, { refreshTokens: [] });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please login again.'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new AuthController();