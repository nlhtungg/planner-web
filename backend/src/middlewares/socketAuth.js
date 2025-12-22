const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');

/**
 * Socket.IO authentication middleware
 * Validates JWT token from handshake auth
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify token
    const decoded = authService.verifyAccessToken(token);
    
    // Get user from database
    const user = await userRepository.getUserById(decoded.id);
    
    if (!user) {
      return next(new Error('User not found'));
    }

    if (!user.isActive) {
      return next(new Error('Account is deactivated'));
    }

    // Attach user to socket
    socket.userId = user._id.toString();
    socket.userEmail = user.email;
    
    console.log(`🔐 Socket authenticated for user: ${user.email} (${socket.userId})`);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }
    console.error('Socket auth error:', error.message);
    return next(new Error('Invalid token'));
  }
};

module.exports = socketAuthMiddleware;
