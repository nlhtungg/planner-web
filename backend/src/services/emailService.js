const nodemailer = require('nodemailer');
const logger = require('../utils/logger').child({ module: 'services/emailService' });

class EmailService {
  constructor() {
    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  /**
   * Send activation code email
   * @param {string} email - Recipient email address
   * @param {string} code - 6-digit activation code
   * @param {string} firstName - User's first name
   */
  async sendActivationCode(email, code, firstName) {
    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Your App'}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Activate Your Account',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background-color: #4F46E5;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 5px 5px 0 0;
              }
              .content {
                background-color: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 5px 5px;
              }
              .code {
                font-size: 32px;
                font-weight: bold;
                color: #4F46E5;
                text-align: center;
                letter-spacing: 8px;
                padding: 20px;
                background-color: white;
                border-radius: 5px;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                color: #666;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Account Activation</h1>
              </div>
              <div class="content">
                <p>Hi ${firstName},</p>
                <p>Thank you for creating an account with us! To complete your registration, please use the activation code below:</p>
                <div class="code">${code}</div>
                <p>This code will expire in <strong>30 minutes</strong>.</p>
                <p>If you didn't create an account, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      return { success: true, message: 'Activation code sent successfully' };
    } catch (error) {
      logger.error({ err: error, email }, 'Failed to send activation email');
      throw new Error('Failed to send activation email');
    }
  }

  /**
   * Verify email configuration
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error({ err: error }, 'Email service configuration error');
      return false;
    }
  }
}

module.exports = new EmailService();
