import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import documentService from '../services/documentService';
import io from 'socket.io-client';
import DocumentHistoryAndComments from '../components/DocumentHistoryAndComments';
import UserFuzzySelect from '../components/UserFuzzySelect';
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

    if (!document) return <div className="p-8">Loading editor...</div>;

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Toolbar */}
            <div className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">{document.title}</h1>
                    <p className="text-sm text-gray-500">
                        {saving ? 'Saving...' : 'All changes saved'}
                    </p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setShowShareModal(true)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center space-x-2"
                    >
                        <ShareIcon className="h-4 w-4" />
                        <span>Share</span>
                    </button>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                        Save
                    </button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Editor/Preview Area */}
                <div className="flex-1 p-8 overflow-y-auto">
                    <div className="max-w-4xl mx-auto h-full">
                        {document.isEditable ? (
                            <textarea
                                value={content}
                                onChange={handleChange}
                                disabled={!canEdit}
                                readOnly={!canEdit}
                                className={`w-full h-full p-8 bg-white shadow-lg rounded-lg border-none focus:ring-0 resize-none font-mono text-lg leading-relaxed ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                placeholder={canEdit ? "Start typing..." : "You don't have permission to edit this document"}
                            />
                        ) : (
                            <div className="bg-white shadow-lg rounded-lg p-8 h-full">
                                {document.fileType?.includes('pdf') ? (
                                    <iframe
                                        src={document.fileUrl}
                                        className="w-full h-full border-0"
                                        title={document.title}
                                    />
                                ) : document.fileType?.includes('image') ? (
                                    <img
                                        src={document.fileUrl}
                                        alt={document.title}
                                        className="max-w-full h-auto mx-auto"
                                    />
                                ) : document.fileType?.includes('video') ? (
                                    <video
                                        src={document.fileUrl}
                                        controls
                                        className="w-full h-auto"
                                    />
                                ) : (
                                    <div className="text-center text-gray-500 py-8">
                                        <p>Preview not available for this file type</p>
                                        <a
                                            href={document.fileUrl}
                                            download={document.title}
                                            className="text-blue-600 hover:underline mt-4 inline-block"
                                        >
                                            Download File
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
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
            </div>

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Share Document</h2>
                            <button onClick={() => setShowShareModal(false)}>
                                <XMarkIcon className="h-6 w-6 text-gray-500 hover:text-gray-700" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Copy Link Section */}
                            <div className="border-b pb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Link Sharing
                                    </label>
                                    <button
                                        onClick={handleTogglePublic}
                                        className={`px-3 py-1 rounded text-sm ${document.isPublic
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-700'
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
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                                        />
                                        <button
                                            onClick={handleCopyLink}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                    {document.isPublic
                                        ? 'Anyone with the link can view this document'
                                        : 'Only people you share with can access'}
                                </p>
                            </div>

                            {/* Share with Specific Users */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Share with Specific Users (View Only)
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    Only workspace members can edit. Shared users can view and download.
                                </p>
                                <UserFuzzySelect
                                    onSelect={handleShare}
                                    placeholder="Search users..."
                                />
                            </div>

                            {/* Currently Shared With */}
                            {document.sharedWith && document.sharedWith.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">Shared With</h3>
                                    <div className="space-y-2">
                                        {document.sharedWith.map((share) => (
                                            <div key={share.user._id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                                <div>
                                                    <p className="font-medium">{share.user.firstName} {share.user.lastName}</p>
                                                    <p className="text-sm text-gray-500">{share.permission === 'edit' ? 'Can edit' : 'Can view'}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleUnshare(share.user._id)}
                                                    className="text-red-600 hover:text-red-800 text-sm"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentEditor;
