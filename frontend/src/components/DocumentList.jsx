import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import documentService from '../services/documentService';
import { PlusIcon, DocumentTextIcon, TrashIcon, ArrowDownTrayIcon, DocumentIcon } from '@heroicons/react/24/outline';

const DocumentList = () => {
    const { workspaceId } = useParams();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [currentPath, setCurrentPath] = useState(null); // Current folder path

    useEffect(() => {
        fetchDocuments();
    }, [workspaceId]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const data = await documentService.getWorkspaceDocuments(workspaceId);
            setDocuments(Array.isArray(data) ? data : []);
            setLoading(false);
        } catch (err) {
            setError('Failed to load documents');
            setDocuments([]);
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('workspaceId', workspaceId);
            if (currentPath) {
                formData.append('folder', currentPath);
            }

            const newDoc = await documentService.uploadDocument(formData);
            setDocuments([newDoc, ...documents]);
        } catch (err) {
            alert('Failed to upload file');
        } finally {
            setUploading(false);
        }

        e.target.value = '';
    };

    const handleCreateDocument = async () => {
        const title = prompt('Enter document title:');
        if (!title) return;

        try {
            const newDoc = await documentService.createDocument({
                title,
                workspaceId,
                content: '',
                folder: currentPath
            });
            setDocuments([newDoc, ...documents]);
        } catch (err) {
            alert('Failed to create document');
        }
    };

    const handleCreateFolder = async () => {
        const title = prompt('Enter folder name:');
        if (!title) return;

        // Prevent duplicate folder names in current directory
        const exists = documents.find(d =>
            d.fileType === 'folder' &&
            d.title === title &&
            d.folder === currentPath
        );
        if (exists) {
            alert('A folder with this name already exists');
            return;
        }

        try {
            const newFolder = await documentService.createDocument({
                title,
                workspaceId,
                isFolder: true,
                folder: currentPath
            });
            setDocuments([newFolder, ...documents]);
        } catch (err) {
            alert('Failed to create folder');
        }
    };

    const handleDownload = async (doc) => {
        if (doc.fileType === 'folder') return; // Cannot download folders yet

        try {
            if (doc.fileUrl) {
                // Download file from MinIO
                const response = await fetch(doc.fileUrl);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = doc.title;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                // Download text content as file
                const blob = new Blob([doc.content || ''], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${doc.title}.txt`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (err) {
            alert('Failed to download file');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            await documentService.deleteDocument(id);
            setDocuments(documents.filter(doc => doc._id !== id));
        } catch (err) {
            alert('Failed to delete document');
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const getFileIcon = (doc) => {
        if (doc.fileType === 'folder') return 'b'; // We'll use a string and replace with Heroicon in render
        if (doc.isEditable) return '📝';
        if (doc.fileType?.includes('pdf')) return '📄';
        if (doc.fileType?.includes('image')) return '🖼️';
        if (doc.fileType?.includes('video')) return '🎥';
        return '📎';
    };

    // Filter documents by current path
    const filteredDocuments = documents.filter(doc => {
        // Handle null vs undefined vs empty string comparison
        const docFolder = doc.folder || null;
        const current = currentPath || null;
        return docFolder === current;
    });

    // Sort: Folders first, then files
    filteredDocuments.sort((a, b) => {
        if (a.fileType === 'folder' && b.fileType !== 'folder') return -1;
        if (a.fileType !== 'folder' && b.fileType === 'folder') return 1;
        return 0; // Keep original order otherwise (or sort by date)
    });

    // Navigation handlers
    const enterFolder = (folderName) => {
        const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        setCurrentPath(newPath);
    };

    const goUp = () => {
        if (!currentPath) return;
        const parts = currentPath.split('/');
        parts.pop();
        setCurrentPath(parts.length > 0 ? parts.join('/') : null);
    };

    const goToRoot = () => {
        setCurrentPath(null);
    };

    if (loading) return <div className="text-center p-4">Loading documents...</div>;
    if (error) return <div className="text-red-500 p-4">{error}</div>;

    // Breadcrumbs UI
    const renderBreadcrumbs = () => {
        if (!currentPath) return (
            <span className="font-semibold text-gray-700">Root</span>
        );

        const parts = currentPath.split('/');
        return (
            <div className="flex items-center text-sm text-gray-600">
                <button
                    onClick={goToRoot}
                    className="hover:text-blue-600 hover:underline"
                >
                    Root
                </button>
                {parts.map((part, index) => {
                    const path = parts.slice(0, index + 1).join('/');
                    const isLast = index === parts.length - 1;
                    return (
                        <React.Fragment key={path}>
                            <span className="mx-2 text-gray-400">/</span>
                            {isLast ? (
                                <span className="font-semibold text-gray-800">{part}</span>
                            ) : (
                                <button
                                    onClick={() => setCurrentPath(path)}
                                    className="hover:text-blue-600 hover:underline"
                                >
                                    {part}
                                </button>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold flex items-center mb-2">
                        <DocumentTextIcon className="h-6 w-6 mr-2 text-blue-500" />
                        Documents
                    </h2>
                    {/* Breadcrumbs */}
                    <div className="bg-gray-50 px-3 py-1 rounded-md inline-block">
                        {renderBreadcrumbs()}
                    </div>
                </div>

                <div className="flex space-x-2">
                    <button
                        onClick={handleCreateFolder}
                        className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center"
                    >
                        <span className="text-xl mr-1 mb-1">📁</span>
                        New Folder
                    </button>
                    <button
                        onClick={handleCreateDocument}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
                    >
                        <PlusIcon className="h-5 w-5 mr-1" />
                        New Doc
                    </button>
                    <div className="relative">
                        <input
                            type="file"
                            id="document-upload"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                        <label
                            htmlFor="document-upload"
                            className={`bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center cursor-pointer ${uploading ? 'opacity-50' : ''}`}
                        >
                            <PlusIcon className="h-5 w-5 mr-1" />
                            {uploading ? 'Uploading...' : 'Upload'}
                        </label>
                    </div>
                </div>
            </div>

            {filteredDocuments.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-gray-500 mb-2">This folder is empty.</p>
                    <p className="text-sm text-gray-400">Create a folder, document or upload a file.</p>
                </div>
            ) : (
                <ul className="divide-y divide-gray-200">
                    {filteredDocuments.map((doc) => {
                        const isFolder = doc.fileType === 'folder';
                        return (
                            <li key={doc._id} className="py-4 flex justify-between items-center hover:bg-gray-50 px-2 rounded group transition-colors">
                                <div className="flex-1 flex items-center space-x-3 cursor-pointer" onClick={() => isFolder ? enterFolder(doc.title) : null}>
                                    <div className="text-3xl">
                                        {isFolder ? '📁' : getFileIcon(doc)}
                                    </div>
                                    <div className="flex-1">
                                        {isFolder ? (
                                            <button
                                                onClick={() => enterFolder(doc.title)}
                                                className="font-medium text-gray-900 hover:text-blue-600 text-left"
                                            >
                                                {doc.title}
                                            </button>
                                        ) : (
                                            <Link to={`/documents/${doc._id}`} className="font-medium text-blue-600 hover:text-blue-800">
                                                {doc.title}
                                            </Link>
                                        )}
                                        <div className="text-sm text-gray-500">
                                            {isFolder ? 'Folder' : (
                                                <>
                                                    {doc.isEditable ? 'Editable' : 'View only'}
                                                    {doc.fileSize && ` • ${formatFileSize(doc.fileSize)}`}
                                                </>
                                            )}
                                            {' • '}{new Date(doc.updatedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!isFolder && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                                            className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                            title="Download"
                                        >
                                            <ArrowDownTrayIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(doc._id); }}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                        title="Delete"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default DocumentList;
