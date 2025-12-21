const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

class TotpService {
  /**
   * Generate a new TOTP secret for a user
   * @param {String} email - User's email
   * @param {String} appName - Application name
   * @returns {Object} - Secret and otpauth URL
   */
  generateSecret(email, appName = 'WorkspaceApp') {
    const secret = speakeasy.generateSecret({
      name: `${appName} (${email})`,
      issuer: appName,
      length: 32
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url
    };
  }

  /**
   * Generate QR code as data URL from otpauth URL
   * @param {String} otpauthUrl - The otpauth URL
   * @returns {Promise<String>} - QR code as data URL
   */
  async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      return qrCodeDataUrl;
    } catch (error) {
      throw new Error('Failed to generate QR code: ' + error.message);
    }
  }

  /**
   * Verify a TOTP token
   * @param {String} token - The 6-digit token from user
   * @param {String} secret - The user's TOTP secret
   * @returns {Boolean} - Whether the token is valid
   */
  verifyToken(token, secret) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps before and after (±60 seconds)
    });
  }

  /**
   * Generate backup codes for account recovery
   * @param {Number} count - Number of backup codes to generate (default 10)
   * @returns {Array} - Array of backup code objects
   */
  generateBackupCodes(count = 10) {
    const backupCodes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push({
        code: code,
        used: false
      });
    }
    return backupCodes;
  }

  /**
   * Verify a backup code
   * @param {String} inputCode - The backup code from user
   * @param {Array} backupCodes - Array of backup code objects
   * @returns {Object} - Result object with success status and updated codes
   */
  verifyBackupCode(inputCode, backupCodes) {
    const normalizedInput = inputCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    const codeIndex = backupCodes.findIndex(
      bc => bc.code === normalizedInput && !bc.used
    );

    if (codeIndex !== -1) {
      // Mark the code as used
      backupCodes[codeIndex].used = true;
      return {
        success: true,
        backupCodes: backupCodes,
        message: 'Backup code verified successfully'
      };
    }

    return {
      success: false,
      message: 'Invalid or already used backup code'
    };
  }

  /**
   * Format backup codes for display (groups of 4)
   * @param {Array} backupCodes - Array of backup code objects
   * @returns {Array} - Array of formatted codes
   */
  formatBackupCodes(backupCodes) {
    return backupCodes.map(bc => {
      const code = bc.code;
      return code.match(/.{1,4}/g).join('-');
    });
  }
}

module.exports = new TotpService();
