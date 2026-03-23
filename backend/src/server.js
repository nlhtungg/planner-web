const logger = require('./utils/logger').child({ module: 'server' });
const dns = require('dns');
const socketIo = require('socket.io');
const app = require('./app');
const config = require('./config/app.config');
const connectDB = require('./utils/database');

// Force IPv4 DNS resolution to avoid IPv6 issues in Docker
dns.setDefaultResultOrder('ipv4first');

/**
 * Connect to Database
 */
connectDB();

/**
 * Start Server
 */
const server = app.listen(config.port, () => {
  logger.info({
    port: config.port,
    env: config.env,
    database: 'MongoDB',
  }, 'HTTP server started');
});

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket authentication middleware
const socketAuthMiddleware = require('./middlewares/socketAuth');
io.use(socketAuthMiddleware);

io.on('connection', (socket) => {
  const socketLogger = logger.child({
    socketId: socket.id,
    userId: socket.userId,
  });

  socketLogger.info('Socket connected');

  // Auto-join user's personal chat room on connection
  const userRoom = `user-${socket.userId}`;
  socket.join(userRoom);
  socketLogger.info({ room: userRoom }, 'Joined personal chat room');

  // Join workspace room for real-time updates
  socket.on('join-workspace', (workspaceId) => {
    const roomName = `workspace-${workspaceId}`;
    socket.join(roomName);
    const room = io.sockets.adapter.rooms.get(roomName);

    socketLogger.info({
      workspaceId,
      room: roomName,
      roomSize: room ? room.size : 0,
    }, 'Joined workspace room');

    socket.emit('joined-workspace', { workspaceId, roomSize: room ? room.size : 0 });
  });

  socket.on('leave-workspace', (workspaceId) => {
    const roomName = `workspace-${workspaceId}`;
    socket.leave(roomName);
    socketLogger.info({ workspaceId, room: roomName }, 'Left workspace room');
  });

  // Chat events - validate userId matches authenticated user
  socket.on('join-chat', (userId) => {
    if (userId !== socket.userId) {
      socketLogger.warn({ requestedUserId: userId }, 'Rejected attempt to join another user chat room');
      socket.emit('error', { message: 'Cannot join another user\'s chat room' });
      return;
    }

    const chatRoom = `user-${userId}`;
    socket.join(chatRoom);
    const room = io.sockets.adapter.rooms.get(chatRoom);

    socketLogger.info({
      requestedUserId: userId,
      room: chatRoom,
      roomSize: room ? room.size : 0,
    }, 'Joined chat room');

    socket.emit('joined-chat', { userId, roomSize: room ? room.size : 0 });
  });

  socket.on('leave-chat', (userId) => {
    if (userId !== socket.userId) {
      return;
    }

    const chatRoom = `user-${userId}`;
    socket.leave(chatRoom);
    socketLogger.info({ requestedUserId: userId, room: chatRoom }, 'Left chat room');
  });

  socket.on('typing', ({ senderId, receiverId }) => {
    socket.to(`user-${receiverId}`).emit('user-typing', { userId: senderId });
  });

  socket.on('stop-typing', ({ senderId, receiverId }) => {
    socket.to(`user-${receiverId}`).emit('user-stop-typing', { userId: senderId });
  });

  // Document collaboration events
  socket.on('join-document', (documentId) => {
    socket.join(documentId);
    socketLogger.info({ documentId }, 'Joined document room');
  });

  socket.on('leave-document', (documentId) => {
    socket.leave(documentId);
    socketLogger.info({ documentId }, 'Left document room');
  });

  socket.on('send-changes', (delta, documentId) => {
    socket.broadcast.to(documentId).emit('receive-changes', delta);
  });

  socket.on('new-comment', (comment, documentId) => {
    socket.broadcast.to(documentId).emit('comment-added', comment);
  });

  socket.on('new-version', (version, documentId) => {
    socket.broadcast.to(documentId).emit('version-added', version);
  });

  socket.on('disconnect', () => {
    socketLogger.info('Socket disconnected');
  });
});

// Make io instance available globally for controllers
global.io = io;
logger.info('Socket.io initialized');

/**
 * Graceful Shutdown
 */
const gracefulShutdown = (signal) => {
  logger.info({ signal }, 'Starting graceful shutdown');

  server.close(() => {
    logger.info('HTTP server closed');

    if (global.mongoose && global.mongoose.connection) {
      global.mongoose.connection.close(() => {
        logger.info('Database connection closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });

  setTimeout(() => {
    logger.fatal({ signal }, 'Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, 'Unhandled rejection');
  gracefulShutdown('unhandledRejection');
});

module.exports = server;
