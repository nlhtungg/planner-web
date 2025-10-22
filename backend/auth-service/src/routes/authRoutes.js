const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, validateRefreshToken } = require('../middlewares/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', validateRefreshToken, authController.refreshToken);

// Protected routes (require authentication)
router.use(authenticateToken);

router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.post('/change-password', authController.changePassword);
router.post('/logout', authController.logout);

module.exports = router;