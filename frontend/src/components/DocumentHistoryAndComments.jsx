import React, { useState } from 'react';
import { ClockIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

const DocumentHistoryAndComments = ({ document, onRestoreVersion, onAddComment }) => {
    const [activeTab, setActiveTab] = useState('comments');
    const [newComment, setNewComment] = useState('');

    const handleAddComment = (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        onAddComment(newComment);
        setNewComment('');
    };

    return (
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('comments')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center space-x-2 ${activeTab === 'comments' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <ChatBubbleLeftIcon className="w-4 h-4" />
                    <span>Comments</span>
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center space-x-2 ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <ClockIcon className="w-4 h-4" />
                    <span>History</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'comments' && (
                    <div className="space-y-4">
                        {document.comments?.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center mt-4">No comments yet</p>
                        ) : (
                            document.comments?.map((comment, idx) => (
                                <div key={idx} className="bg-gray-50 p-3 rounded-lg text-sm">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-gray-900">{comment.author?.firstName}</span>
                                        <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-gray-700">{comment.content}</p>
                                </div>
                            ))
                        )}

                        <form onSubmit={handleAddComment} className="mt-4">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write a comment..."
                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                rows="3"
                            />
                            <button
                                type="submit"
                                className="mt-2 w-full bg-blue-600 text-white text-sm py-2 rounded hover:bg-blue-700"
                            >
                                Post Comment
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4">
                        {document.versions?.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center mt-4">No version history</p>
                        ) : (
                            document.versions?.map((version, idx) => (
                                <div key={idx} className="flex items-start justify-between group">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Version {document.versions.length - idx}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(version.timestamp).toLocaleString()} by {version.author?.firstName}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => onRestoreVersion(version)}
                                        className="text-xs text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Restore
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentHistoryAndComments;
