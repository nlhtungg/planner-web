const jwt = require('jsonwebtoken');
const User = require('../models/User');
const userRepository = require('../repositories/userRepository');
const authService = require('../services/authService');
const googleAuthService = require('../services/googleAuthService');
const minioService = require('../services/minioService');
const totpService = require('../services/totpService');
const { 
  validateRegistration, 
  validateLogin, 
  validateGoogleAuth,
  validateGoogleCallback,
  validateChangePassword
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
      
      // Generate activation code
      const activationCode = authService.generateActivationCode();
      const activationCodeExpiry = authService.getActivationCodeExpiry();
      
      // Log activation code for development (remove in production)
      console.log(`🔐 Activation code for ${user.email}: ${activationCode}`);
      
      // Save activation code to user
      await User.findByIdAndUpdate(user._id, {
        activationCode,
        activationCodeExpiry
      });

      // Send activation code via email
      const emailService = require('../services/emailService');
      try {
        await emailService.sendActivationCode(user.email, activationCode, user.firstName);
      } catch (emailError) {
        console.error('Error sending activation email:', emailError);
        // Continue with registration even if email fails
      }

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email for the activation code.',
        data: {
          userId: user._id,
          email: user.email,
          requiresActivation: true
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

      // Check if account is activated
      if (!user.isActivated) {
        return res.status(403).json({
          success: false,
          message: 'Account is not activated. Please activate your account.',
          requiresActivation: true,
          userId: user._id,
          email: user.email
        });
      }

      // Check if TOTP is enabled for this user
      if (user.totpEnabled) {
        return res.status(200).json({
          success: true,
          requiresTOTP: true,
          message: 'Please enter your 6-digit authentication code',
          userId: user._id
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

      let user;
      let isNewUser = false;

      // First check if user exists by Google ID
      user = await User.findOne({ googleId: googleUser.googleId });
      
      if (user) {
        // Existing Google user - update last login and avatar
        await User.findByIdAndUpdate(user._id, { 
          lastLogin: new Date(),
          avatar: googleUser.avatar || user.avatar,
          // Update email if it changed in Google account
          email: googleUser.email
        });
        user = await User.findById(user._id);
      } else {
        // Check if user exists with this email but different auth method
        const existingEmailUser = await User.findOne({ email: googleUser.email });
        
        if (existingEmailUser) {
          if (existingEmailUser.authMethod === 'local') {
            return res.status(400).json({
              success: false,
              message: 'This email is already registered with a password. Please sign in with your email and password instead.'
            });
          } else if (existingEmailUser.authMethod === 'google' && !existingEmailUser.googleId) {
            // Existing Google user without googleId (data migration case)
            await User.findByIdAndUpdate(existingEmailUser._id, { 
              googleId: googleUser.googleId,
              lastLogin: new Date(),
              avatar: googleUser.avatar || existingEmailUser.avatar
            });
            user = await User.findById(existingEmailUser._id);
          }
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
          isNewUser = true;
          
          // Generate activation code for new Google users
          const activationCode = authService.generateActivationCode();
          const activationCodeExpiry = authService.getActivationCodeExpiry();
          
          console.log(`🔐 Activation code for ${user.email}: ${activationCode}`);
          
          await User.findByIdAndUpdate(user._id, {
            activationCode,
            activationCodeExpiry
          });
          
          // Send activation code via email
          const emailService = require('../services/emailService');
          try {
            await emailService.sendActivationCode(user.email, activationCode, user.firstName);
          } catch (emailError) {
            console.error('Error sending activation email:', emailError);
          }
          
          return res.status(201).json({
            success: true,
            message: 'Account created successfully. Please check your email for the activation code.',
            data: {
              userId: user._id,
              email: user.email,
              requiresActivation: true
            }
          });
        }
      }

      // Check if existing user is activated
      if (!user.isActivated) {
        return res.status(403).json({
          success: false,
          message: 'Account is not activated. Please activate your account.',
          requiresActivation: true,
          userId: user._id,
          email: user.email
        });
      }

      // Check if TOTP is enabled for this user
      if (user.totpEnabled) {
        return res.status(200).json({
          success: true,
          requiresTOTP: true,
          message: 'Please enter your 6-digit authentication code',
          userId: user._id
        });
      }

      // Generate tokens for activated existing users
      const { accessToken, refreshToken } = authService.generateTokens(user._id);
      
      // Save refresh token
      await authService.saveRefreshToken(user._id, refreshToken);

      res.status(200).json({
        success: true,
        message: 'Login successful',
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

      let user;
      let isNewUser = false;

      // First check if user exists by Google ID
      user = await User.findOne({ googleId: userInfo.googleId });
      
      if (user) {
        // Existing Google user - update last login and avatar
        await User.findByIdAndUpdate(user._id, { 
          lastLogin: new Date(),
          avatar: userInfo.avatar || user.avatar,
          // Update email if it changed in Google account
          email: userInfo.email
        });
        user = await User.findById(user._id);
      } else {
        // Check if user exists with this email but different auth method
        const existingEmailUser = await User.findOne({ email: userInfo.email });
        
        if (existingEmailUser) {
          if (existingEmailUser.authMethod === 'local') {
            return res.status(400).json({
              success: false,
              message: 'This email is already registered with a password. Please sign in with your email and password instead.'
            });
          } else if (existingEmailUser.authMethod === 'google' && !existingEmailUser.googleId) {
            // Existing Google user without googleId (data migration case)
            await User.findByIdAndUpdate(existingEmailUser._id, { 
              googleId: userInfo.googleId,
              lastLogin: new Date(),
              avatar: userInfo.avatar || existingEmailUser.avatar
            });
            user = await User.findById(existingEmailUser._id);
          }
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
          isNewUser = true;
          
          // Generate activation code for new Google users
          const activationCode = authService.generateActivationCode();
          const activationCodeExpiry = authService.getActivationCodeExpiry();
          
          console.log(`🔐 Activation code for ${user.email}: ${activationCode}`);
          
          await User.findByIdAndUpdate(user._id, {
            activationCode,
            activationCodeExpiry
          });
          
          // Send activation code via email
          const emailService = require('../services/emailService');
          try {
            await emailService.sendActivationCode(user.email, activationCode, user.firstName);
          } catch (emailError) {
            console.error('Error sending activation email:', emailError);
          }
          
          return res.status(201).json({
            success: true,
            message: 'Account created successfully. Please check your email for the activation code.',
            data: {
              userId: user._id,
              email: user.email,
              requiresActivation: true
            }
          });
        }
      }

      // Check if existing user is activated
      if (!user.isActivated) {
        return res.status(403).json({
          success: false,
          message: 'Account is not activated. Please activate your account.',
          requiresActivation: true,
          userId: user._id,
          email: user.email
        });
      }

      // Generate tokens for activated existing users
      const { accessToken, refreshToken } = authService.generateTokens(user._id);
      
      // Save refresh token
      await authService.saveRefreshToken(user._id, refreshToken);

      res.status(200).json({
        success: true,
        message: 'Login successful',
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
      const userId = req.user?._id || req.user?.id;

      console.log('Logout request - userId:', userId, 'refreshToken provided:', !!refreshToken);

      if (refreshToken && userId) {
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
      const userId = req.user._id || req.user.id;
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

  // Get public profile of another user
  async getUserPublicProfile(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user._id || req.user.id;

      const user = await userRepository.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Return public profile (exclude sensitive info)
      const publicProfile = {
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        phone: user.phone,
        location: user.location,
        company: user.company,
        jobTitle: user.jobTitle,
        website: user.website,
        socialLinks: user.socialLinks,
        createdAt: user.createdAt,
        authMethod: user.authMethod
      };

      res.status(200).json({
        success: true,
        data: { user: publicProfile }
      });
    } catch (error) {
      console.error('Get public profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user._id || req.user.id;
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
      // Validate input data
      const { error } = validateChangePassword(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user._id || req.user.id;

      console.log('Change password request for userId:', userId);
      console.log('User object:', { id: req.user._id, email: req.user.email, authMethod: req.user.authMethod });

      // Check if user is using local auth (check from req.user first, then database)
      if (req.user.authMethod !== 'local') {
        return res.status(400).json({
          success: false,
          message: 'Password change is not available for Google authenticated accounts'
        });
      }

      const user = await User.findById(userId).select('+password');
      if (!user) {
        console.error('User not found in database for userId:', userId);
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      console.log('Found user in database:', { id: user._id, email: user.email, authMethod: user.authMethod });

      // Double check auth method from database
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

      console.log('Password updated successfully for user:', user.email);

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

  // Upload user avatar
  async uploadAvatar(req, res) {
    try {
      console.log('📸 Avatar upload request received for user:', req.user?._id || req.user?.id);
      console.log('📁 File details:', req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file received');
      
      const userId = req.user._id || req.user.id;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed'
        });
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (req.file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size is 5MB'
        });
      }

      // Upload to MinIO
      const uploadResult = await minioService.uploadAvatar(
        userId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload avatar'
        });
      }

      // Update user's avatar URL in database
      console.log('💾 Updating user avatar in database for userId:', userId);
      const updatedUser = await userRepository.updateUser(userId, {
        avatar: uploadResult.url
      });
      console.log('✅ Database updated successfully. User avatar field:', updatedUser.avatar);

      res.status(200).json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          user: { ...updatedUser, avatarUrl: uploadResult.url },
          avatarUrl: uploadResult.url
        }
      });
      console.log('📤 Avatar upload response sent successfully');
    } catch (error) {
      console.error('Upload avatar error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Delete user avatar
  async deleteAvatar(req, res) {
    try {
      const userId = req.user._id || req.user.id;

      // Delete from MinIO
      await minioService.deleteAvatar(userId);

      // Update user's avatar URL in database
      const updatedUser = await userRepository.updateUser(userId, {
        avatar: null
      });

      res.status(200).json({
        success: true,
        message: 'Avatar deleted successfully',
        data: { user: updatedUser }
      });
    } catch (error) {
      console.error('Delete avatar error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Activate account with code
  async activateAccount(req, res) {
    try {
      const { userId, code } = req.body;

      if (!userId || !code) {
        return res.status(400).json({
          success: false,
          message: 'User ID and activation code are required'
        });
      }

      // Verify activation code
      const result = await authService.verifyActivationCode(userId, code);

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Generate tokens for the activated user
      const { accessToken, refreshToken } = authService.generateTokens(userId);
      
      // Save refresh token
      await authService.saveRefreshToken(userId, refreshToken);

      // Update last login
      await User.findByIdAndUpdate(userId, { lastLogin: new Date() });

      res.status(200).json({
        success: true,
        message: 'Account activated successfully',
        data: {
          user: result.data.user,
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Activation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Resend activation code
  async resendActivationCode(req, res) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if already activated
      if (user.isActivated) {
        return res.status(400).json({
          success: false,
          message: 'Account is already activated'
        });
      }

      // Generate new activation code
      const activationCode = authService.generateActivationCode();
      const activationCodeExpiry = authService.getActivationCodeExpiry();
      
      // Log activation code for development (remove in production)
      console.log(`🔐 Resent activation code for ${user.email}: ${activationCode}`);
      
      // Save new activation code
      user.activationCode = activationCode;
      user.activationCodeExpiry = activationCodeExpiry;
      await user.save();

      // Send activation code via email
      const emailService = require('../services/emailService');
      try {
        await emailService.sendActivationCode(user.email, activationCode, user.firstName);
        res.status(200).json({
          success: true,
          message: 'Activation code resent successfully'
        });
      } catch (emailError) {
        console.error('Error sending activation email:', emailError);
        res.status(500).json({
          success: false,
          message: 'Failed to send activation email'
        });
      }
    } catch (error) {
      console.error('Resend activation code error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // ============ TOTP (Two-Factor Authentication) Methods ============

  /**
   * Setup TOTP - Generate secret and QR code
   * User must be authenticated to access this
   */
  async setupTOTP(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.totpEnabled) {
        return res.status(400).json({
          success: false,
          message: 'TOTP is already enabled for this account'
        });
      }

      // Generate new TOTP secret
      const { secret, otpauthUrl } = totpService.generateSecret(user.email);
      
      // Generate QR code
      const qrCodeDataUrl = await totpService.generateQRCode(otpauthUrl);

      // Save secret temporarily (not enabled yet until verified)
      await User.findByIdAndUpdate(userId, {
        totpSecret: secret
      });

      res.status(200).json({
        success: true,
        message: 'TOTP setup initiated. Please scan the QR code with your authenticator app.',
        data: {
          secret: secret,
          qrCode: qrCodeDataUrl
        }
      });
    } catch (error) {
      console.error('Setup TOTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Enable TOTP - Verify the initial token and enable 2FA
   */
  async enableTOTP(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const { token } = req.body;

      if (!token || !/^\d{6}$/.test(token)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid token format. Please provide a 6-digit code.'
        });
      }

      const user = await User.findById(userId).select('+totpSecret');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.totpEnabled) {
        return res.status(400).json({
          success: false,
          message: 'TOTP is already enabled'
        });
      }

      if (!user.totpSecret) {
        return res.status(400).json({
          success: false,
          message: 'TOTP setup not initiated. Please call /setup-totp first.'
        });
      }

      // Verify the token
      const isValid = totpService.verifyToken(token, user.totpSecret);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code. Please try again.'
        });
      }

      // Generate backup codes
      const backupCodes = totpService.generateBackupCodes();

      // Enable TOTP
      await User.findByIdAndUpdate(userId, {
        totpEnabled: true,
        totpBackupCodes: backupCodes
      });

      // Format backup codes for display
      const formattedBackupCodes = totpService.formatBackupCodes(backupCodes);

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication enabled successfully',
        data: {
          backupCodes: formattedBackupCodes
        }
      });
    } catch (error) {
      console.error('Enable TOTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Verify TOTP during login
   * This is called after username/password or Google auth
   */
  async verifyTOTP(req, res) {
    try {
      const { userId, token } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      if (!token || !/^\d{6}$/.test(token)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid token format. Please provide a 6-digit code.'
        });
      }

      const user = await User.findById(userId).select('+totpSecret +totpBackupCodes');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.totpEnabled) {
        return res.status(400).json({
          success: false,
          message: 'TOTP is not enabled for this account'
        });
      }

      // Verify the token
      const isValid = totpService.verifyToken(token, user.totpSecret);

      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid verification code'
        });
      }

      // Generate tokens after successful TOTP verification
      const { accessToken, refreshToken } = authService.generateTokens(user._id);
      
      // Save refresh token
      await authService.saveRefreshToken(user._id, refreshToken);

      // Update last login
      await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

      // Remove sensitive fields
      const userResponse = user.toJSON();

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication verified successfully',
        data: {
          user: userResponse,
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Verify TOTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Verify backup code during login (alternative to TOTP)
   */
  async verifyBackupCode(req, res) {
    try {
      const { userId, backupCode } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      if (!backupCode) {
        return res.status(400).json({
          success: false,
          message: 'Backup code is required'
        });
      }

      const user = await User.findById(userId).select('+totpBackupCodes');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.totpEnabled) {
        return res.status(400).json({
          success: false,
          message: 'TOTP is not enabled for this account'
        });
      }

      // Verify backup code
      const result = totpService.verifyBackupCode(backupCode, user.totpBackupCodes);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.message
        });
      }

      // Update backup codes (mark as used)
      await User.findByIdAndUpdate(userId, {
        totpBackupCodes: result.backupCodes
      });

      // Generate tokens after successful backup code verification
      const { accessToken, refreshToken } = authService.generateTokens(user._id);
      
      // Save refresh token
      await authService.saveRefreshToken(user._id, refreshToken);

      // Update last login
      await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

      // Remove sensitive fields
      const userResponse = user.toJSON();

      res.status(200).json({
        success: true,
        message: 'Backup code verified successfully',
        data: {
          user: userResponse,
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Verify backup code error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Disable TOTP - User must verify with current TOTP token
   */
  async disableTOTP(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const { token } = req.body;

      if (!token || !/^\d{6}$/.test(token)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid token format. Please provide a 6-digit code.'
        });
      }

      const user = await User.findById(userId).select('+totpSecret');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.totpEnabled) {
        return res.status(400).json({
          success: false,
          message: 'TOTP is not enabled'
        });
      }

      // Verify the token before disabling
      const isValid = totpService.verifyToken(token, user.totpSecret);

      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid verification code'
        });
      }

      // Disable TOTP and clear secret and backup codes
      await User.findByIdAndUpdate(userId, {
        totpEnabled: false,
        totpSecret: null,
        totpBackupCodes: []
      });

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication disabled successfully'
      });
    } catch (error) {
      console.error('Disable TOTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get TOTP status for the authenticated user
   */
  async getTOTPStatus(req, res) {
    try {
      const userId = req.user._id || req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          totpEnabled: user.totpEnabled || false
        }
      });
    } catch (error) {
      console.error('Get TOTP status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

}

module.exports = new AuthController();