const express = require('express');
const authRoutes = require('./authRoutes');
const workspaceRoutes = require('./workspaceRoutes');
const postRoutes = require('./postRoutes');
const taskRoutes = require('./taskRoutes');
const calendarRoutes = require('./calendarRoutes');
const messageRoutes = require('./messageRoutes');
const groupRoutes = require('./groupRoutes');
const connectionRoutes = require('./connectionRoutes');

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * API Routes
 */
router.use('/api/auth', authRoutes);
router.use('/api/workspaces', workspaceRoutes);
router.use('/api/workspaces', postRoutes);
router.use('/api/tasks', taskRoutes);
router.use('/api/calendar', calendarRoutes);
router.use('/api/documents', require('./documentRoutes'));
router.use('/api/messages', messageRoutes);
router.use('/api/groups', groupRoutes);
router.use('/api/connections', connectionRoutes);

/**
 * 404 handler for undefined routes
 */
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

module.exports = router;
