// Force IPv4 DNS resolution to avoid IPv6 issues in Docker
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const app = require('./app');
const config = require('./config/app.config');
const connectDB = require('./utils/database');

/**
 * Connect to Database
 */
connectDB();

/**
 * Start Server
 */
const server = app.listen(config.port, () => {
  console.log('=================================');
  console.log(`🚀 Server running on port ${config.port}`);
  console.log(`📝 Environment: ${config.env}`);
  console.log(`🗄️  Database: MongoDB`);
});

// Initialize Socket.io
const io = require('socket.io')(server, {
  cors: {
    origin: config.cors.origin,
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Join workspace room for real-time updates
  socket.on('join-workspace', (workspaceId) => {
    socket.join(`workspace-${workspaceId}`);
    console.log(`✅ User ${socket.id} joined workspace-${workspaceId}`);
    
    // Log all clients in the room for debugging
    const room = io.sockets.adapter.rooms.get(`workspace-${workspaceId}`);
    console.log(`   Total clients in workspace-${workspaceId}:`, room ? room.size : 0);
  });

  socket.on('leave-workspace', (workspaceId) => {
    socket.leave(`workspace-${workspaceId}`);
    console.log(`❌ User ${socket.id} left workspace-${workspaceId}`);
  });

  // Chat events
  socket.on('join-chat', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`💬 User ${socket.id} joined chat room user-${userId}`);
  });

  socket.on('leave-chat', (userId) => {
    socket.leave(`user-${userId}`);
    console.log(`💬 User ${socket.id} left chat room user-${userId}`);
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
    console.log(`User ${socket.id} joined document ${documentId}`);
  });

  socket.on('leave-document', (documentId) => {
    socket.leave(documentId);
    console.log(`User ${socket.id} left document ${documentId}`);
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
    console.log('User disconnected:', socket.id);
  });
});

// Make io instance available globally for controllers
global.io = io;

console.log('📡 Socket.io initialized');
console.log('=================================');

/**
 * Graceful Shutdown
 */
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    console.log('✅ HTTP server closed');

    // Close database connection
    if (global.mongoose && global.mongoose.connection) {
      global.mongoose.connection.close(() => {
        console.log('✅ Database connection closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

module.exports = server;
