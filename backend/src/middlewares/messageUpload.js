const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for message attachments (more permissive than avatar)
const fileFilter = (req, file, cb) => {
  console.log('📁 Message file filter - mimetype:', file.mimetype, 'filename:', file.originalname);
  
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
    'application/json', 'application/xml'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    console.log('✅ File type accepted');
    cb(null, true);
  } else {
    console.log('⚠️ File type not in allowed list, but accepting anyway');
    cb(null, true); // Accept all files for now
  }
};

// Create multer instance for message attachments
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Up to 5 files at a time
  }
});

console.log('🔧 Message upload middleware created');

module.exports = upload;
