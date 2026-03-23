const multer = require('multer');
const logger = require('../utils/logger').child({ module: 'middlewares/messageUpload' });

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for message attachments (more permissive than avatar)
const fileFilter = (req, file, cb) => {
  const requestLogger = req?.log || logger;
  requestLogger.debug({
    mimeType: file.mimetype,
    fileName: file.originalname,
  }, 'Validating message attachment file type');

  // Allow images, documents, archives, etc.
  const allowedTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    'text/plain', 'text/csv',
    // Archives
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
    // Others
    'application/json', 'application/xml',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    requestLogger.debug({ mimeType: file.mimetype }, 'Message attachment file type accepted');
    cb(null, true);
    return;
  }

  requestLogger.warn({ mimeType: file.mimetype }, 'Message attachment file type accepted outside allow list');
  cb(null, true); // Accept all files for now
};

// Create multer instance for message attachments
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Up to 5 files at a time
  },
});

logger.debug('Message upload middleware initialized');

module.exports = upload;
