const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, validateRefreshToken } = require('../middlewares/auth');
const { uploadSingle } = require('../middlewares/upload');

// Public routes - Local Authentication
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', validateRefreshToken, authController.refreshToken);
router.post('/activate', authController.activateAccount);
router.post('/resend-activation', authController.resendActivationCode);

// Public routes - Google OAuth
router.post('/google', authController.googleAuth); // Client-side flow (ID token)
router.get('/google/url', authController.getGoogleAuthUrl); // Get auth URL for server-side flow
router.post('/google/callback', authController.googleCallback); // Server-side flow callback

// Public routes - TOTP verification during login (no auth required)
router.post('/verify-totp', authController.verifyTOTP);
router.post('/verify-backup-code', authController.verifyBackupCode);

// Protected routes (require authentication)
router.use(authenticateToken);

router.get('/profile', authController.getProfile);
router.get('/users/:userId', authController.getUserPublicProfile);
router.put('/profile', authController.updateProfile);
router.post('/change-password', authController.changePassword);
router.post('/upload-avatar', (req, res, next) => {
  console.log('🛣️ Upload avatar route hit');
  next();
}, uploadSingle, authController.uploadAvatar);
router.delete('/delete-avatar', authController.deleteAvatar);
router.post('/logout', authController.logout);

// TOTP management routes (protected)
router.get('/totp/status', authController.getTOTPStatus);
router.post('/totp/setup', authController.setupTOTP);
router.post('/totp/enable', authController.enableTOTP);
router.post('/totp/disable', authController.disableTOTP);

module.exports = router;