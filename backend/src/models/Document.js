const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        default: 'Untitled Document'
    },
    content: {
        type: String,
        default: ''
    },
    // File upload support
    fileUrl: {
        type: String, // MinIO URL for uploaded files
        default: null
    },
    fileType: {
        type: String, // MIME type or extension
        default: null
    },
    fileSize: {
        type: Number, // Size in bytes
        default: null
    },
    fileCategory: {
        type: String, // Category: document, spreadsheet, presentation, image, video, audio, archive, code, text, other
        default: null
    },
    isEditable: {
        type: Boolean,
        default: true // false for PDFs, images, etc.
    },
    isPublic: {
        type: Boolean,
        default: false // true = anyone with link can view
    },
    folder: {
        type: String,
        default: null // Folder path like "Projects/2024" or null for root
    },
    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    collaborators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    sharedWith: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        permission: {
            type: String,
            enum: ['view', 'edit'],
            default: 'view'
        },
        sharedAt: {
            type: Date,
            default: Date.now
        }
    }],
    versions: [{
        content: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Document', documentSchema);
