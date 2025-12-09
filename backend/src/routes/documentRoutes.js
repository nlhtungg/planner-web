const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middlewares/auth');
const {
    createDocument,
    getWorkspaceDocuments,
    getDocument,
    updateDocument,
    deleteDocument,
    addComment,
    getComments,
    shareDocument,
    unshareDocument,
    togglePublic
} = require('../controllers/documentController');

const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken); // All routes require authentication

router.post('/', upload.single('file'), createDocument);
router.get('/workspace/:workspaceId', getWorkspaceDocuments);
router.get('/:id', getDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

// Comment routes
router.post('/:id/comments', addComment);
router.get('/:id/comments', getComments);

// Sharing routes
router.post('/:id/share', shareDocument);
router.post('/:id/unshare', unshareDocument);
router.post('/:id/toggle-public', togglePublic);

module.exports = router;
