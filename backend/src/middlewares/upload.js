const multer = require('multer');

// Configure multer for memory storage (we'll upload to MinIO)
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req, file, cb) => {
  console.log('📁 File filter check - mimetype:', file.mimetype, 'originalname:', file.originalname);
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    console.log('✅ File type accepted');
    cb(null, true);
  } else {
    console.log('❌ File type rejected');
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed'), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file at a time
  },
  onError: (err, next) => {
    console.log('❌ Multer error:', err);
    next(err);
  }
});console.log('🔧 Multer instance created with memory storage');

// Wrap the multer middleware to add logging
const uploadSingleWithLogging = (req, res, next) => {
  console.log('🔄 Multer middleware called');
  console.log('📋 Request headers:', {
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length']
  });
  
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      console.log('❌ Multer error:', err);
      return next(err);
    }
    console.log('✅ Multer processing complete');
    console.log('📁 File after multer:', req.file ? 'File received' : 'No file');
    next();
  });
};

module.exports = {
  uploadSingle: uploadSingleWithLogging,
  upload
};