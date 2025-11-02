const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

class GoogleAuthService {
  constructor() {
    this.client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Verify Google ID token from client-side authentication
   * @param {string} idToken - Google ID token from client
   * @returns {Promise<Object>} User profile data
   */
  async verifyIdToken(idToken) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload();
      
      return {
        googleId: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        avatar: payload.picture || null,
        name: payload.name || ''
      };
    } catch (error) {
      console.error('Error verifying Google ID token:', error);
      throw new Error('Invalid Google ID token');
    }
  }

  /**
   * Exchange authorization code for tokens (server-side flow)
   * @param {string} code - Authorization code from Google
   * @returns {Promise<Object>} Tokens and user info
   */
  async getTokensFromCode(code) {
    try {
      const { tokens } = await this.client.getToken(code);
      this.client.setCredentials(tokens);
      
      const userInfo = await this.getUserInfo(tokens.access_token);
      
      return {
        tokens,
        userInfo
      };
    } catch (error) {
      console.error('Error getting tokens from code:', error);
      throw new Error('Failed to exchange authorization code');
    }
  }

  /**
   * Get user info from Google using access token
   * @param {string} accessToken - Google access token
   * @returns {Promise<Object>} User profile data
   */
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const data = response.data;
      
      return {
        googleId: data.id,
        email: data.email,
        emailVerified: data.verified_email,
        firstName: data.given_name || '',
        lastName: data.family_name || '',
        avatar: data.picture || null,
        name: data.name || ''
      };
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw new Error('Failed to fetch user information from Google');
    }
  }

  /**
   * Generate Google OAuth URL for authorization
   * @returns {string} Authorization URL
   */
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }
}

module.exports = new GoogleAuthService();
