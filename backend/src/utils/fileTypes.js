/**
 * File Types Utility
 * Provides whitelist-based file validation and categorization for secure file uploads.
 */

// ============================================================================
// WHITELIST CONFIGURATION - Only these file types are allowed
// ============================================================================

const ALLOWED_FILE_TYPES = {
    // Documents
    'application/pdf': { category: 'document', extensions: ['.pdf'], previewable: true },
    'application/msword': { category: 'document', extensions: ['.doc'], previewable: false },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        category: 'document', extensions: ['.docx'], previewable: false
    },
    'application/vnd.ms-excel': { category: 'spreadsheet', extensions: ['.xls'], previewable: false },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        category: 'spreadsheet', extensions: ['.xlsx'], previewable: false
    },
    'application/vnd.ms-powerpoint': { category: 'presentation', extensions: ['.ppt'], previewable: false },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
        category: 'presentation', extensions: ['.pptx'], previewable: false
    },

    // Text files (editable)
    'text/plain': { category: 'text', extensions: ['.txt'], previewable: true, editable: true },
    'text/markdown': { category: 'text', extensions: ['.md'], previewable: true, editable: true },
    'text/csv': { category: 'spreadsheet', extensions: ['.csv'], previewable: true, editable: true },

    // Images
    'image/jpeg': { category: 'image', extensions: ['.jpg', '.jpeg'], previewable: true },
    'image/png': { category: 'image', extensions: ['.png'], previewable: true },
    'image/gif': { category: 'image', extensions: ['.gif'], previewable: true },
    'image/webp': { category: 'image', extensions: ['.webp'], previewable: true },

    // Video
    'video/mp4': { category: 'video', extensions: ['.mp4'], previewable: true },
    'video/webm': { category: 'video', extensions: ['.webm'], previewable: true },

    // Audio
    'audio/mpeg': { category: 'audio', extensions: ['.mp3'], previewable: true },

    // Archives (common only)
    'application/zip': { category: 'archive', extensions: ['.zip'], previewable: false },
};

// Build extension to MIME type lookup for quick validation
const EXTENSION_TO_MIME = {};
Object.entries(ALLOWED_FILE_TYPES).forEach(([mimeType, config]) => {
    config.extensions.forEach(ext => {
        if (!EXTENSION_TO_MIME[ext]) {
            EXTENSION_TO_MIME[ext] = [];
        }
        EXTENSION_TO_MIME[ext].push(mimeType);
    });
});

// Maximum file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Get file extension from filename (lowercase, with dot)
 */
const getFileExtension = (filename) => {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.slice(lastDot).toLowerCase();
};

/**
 * Validate a file upload
 * @param {Object} file - Multer file object with originalname, mimetype, size
 * @returns {Object} { valid: boolean, error?: string }
 */
const validateFileUpload = (file) => {
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File size exceeds maximum allowed (${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)`
        };
    }

    // Get and validate extension
    const extension = getFileExtension(file.originalname);
    if (!extension) {
        return { valid: false, error: 'File must have an extension' };
    }

    // Check if extension is whitelisted
    const allowedMimeTypes = EXTENSION_TO_MIME[extension];
    if (!allowedMimeTypes) {
        return {
            valid: false,
            error: `File type "${extension}" is not allowed. Allowed types: documents, images, videos, audio, and archives.`
        };
    }

    // Check if MIME type matches expected for this extension
    // Be lenient: some systems report different MIME types
    const mimeIsAllowed = ALLOWED_FILE_TYPES[file.mimetype] ||
        allowedMimeTypes.includes(file.mimetype) ||
        // Allow generic binary for Office docs (some systems report this)
        (file.mimetype === 'application/octet-stream' &&
            ['.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt', '.zip', '.rar', '.7z'].includes(extension));

    if (!mimeIsAllowed) {
        return {
            valid: false,
            error: `File MIME type "${file.mimetype}" does not match expected type for "${extension}"`
        };
    }

    return { valid: true };
};

/**
 * Get file category for a given MIME type or extension
 */
const getFileCategory = (mimeType, filename) => {
    // Try MIME type first
    if (ALLOWED_FILE_TYPES[mimeType]) {
        return ALLOWED_FILE_TYPES[mimeType].category;
    }

    // Fall back to extension
    if (filename) {
        const extension = getFileExtension(filename);
        const mimeTypes = EXTENSION_TO_MIME[extension];
        if (mimeTypes && mimeTypes.length > 0 && ALLOWED_FILE_TYPES[mimeTypes[0]]) {
            return ALLOWED_FILE_TYPES[mimeTypes[0]].category;
        }
    }

    return 'other';
};

/**
 * Check if file is previewable in browser
 */
const isPreviewable = (mimeType, filename) => {
    if (ALLOWED_FILE_TYPES[mimeType]) {
        return ALLOWED_FILE_TYPES[mimeType].previewable === true;
    }

    if (filename) {
        const extension = getFileExtension(filename);
        const mimeTypes = EXTENSION_TO_MIME[extension];
        if (mimeTypes && mimeTypes.length > 0 && ALLOWED_FILE_TYPES[mimeTypes[0]]) {
            return ALLOWED_FILE_TYPES[mimeTypes[0]].previewable === true;
        }
    }

    return false;
};

/**
 * Check if file is editable (text-based)
 */
const isEditable = (mimeType, filename) => {
    if (ALLOWED_FILE_TYPES[mimeType]?.editable) {
        return true;
    }

    // Also check by extension for reliability
    if (filename) {
        const extension = getFileExtension(filename);
        return ['.txt', '.md', '.markdown', '.csv', '.json', '.js', '.html', '.css', '.xml', '.yaml', '.yml'].includes(extension);
    }

    return false;
};

/**
 * Get icon emoji for file category
 */
const getFileIcon = (category) => {
    const icons = {
        document: '📄',
        spreadsheet: '📊',
        presentation: '📙',
        text: '📝',
        image: '🖼️',
        video: '🎥',
        audio: '🎵',
        archive: '📦',
        code: '💻',
        folder: '📁',
        other: '📎'
    };
    return icons[category] || icons.other;
};

module.exports = {
    ALLOWED_FILE_TYPES,
    EXTENSION_TO_MIME,
    MAX_FILE_SIZE,
    getFileExtension,
    validateFileUpload,
    getFileCategory,
    isPreviewable,
    isEditable,
    getFileIcon
};
