const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');
const logger = require('../utils/logger').child({ module: 'middlewares/socketAuth' });

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

    const decoded = authService.verifyAccessToken(token);
    const user = await userRepository.getUserById(decoded.id);

    if (!user) {
      return next(new Error('User not found'));
    }

    if (!user.isActive) {
      return next(new Error('Account is deactivated'));
    }

    socket.userId = user._id.toString();
    socket.userEmail = user.email;

    logger.info({ userId: socket.userId }, 'Socket authenticated');
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }

    logger.error({ err: error }, 'Socket auth error');
    return next(new Error('Invalid token'));
  }
};

module.exports = socketAuthMiddleware;
