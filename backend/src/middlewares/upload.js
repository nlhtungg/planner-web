const multer = require('multer');
const logger = require('../utils/logger').child({ module: 'middlewares/upload' });

// Configure multer for memory storage (we'll upload to MinIO)
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req, file, cb) => {
  const requestLogger = req?.log || logger;
  requestLogger.debug({
    mimeType: file.mimetype,
    fileName: file.originalname,
  }, 'Validating avatar upload file type');

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    requestLogger.debug({ mimeType: file.mimetype }, 'Avatar upload file type accepted');
    cb(null, true);
    return;
  }

  requestLogger.warn({ mimeType: file.mimetype }, 'Avatar upload file type rejected');
  cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed'), false);
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only one file at a time
  },
});

logger.debug('Avatar upload middleware initialized');

// Wrap the multer middleware to add logging
const uploadSingleWithLogging = (req, res, next) => {
  const requestLogger = req?.log || logger;
  requestLogger.debug({
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
  }, 'Avatar upload middleware invoked');

  upload.single('avatar')(req, res, (err) => {
    if (err) {
      requestLogger.error({ err }, 'Avatar upload failed in multer middleware');
      return next(err);
    }

    requestLogger.debug({
      hasFile: Boolean(req.file),
      fileName: req.file?.originalname,
    }, 'Avatar upload middleware completed');
    next();
  });
};

module.exports = {
  uploadSingle: uploadSingleWithLogging,
  upload,
};
