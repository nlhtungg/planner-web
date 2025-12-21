import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import documentService from '../services/documentService';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import {
    Plus,
    FileText,
    Trash2,
    Download,
    FolderPlus,
    Upload,
    Folder,
    ChevronRight
} from 'lucide-react';

const DocumentList = () => {
    const { workspaceId } = useParams();
    const toast = useToast();
    const { isDark } = useTheme();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [currentPath, setCurrentPath] = useState(null);

    // Theme classes
    const textClass = isDark ? 'text-white' : 'text-slate-800';
    const textSecondaryClass = isDark ? 'text-slate-300/70' : 'text-slate-500';
    const borderClass = isDark ? 'border-white/10' : 'border-slate-200';
    const hoverBgClass = isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50';
    const glassCardClass = isDark
        ? 'bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-[0_18px_55px_rgba(0,0,0,0.55)]'
        : 'bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl';

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
            toast.success('File uploaded successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to upload file');
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
            toast.success('Document created successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create document');
        }
    };

    const handleCreateFolder = async () => {
        const title = prompt('Enter folder name:');
        if (!title) return;

        const exists = documents.find(d =>
            d.fileType === 'folder' &&
            d.title === title &&
            d.folder === currentPath
        );
        if (exists) {
            toast.warning('A folder with this name already exists');
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
            toast.success('Folder created successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create folder');
        }
    };

    const handleDownload = async (doc) => {
        if (doc.fileType === 'folder') {
            await handleDownloadFolder(doc);
            return;
        }

        try {
            if (doc.fileUrl) {
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
                toast.success('File downloaded successfully!');
            } else {
                const blob = new Blob([doc.content || ''], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${doc.title}.txt`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success('File downloaded successfully!');
            }
        } catch (err) {
            toast.error('Failed to download file');
        }
    };

    const handleDownloadFolder = async (folder) => {
        try {
            toast.info('Preparing folder download...');
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            const folderPath = currentPath ? `${currentPath}/${folder.title}` : folder.title;
            const folderDocs = documents.filter(doc =>
                doc.folder && doc.folder.startsWith(folderPath)
            );

            for (const doc of folderDocs) {
                if (doc.fileType !== 'folder') {
                    const relativePath = doc.folder.replace(folderPath + '/', '') || '';
                    const fileName = relativePath ? `${relativePath}/${doc.title}` : doc.title;

                    if (doc.fileUrl) {
                        const response = await fetch(doc.fileUrl);
                        const blob = await response.blob();
                        zip.file(fileName, blob);
                    } else if (doc.content) {
                        zip.file(fileName, doc.content);
                    }
                }
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const url = window.URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${folder.title}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Folder downloaded successfully!');
        } catch (err) {
            console.error('Folder download error:', err);
            toast.error('Failed to download folder.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            await documentService.deleteDocument(id);
            setDocuments(documents.filter(doc => doc._id !== id));
            toast.success('Item deleted successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete item');
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
        if (doc.fileType === 'folder') return '📁';
        if (doc.isEditable && !doc.fileUrl) return '📝';

        const type = doc.fileType || '';
        const category = doc.fileCategory;

        if (category) {
            const categoryIcons = {
                document: '📄',
                spreadsheet: '📊',
                presentation: '📙',
                text: '📝',
                image: '🖼️',
                video: '🎥',
                audio: '🎵',
                archive: '📦',
                code: '💻',
                other: '📎'
            };
            return categoryIcons[category] || '📎';
        }

        if (type.includes('wordprocessingml') || type.includes('msword')) return '📄';
        if (type.includes('spreadsheetml') || type.includes('ms-excel')) return '📊';
        if (type.includes('presentationml') || type.includes('ms-powerpoint')) return '📙';
        if (type.includes('pdf')) return '📄';
        if (type.includes('image')) return '🖼️';
        if (type.includes('video')) return '🎥';
        if (type.includes('audio')) return '🎵';
        if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return '📦';
        if (type.includes('javascript') || type.includes('json') || type.includes('html')) return '💻';
        if (type.includes('text')) return '📝';

        return '📎';
    };

    const getFileTypeLabel = (doc) => {
        if (doc.isEditable && !doc.fileUrl) return 'Document';
        const type = doc.fileType || '';
        const category = doc.fileCategory;

        if (type.includes('wordprocessingml') || type.includes('msword') || category === 'document') return 'Word Document';
        if (type.includes('spreadsheetml') || type.includes('ms-excel') || category === 'spreadsheet') return 'Spreadsheet';
        if (type.includes('presentationml') || type.includes('ms-powerpoint') || category === 'presentation') return 'Presentation';
        if (type.includes('pdf')) return 'PDF';
        if (type.includes('image') || category === 'image') return 'Image';
        if (type.includes('video') || category === 'video') return 'Video';
        if (type.includes('audio') || category === 'audio') return 'Audio';
        if (type.includes('zip') || type.includes('rar') || category === 'archive') return 'Archive';
        if (category === 'code') return 'Code';
        if (category === 'text') return 'Text File';

        return 'File';
    };

    const filteredDocuments = documents.filter(doc => {
        const docFolder = doc.folder || null;
        const current = currentPath || null;
        return docFolder === current;
    });

    filteredDocuments.sort((a, b) => {
        if (a.fileType === 'folder' && b.fileType !== 'folder') return -1;
        if (a.fileType !== 'folder' && b.fileType === 'folder') return 1;
        return 0;
    });

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

    if (loading) {
        return (
            <div className={`rounded-2xl p-8 text-center ${glassCardClass}`}>
                <div className={`animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3 ${isDark ? 'border-blue-400' : 'border-blue-600'}`}></div>
                <p className={textSecondaryClass}>Loading documents...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`rounded-2xl p-8 text-center ${glassCardClass}`}>
                <p className={isDark ? 'text-red-400' : 'text-red-600'}>{error}</p>
            </div>
        );
    }

    const renderBreadcrumbs = () => {
        if (!currentPath) {
            return <span className={`font-semibold ${textClass}`}>Root</span>;
        }

        const parts = currentPath.split('/');
        return (
            <div className={`flex items-center text-sm ${textSecondaryClass}`}>
                <button
                    onClick={goToRoot}
                    className={`${isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'} transition-colors`}
                >
                    Root
                </button>
                {parts.map((part, index) => {
                    const path = parts.slice(0, index + 1).join('/');
                    const isLast = index === parts.length - 1;
                    return (
                        <React.Fragment key={path}>
                            <ChevronRight className="w-4 h-4 mx-1" />
                            {isLast ? (
                                <span className={`font-semibold ${textClass}`}>{part}</span>
                            ) : (
                                <button
                                    onClick={() => setCurrentPath(path)}
                                    className={`${isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'} transition-colors`}
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
        <div className={`rounded-2xl p-6 ${glassCardClass}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className={`text-xl font-bold flex items-center gap-2 mb-2 ${textClass}`}>
                        <FileText className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        Documents
                    </h2>
                    <div className={`px-3 py-1.5 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                        {renderBreadcrumbs()}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleCreateFolder}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium text-sm transition-all ${isDark
                                ? 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 border border-white/10'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                    >
                        <FolderPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">New Folder</span>
                    </button>
                    <button
                        onClick={handleCreateDocument}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium text-sm transition-all ${isDark
                                ? 'bg-green-600/80 hover:bg-green-600 text-white shadow-[0_0_18px_rgba(34,197,94,0.3)]'
                                : 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                            }`}
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">New Doc</span>
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
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium text-sm cursor-pointer transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''
                                } ${isDark
                                    ? 'bg-blue-600/80 hover:bg-blue-600 text-white shadow-[0_0_18px_rgba(59,130,246,0.3)]'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                                }`}
                        >
                            <Upload className="w-4 h-4" />
                            <span className="hidden sm:inline">{uploading ? 'Uploading...' : 'Upload'}</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Document List */}
            {filteredDocuments.length === 0 ? (
                <div className={`text-center py-12 border-2 border-dashed rounded-xl ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <Folder className={`w-12 h-12 mx-auto mb-3 ${textSecondaryClass}`} />
                    <p className={`mb-1 ${textSecondaryClass}`}>This folder is empty.</p>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                        Create a folder, document or upload a file.
                    </p>
                </div>
            ) : (
                <ul className={`divide-y ${isDark ? 'divide-white/10' : 'divide-slate-200'}`}>
                    {filteredDocuments.map((doc) => {
                        const isFolder = doc.fileType === 'folder';
                        return (
                            <li
                                key={doc._id}
                                className={`py-4 flex justify-between items-center px-3 rounded-xl group transition-all ${hoverBgClass}`}
                            >
                                <div
                                    className="flex-1 flex items-center space-x-3 cursor-pointer"
                                    onClick={() => isFolder ? enterFolder(doc.title) : null}
                                >
                                    <div className="text-2xl">
                                        {isFolder ? '📁' : getFileIcon(doc)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {isFolder ? (
                                            <button
                                                onClick={() => enterFolder(doc.title)}
                                                className={`font-medium ${textClass} ${isDark ? 'hover:text-blue-400' : 'hover:text-blue-600'} text-left truncate block`}
                                            >
                                                {doc.title}
                                            </button>
                                        ) : (
                                            <Link
                                                to={`/documents/${doc._id}`}
                                                className={`font-medium ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} truncate block`}
                                            >
                                                {doc.title}
                                            </Link>
                                        )}
                                        <div className={`text-sm ${textSecondaryClass} truncate`}>
                                            {isFolder ? 'Folder' : (
                                                <>
                                                    {getFileTypeLabel(doc)}
                                                    {doc.fileSize && ` • ${formatFileSize(doc.fileSize)}`}
                                                </>
                                            )}
                                            {' • '}{new Date(doc.updatedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                                        className={`p-2 rounded-lg transition-colors ${isDark
                                                ? 'text-slate-400 hover:text-blue-400 hover:bg-white/5'
                                                : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                                            }`}
                                        title={isFolder ? "Download as ZIP" : "Download"}
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(doc._id); }}
                                        className={`p-2 rounded-lg transition-colors ${isDark
                                                ? 'text-slate-400 hover:text-red-400 hover:bg-white/5'
                                                : 'text-slate-400 hover:text-red-600 hover:bg-slate-100'
                                            }`}
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
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
