const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, validateRefreshToken } = require('../middlewares/auth');

// Public routes - Local Authentication
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', validateRefreshToken, authController.refreshToken);

// Public routes - Google OAuth
router.post('/google', authController.googleAuth); // Client-side flow (ID token)
router.get('/google/url', authController.getGoogleAuthUrl); // Get auth URL for server-side flow
router.post('/google/callback', authController.googleCallback); // Server-side flow callback

// Protected routes (require authentication)
router.use(authenticateToken);

router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.post('/change-password', authController.changePassword);
router.post('/logout', authController.logout);

module.exports = router;