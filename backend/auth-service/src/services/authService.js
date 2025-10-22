const jwt = require('jsonwebtoken');
const User = require('../models/User');
const userRepository = require('../repositories/userRepository');

class AuthService {
  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'access_token_secret_key_for_auth_service';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'refresh_token_secret_key_for_auth_service';
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  // Generate access and refresh tokens
  generateTokens(userId) {
    const payload = { id: userId };

    const accessToken = jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'auth-service',
      audience: 'web-app'
    });

    const refreshToken = jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'auth-service',
      audience: 'web-app'
    });

    return { accessToken, refreshToken };
  }

  // Verify access token
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.accessTokenSecret, {
        issuer: 'auth-service',
        audience: 'web-app'
      });
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  // Verify refresh token
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'auth-service',
        audience: 'web-app'
      });
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Save refresh token to user
  async saveRefreshToken(userId, refreshToken) {
    try {
      await userRepository.addRefreshToken(userId, refreshToken);
    } catch (error) {
      throw error;
    }
  }

  // Remove refresh token from user
  async removeRefreshToken(userId, refreshToken) {
    try {
      await userRepository.removeRefreshToken(userId, refreshToken);
    } catch (error) {
      throw error;
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);
      
      // Check if refresh token exists in database
      const user = await userRepository.findUserByRefreshToken(refreshToken);
      if (!user || user._id.toString() !== decoded.id) {
        return {
          success: false,
          message: 'Invalid refresh token'
        };
      }

      // Check if user is still active
      if (!user.isActive) {
        return {
          success: false,
          message: 'Account is deactivated'
        };
      }

      // Generate new tokens
      const tokens = this.generateTokens(user._id);
      
      // Remove old refresh token and save new one
      await this.removeRefreshToken(user._id, refreshToken);
      await this.saveRefreshToken(user._id, tokens.refreshToken);

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: user.toJSON()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Invalid or expired refresh token'
      };
    }
  }

  // Validate user credentials
  async validateUser(identifier, password) {
    try {
      const user = await User.findByEmailOrUsername(identifier).select('+password');
      if (!user) {
        return null;
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return null;
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Generate password reset token
  generatePasswordResetToken(userId) {
    const payload = { 
      id: userId, 
      type: 'password_reset',
      timestamp: Date.now()
    };

    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: '1h', // Password reset token expires in 1 hour
      issuer: 'auth-service',
      audience: 'web-app'
    });
  }

  // Verify password reset token
  verifyPasswordResetToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'auth-service',
        audience: 'web-app'
      });

      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired password reset token');
    }
  }

  // Extract token from header
  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  // Generate email verification token
  generateEmailVerificationToken(userId) {
    const payload = { 
      id: userId, 
      type: 'email_verification',
      timestamp: Date.now()
    };

    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: '24h', // Email verification token expires in 24 hours
      issuer: 'auth-service',
      audience: 'web-app'
    });
  }

  // Verify email verification token
  verifyEmailVerificationToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'auth-service',
        audience: 'web-app'
      });

      if (decoded.type !== 'email_verification') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired email verification token');
    }
  }
}

module.exports = new AuthService();