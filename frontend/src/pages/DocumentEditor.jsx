import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import documentService from '../services/documentService';
import io from 'socket.io-client';
import DocumentHistoryAndComments from '../components/DocumentHistoryAndComments';
import UserFuzzySelect from '../components/UserFuzzySelect';
import GlassPageContainer from '../components/layout/GlassPageContainer';
import GlassHeader from '../components/layout/GlassHeader';
import GlassCard from '../components/layout/GlassCard';
import { ShareIcon, XMarkIcon } from '@heroicons/react/24/outline';

const DocumentEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [document, setDocument] = useState(null);
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [socket, setSocket] = useState(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [sharePermission, setSharePermission] = useState('view');
    const [canEdit, setCanEdit] = useState(false);
    const [docxHtml, setDocxHtml] = useState(null);
    const [docxLoading, setDocxLoading] = useState(false);
    const saveTimeoutRef = useRef(null);

    // Connect to Socket.io
    useEffect(() => {
        const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');
        const newSocket = io(socketUrl, {
            withCredentials: true
        });
        setSocket(newSocket);

        return () => newSocket.close();
    }, []);

    // Load Document
    useEffect(() => {
        const loadDocument = async () => {
            try {
                const doc = await documentService.getDocument(id);
                setDocument(doc);
                setContent(doc.content || '');

                // Check if user can edit - ONLY workspace members can edit
                const currentUser = JSON.parse(localStorage.getItem('user'));
                const userId = currentUser?.id || currentUser?._id;

                // Fetch workspace to check membership
                const workspaceService = (await import('../services/workspaceService')).default;
                try {
                    const workspaceResponse = await workspaceService.getWorkspace(doc.workspace);
                    const workspace = workspaceResponse.data;

                    // Check if user is workspace member or owner
                    const isOwner = workspace.owner._id === userId || workspace.owner === userId;
                    const isMember = workspace.members?.some(
                        m => (m.user._id === userId || m.user === userId)
                    );

                    // Only workspace members can edit
                    setCanEdit(doc.isEditable && (isOwner || isMember));
                } catch (workspaceErr) {
                    // If can't access workspace, user is not a member
                    setCanEdit(false);
                }
            } catch (err) {
                alert('Failed to load document');
                navigate(-1);
            }
        };
        loadDocument();
    }, [id, navigate]);

    // Load comments
    useEffect(() => {
        const loadComments = async () => {
            if (!document) return;
            try {
                const comments = await documentService.getComments(id);
                setDocument(prev => ({ ...prev, comments }));
            } catch (err) {
                console.error('Failed to load comments:', err);
            }
        };
        loadComments();
    }, [document?._id, id]);

    // Load DOCX preview using mammoth.js
    useEffect(() => {
        const loadDocxPreview = async () => {
            if (!document?.fileUrl) return;

            // Check if it's a DOCX file
            const isDocx = document.fileType?.includes('wordprocessingml') ||
                document.fileType?.includes('msword') ||
                document.title?.toLowerCase().endsWith('.docx') ||
                document.title?.toLowerCase().endsWith('.doc');

            if (!isDocx) return;

            setDocxLoading(true);
            try {
                // Dynamic import mammoth
                const mammoth = (await import('mammoth')).default;

                // Fetch the DOCX file
                const response = await fetch(document.fileUrl);
                const arrayBuffer = await response.arrayBuffer();

                // Convert to HTML
                const result = await mammoth.convertToHtml({ arrayBuffer });
                setDocxHtml(result.value);
            } catch (err) {
                console.error('Failed to load DOCX preview:', err);
                setDocxHtml(null);
            } finally {
                setDocxLoading(false);
            }
        };

        loadDocxPreview();
    }, [document?.fileUrl, document?.fileType, document?.title]);

    // Join Room & Handle Real-time updates
    useEffect(() => {
        if (!socket || !document) return;

        socket.emit('join-document', id);

        socket.on('receive-changes', (delta) => {
            setContent(delta);
        });

        socket.on('comment-added', (comment) => {
            setDocument(prev => ({
                ...prev,
                comments: [comment, ...(prev.comments || [])]
            }));
        });

        socket.on('version-added', (version) => {
            setDocument(prev => ({
                ...prev,
                versions: [...(prev.versions || []), version]
            }));
        });

        return () => {
            socket.emit('leave-document', id);
            socket.off('receive-changes');
            socket.off('comment-added');
            socket.off('version-added');
        };
    }, [socket, document, id]);

    // Auto-save effect (without creating versions)
    useEffect(() => {
        if (!document) return;

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout to save after 2 seconds of inactivity
        saveTimeoutRef.current = setTimeout(async () => {
            if (content !== document.content) {
                setSaving(true);
                try {
                    // Auto-save WITHOUT creating a version
                    await documentService.updateDocument(id, { content, saveVersion: false });
                    setSaving(false);
                } catch (err) {
                    console.error('Auto-save failed:', err);
                    setSaving(false);
                }
            }
        }, 2000);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [content, document, id]);

    const handleChange = (e) => {
        const newContent = e.target.value;
        setContent(newContent);
        if (socket) {
            socket.emit('send-changes', newContent, id);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Manual save CREATES a version
            const updatedDoc = await documentService.updateDocument(id, { content, saveVersion: true });
            setDocument(updatedDoc);
            // Broadcast new version to other users
            if (socket && updatedDoc.versions && updatedDoc.versions.length > 0) {
                const latestVersion = updatedDoc.versions[updatedDoc.versions.length - 1];
                socket.emit('new-version', latestVersion, id);
            }
            setSaving(false);
        } catch (err) {
            alert('Failed to save');
            setSaving(false);
        }
    };

    const handleShare = async (userId) => {
        try {
            const updatedDoc = await documentService.shareDocument(id, userId, sharePermission);
            setDocument(updatedDoc);
            setShowShareModal(false);
        } catch (err) {
            alert('Failed to share document');
        }
    };

    const handleUnshare = async (userId) => {
        try {
            const updatedDoc = await documentService.unshareDocument(id, userId);
            setDocument(updatedDoc);
        } catch (err) {
            alert('Failed to unshare document');
        }
    };

    const handleTogglePublic = async () => {
        try {
            const response = await documentService.togglePublic(id);
            setDocument(response.document);
        } catch (err) {
            alert('Failed to toggle public access');
        }
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/documents/${id}`;
        navigator.clipboard.writeText(link);
        alert('Link copied to clipboard!');
    };

    if (!document) return (
        <GlassPageContainer>
            <GlassHeader />
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        </GlassPageContainer>
    );

    return (
        <GlassPageContainer>
            <GlassHeader />
            
            {/* Document Toolbar */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="max-w-[1920px] mx-auto w-full px-6 py-4">
                    <GlassCard className="mb-6" padding="p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-primary">{document.title}</h1>
                                <p className="text-sm text-secondary mt-1">
                                    {saving ? 'Saving...' : 'All changes saved'}
                                </p>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowShareModal(true)}
                                    className="btn-secondary flex items-center space-x-2"
                                >
                                    <ShareIcon className="h-4 w-4" />
                                    <span>Share</span>
                                </button>
                                <button
                                    onClick={() => navigate(-1)}
                                    className="btn-secondary"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="btn-primary"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Main Layout */}
                <div className="flex-1 flex overflow-hidden px-6 pb-6">
                    <div className="max-w-[1920px] mx-auto w-full flex gap-6">
                        {/* Editor/Preview Area */}
                        <GlassCard className="flex-1 overflow-hidden flex flex-col" padding="p-0">
                            <div className="flex-1 overflow-y-auto p-8">
                                {document.isEditable ? (
                                    <textarea
                                        value={content}
                                        onChange={handleChange}
                                        disabled={!canEdit}
                                        readOnly={!canEdit}
                                        className={`w-full h-full p-8 rounded-2xl bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border border-white/20 focus:ring-2 focus:ring-blue-500/50 resize-none font-mono text-lg leading-relaxed text-primary placeholder-secondary/50 ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        placeholder={canEdit ? "Start typing..." : "You don't have permission to edit this document"}
                                    />
                                ) : (
                                    <div className="rounded-2xl backdrop-blur-xl p-8 h-full flex flex-col">
                                    {/* PDF Preview */}
                                    {document.fileType?.includes('pdf') ? (
                                        <iframe
                                            src={document.fileUrl}
                                            className="w-full flex-1 border-0 min-h-[600px] rounded-lg"
                                        title={document.title}
                                    />
                                ) : document.fileType?.includes('image') ? (
                                    /* Image Preview */
                                    <div className="flex-1 flex items-center justify-center">
                                        <img
                                            src={document.fileUrl}
                                            alt={document.title}
                                            className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-lg"
                                        />
                                    </div>
                                ) : document.fileType?.includes('video') ? (
                                    /* Video Preview */
                                    <div className="flex-1 flex items-center justify-center">
                                        <video
                                            src={document.fileUrl}
                                            controls
                                            className="max-w-full max-h-[70vh] rounded-2xl shadow-lg"
                                        />
                                    </div>
                                ) : (document.fileType?.includes('wordprocessingml') || document.fileType?.includes('msword')) ? (
                                    /* DOCX Preview using mammoth.js */
                                    <div className="flex-1 overflow-auto">
                                        {docxLoading ? (
                                            <div className="flex items-center justify-center h-full">
                                                <div className="text-center space-y-4">
                                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                                                    <p className="text-secondary">Loading document preview...</p>
                                                </div>
                                            </div>
                                        ) : docxHtml ? (
                                            <div className="bg-white/20 dark:bg-slate-900/20 p-8 rounded-2xl">
                                                <div
                                                    className="prose prose-lg prose-slate max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: docxHtml }}
                                                />
                                                <div className="mt-8 pt-4 border-t border-white/10 flex justify-center">
                                                    <a
                                                        href={document.fileUrl}
                                                        download={document.title}
                                                        className="btn-primary flex items-center space-x-2"
                                                    >
                                                        <span>⬇️</span>
                                                        <span>Download Original</span>
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full space-y-4">
                                                <div className="text-6xl">📄</div>
                                                <p className="text-secondary">Unable to preview document</p>
                                                <a
                                                    href={document.fileUrl}
                                                    download={document.title}
                                                    className="btn-primary"
                                                >
                                                    Download File
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ) : document.fileType?.includes('audio') ? (
                                    /* Audio Preview */
                                    <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                                        <div className="text-8xl">🎵</div>
                                        <h3 className="text-xl font-semibold text-primary">{document.title}</h3>
                                        <audio
                                            src={document.fileUrl}
                                            controls
                                            className="w-full max-w-md"
                                        />
                                        <a
                                            href={document.fileUrl}
                                            download={document.title}
                                            className="btn-primary flex items-center space-x-2"
                                        >
                                            <span>⬇️</span>
                                            <span>Download Audio</span>
                                        </a>
                                    </div>
                                ) : (
                                    /* Office Documents, Archives, and Other Files */
                                    <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-8">
                                        {/* File Icon */}
                                        <div className="text-8xl">
                                            {document.fileCategory === 'document' || document.fileType?.includes('wordprocessingml') || document.fileType?.includes('msword') ? '📄' :
                                                document.fileCategory === 'spreadsheet' || document.fileType?.includes('spreadsheetml') || document.fileType?.includes('ms-excel') ? '📊' :
                                                    document.fileCategory === 'presentation' || document.fileType?.includes('presentationml') || document.fileType?.includes('ms-powerpoint') ? '📙' :
                                                        document.fileCategory === 'archive' || document.fileType?.includes('zip') || document.fileType?.includes('rar') ? '📦' :
                                                            document.fileCategory === 'code' ? '💻' : '📎'}
                                        </div>

                                        {/* File Info */}
                                        <div className="text-center space-y-2">
                                            <h3 className="text-2xl font-bold text-primary">{document.title}</h3>
                                            <div className="text-secondary space-y-1">\n                                                {document.fileType && (
                                                    <p className="text-sm">
                                                        Type: <span className="font-medium">{
                                                            document.fileType.includes('wordprocessingml') || document.fileType.includes('msword') ? 'Microsoft Word Document' :
                                                                document.fileType.includes('spreadsheetml') || document.fileType.includes('ms-excel') ? 'Microsoft Excel Spreadsheet' :
                                                                    document.fileType.includes('presentationml') || document.fileType.includes('ms-powerpoint') ? 'Microsoft PowerPoint Presentation' :
                                                                        document.fileType.includes('zip') ? 'ZIP Archive' :
                                                                            document.fileType.includes('rar') ? 'RAR Archive' :
                                                                                document.fileType.includes('7z') ? '7-Zip Archive' :
                                                                                    document.fileCategory === 'document' ? 'Document' :
                                                                                        document.fileCategory === 'spreadsheet' ? 'Spreadsheet' :
                                                                                            document.fileCategory === 'presentation' ? 'Presentation' :
                                                                                                document.fileCategory || document.fileType
                                                        }</span>
                                                    </p>
                                                )}
                                                {document.fileSize && (
                                                    <p className="text-sm">
                                                        Size: <span className="font-medium">
                                                            {document.fileSize < 1024 ? `${document.fileSize} B` :
                                                                document.fileSize < 1024 * 1024 ? `${(document.fileSize / 1024).toFixed(1)} KB` :
                                                                    `${(document.fileSize / 1024 / 1024).toFixed(2)} MB`}
                                                        </span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Info Message */}
                                        <p className="text-secondary text-sm max-w-md text-center">
                                            Preview is not available for this file type in the browser.
                                            Please download the file to view its contents.
                                        </p>

                                        {/* Download Button */}
                                        <a
                                            href={document.fileUrl}
                                            download={document.title}
                                            className="btn-primary text-lg shadow-lg hover:shadow-xl flex items-center space-x-3"
                                        >
                                            <span className="text-2xl">⬇️</span>
                                            <span>Download File</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                        </GlassCard>

                        {/* Sidebar: History and Comments */}
                        <GlassCard className="w-96 flex-shrink-0 overflow-hidden flex flex-col" padding="p-0">
                            <DocumentHistoryAndComments
                    document={document}
                    onRestoreVersion={(version) => {
                        if (window.confirm('Restore this version? current changes will be lost.')) {
                            setContent(version.content);
                            socket.emit('send-changes', version.content, id);
                        }
                    }}
                    onAddComment={async (commentText) => {
                        try {
                            const newComment = await documentService.addComment(id, commentText);
                            setDocument(prev => ({
                                ...prev,
                                comments: [newComment, ...(prev.comments || [])]
                            }));
                            // Broadcast to other users
                            if (socket) {
                                socket.emit('new-comment', newComment, id);
                            }
                        } catch (err) {
                            alert('Failed to add comment');
                            }
                        }}
                    />
                </GlassCard>
                    </div>
                </div>
            </div>

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <GlassCard className="w-full max-w-md">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-primary">Share Document</h2>
                            <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-all">
                                <XMarkIcon className="h-6 w-6 text-secondary" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Copy Link Section */}
                            <div className="border-b border-white/10 pb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-primary">
                                        Link Sharing
                                    </label>
                                    <button
                                        onClick={handleTogglePublic}
                                        className={`px-3 py-1 rounded-lg text-sm transition-all ${document.isPublic
                                            ? 'glass-pill bg-green-500/20 text-green-400 border border-green-500/30'
                                            : 'glass-pill hover:bg-white/10 text-secondary'
                                            }`}
                                    >
                                        {document.isPublic ? 'Public' : 'Private'}
                                    </button>
                                </div>
                                {document.isPublic && (
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="text"
                                            value={`${window.location.origin}/documents/${id}`}
                                            readOnly
                                            className="input-field flex-1 text-sm"
                                        />
                                        <button
                                            onClick={handleCopyLink}
                                            className="btn-primary text-sm"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                )}
                                <p className="text-xs text-secondary mt-2">
                                    {document.isPublic
                                        ? 'Anyone with the link can view this document'
                                        : 'Only people you share with can access'}
                                </p>
                            </div>

                            {/* Share with Specific Users */}
                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Share with Specific Users (View Only)
                                </label>
                                <p className="text-xs text-secondary mb-2">
                                    Only workspace members can edit. Shared users can view and download.
                                </p>
                                <UserFuzzySelect
                                    onSelect={handleShare}
                                    placeholder="Search users..."
                                />
                            </div>

                            {/* Currently Shared With */}
                            {document.sharedWith && document.sharedWith.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-primary mb-2">Shared With</h3>
                                    <div className="space-y-2">
                                        {document.sharedWith.map((share) => (
                                            <div key={share.user._id} className="flex justify-between items-center p-3 glass-pill hover:bg-white/10 rounded-lg transition-all">
                                                <div>
                                                    <p className="font-medium text-primary">{share.user.firstName} {share.user.lastName}</p>
                                                    <p className="text-sm text-secondary">{share.permission === 'edit' ? 'Can edit' : 'Can view'}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleUnshare(share.user._id)}
                                                    className="text-red-500 hover:text-red-400 text-sm font-medium transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>
            )}
        </GlassPageContainer>
    );
};

export default DocumentEditor;
