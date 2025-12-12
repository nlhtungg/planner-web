const Document = require('../models/Document');
const Workspace = require('../models/Workspace');
const { uploadFile } = require('../utils/storage');
const { validateFileUpload, getFileCategory, isEditable } = require('../utils/fileTypes');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

exports.createDocument = async (req, res) => {
    try {
        const { title, content, workspaceId, folder, isFolder } = req.body;
        const file = req.file;

        if (!workspaceId) {
            return res.status(400).json({ message: 'Workspace ID is required' });
        }

        const documentData = {
            title: title || (file ? file.originalname : 'Untitled Document'),
            workspace: workspaceId,
            createdBy: req.user._id,
            collaborators: [req.user._id],
            folder: folder || null // Current folder path
        };

        // Handle Folder Creation
        if (isFolder) {
            documentData.fileType = 'folder';
            documentData.isEditable = false;
            // Folders don't have fileUrl or content
        }
        // Handle file upload
        else if (file) {
            // Validate file against whitelist
            const validation = validateFileUpload(file);
            if (!validation.valid) {
                return res.status(400).json({
                    message: 'File upload rejected',
                    error: validation.error
                });
            }

            const fileUrl = await uploadFile(
                file.buffer,
                file.originalname,
                file.mimetype,
                workspaceId,
                folder || null
            );

            documentData.fileUrl = fileUrl;
            documentData.fileType = file.mimetype;
            documentData.fileSize = file.size;
            documentData.fileCategory = getFileCategory(file.mimetype, file.originalname);
            documentData.isEditable = isEditable(file.mimetype, file.originalname);

            // For editable files, extract content before clearing buffer
            if (documentData.isEditable) {
                documentData.content = file.buffer.toString('utf-8');
            }

            // Security: Clear buffer from memory after successful upload
            file.buffer = null;
        } else {
            // Text document
            documentData.content = content || '';
            documentData.isEditable = true;
        }

        const document = await Document.create(documentData);
        const populatedDoc = await Document.findById(document._id)
            .populate('createdBy', 'firstName lastName email avatar')
            .populate('collaborators', 'firstName lastName email avatar');

        res.status(201).json(populatedDoc);
    } catch (error) {
        res.status(500).json({ message: 'Error creating document', error: error.message });
    }
};


exports.getWorkspaceDocuments = async (req, res) => {
    try {
        const { workspaceId } = req.params;

        const documents = await Document.find({ workspace: workspaceId })
            .populate('createdBy', 'firstName lastName email avatar')
            .sort({ updatedAt: -1 });

        res.json(documents);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching documents', error: error.message });
    }
};

exports.getDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id)
            .populate('createdBy', 'firstName lastName email avatar')
            .populate('collaborators', 'firstName lastName email avatar')
            .populate('sharedWith.user', 'firstName lastName email avatar');

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Check if user has access
        const userId = req.user._id.toString();
        const isOwner = document.createdBy._id.toString() === userId;
        const isCollaborator = document.collaborators.some(c => c._id.toString() === userId);
        const isShared = document.sharedWith.some(s => s.user._id.toString() === userId);
        const isPublic = document.isPublic;

        // Check workspace membership
        const Workspace = require('../models/Workspace');
        const workspace = await Workspace.findById(document.workspace);
        const isWorkspaceMember = workspace && workspace.isMember(req.user._id);

        if (!isOwner && !isCollaborator && !isShared && !isPublic && !isWorkspaceMember) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(document);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching document', error: error.message });
    }
};

exports.updateDocument = async (req, res) => {
    try {
        const { title, content, saveVersion } = req.body;
        const document = await Document.findById(req.params.id)
            .populate('sharedWith.user', '_id');

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Check if user has EDIT permission
        const userId = req.user._id.toString();
        const isOwner = document.createdBy.toString() === userId;

        // Check workspace membership
        const Workspace = require('../models/Workspace');
        const workspace = await Workspace.findById(document.workspace);
        const isWorkspaceMember = workspace && workspace.isMember(req.user._id);

        // Check if user has edit permission through sharing
        const hasEditPermission = document.sharedWith.some(
            s => s.user._id.toString() === userId && s.permission === 'edit'
        );

        // Only owner, workspace members, or users with edit permission can edit
        if (!isOwner && !isWorkspaceMember && !hasEditPermission) {
            return res.status(403).json({ message: 'You do not have permission to edit this document' });
        }

        if (title) document.title = title;
        if (content !== undefined) {
            document.content = content;
            // Only create version when explicitly requested (manual save or significant change)
            if (saveVersion) {
                document.versions.push({
                    content,
                    author: req.user._id
                });
            }
        }

        await document.save();
        res.json(document);
    } catch (error) {
        res.status(500).json({ message: 'Error updating document', error: error.message });
    }
};



exports.deleteDocument = async (req, res) => {
    try {
        const document = await Document.findByIdAndDelete(req.params.id);
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting document', error: error.message });
    }
};

// Add comment to document
exports.addComment = async (req, res) => {
    try {
        const { content } = req.body;
        const DocumentComment = require('../models/DocumentComment');

        const comment = new DocumentComment({
            content,
            document: req.params.id,
            author: req.user._id
        });

        await comment.save();
        await comment.populate('author', 'firstName lastName email avatar');

        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ message: 'Error adding comment', error: error.message });
    }
};

// Get comments for document
exports.getComments = async (req, res) => {
    try {
        const DocumentComment = require('../models/DocumentComment');
        const comments = await DocumentComment.find({ document: req.params.id })
            .populate('author', 'firstName lastName email avatar')
            .sort({ createdAt: -1 });

        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching comments', error: error.message });
    }
};

// Share document with user
exports.shareDocument = async (req, res) => {
    try {
        const { userId, permission } = req.body;
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Check if user is owner or has edit permission
        if (document.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only document owner can share' });
        }

        // Check if already shared with this user
        const existingShare = document.sharedWith.find(
            share => share.user.toString() === userId
        );

        if (existingShare) {
            existingShare.permission = permission;
        } else {
            document.sharedWith.push({
                user: userId,
                permission: permission || 'view'
            });
        }

        await document.save();
        await document.populate('sharedWith.user', 'firstName lastName email avatar');

        res.json(document);
    } catch (error) {
        res.status(500).json({ message: 'Error sharing document', error: error.message });
    }
};

// Unshare document
exports.unshareDocument = async (req, res) => {
    try {
        const { userId } = req.body;
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (document.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only document owner can unshare' });
        }

        document.sharedWith = document.sharedWith.filter(
            share => share.user.toString() !== userId
        );

        await document.save();
        res.json(document);
    } catch (error) {
        res.status(500).json({ message: 'Error unsharing document', error: error.message });
    }
};

// Toggle public access (link sharing)
exports.togglePublic = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (document.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only document owner can change public access' });
        }

        document.isPublic = !document.isPublic;
        await document.save();

        res.json({ isPublic: document.isPublic, document });
    } catch (error) {
        res.status(500).json({ message: 'Error toggling public access', error: error.message });
    }
};
