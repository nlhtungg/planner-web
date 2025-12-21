const express = require('express');
const router = express.Router();
const multer = require('multer');
const chatbotController = require('../controllers/chatbotController');
const { authenticateToken } = require('../middlewares/auth');

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

/**
 * Knowledge Base Routes
 */

// Upload document (PDF or URL)
router.post(
  '/knowledge-base/upload',
  authenticateToken,
  upload.single('file'),
  chatbotController.uploadDocument
);

// Get user's documents
router.get(
  '/knowledge-base/documents',
  authenticateToken,
  chatbotController.getDocuments
);

// Delete document
router.delete(
  '/knowledge-base/documents/:id',
  authenticateToken,
  chatbotController.deleteDocument
);

// Get user's workspaces
router.get(
  '/knowledge-base/workspaces',
  authenticateToken,
  chatbotController.getUserWorkspaces
);

// Get documents in a workspace
router.get(
  '/knowledge-base/workspaces/:workspaceId/documents',
  authenticateToken,
  chatbotController.getWorkspaceDocuments
);

// Import document from workspace
router.post(
  '/knowledge-base/import-from-workspace',
  authenticateToken,
  chatbotController.importFromWorkspace
);

/**
 * Chat Routes
 */

// Send chat message
router.post(
  '/chat',
  authenticateToken,
  chatbotController.chat
);

// Get chat history for session
router.get(
  '/chat/history/:sessionId',
  authenticateToken,
  chatbotController.getChatHistory
);

// Get all chat sessions
router.get(
  '/chat/sessions',
  authenticateToken,
  chatbotController.getChatSessions
);

// Delete chat session
router.delete(
  '/chat/sessions/:sessionId',
  authenticateToken,
  chatbotController.deleteSession
);

module.exports = router;