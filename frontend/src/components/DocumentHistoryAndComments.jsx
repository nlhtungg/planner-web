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
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-white/10">
                <button
                    onClick={() => setActiveTab('comments')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center space-x-2 transition-all ${activeTab === 'comments' ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-500/10' : 'text-secondary hover:bg-white/5'
                        }`}
                >
                    <ChatBubbleLeftIcon className="w-4 h-4" />
                    <span>Comments</span>
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center space-x-2 transition-all ${activeTab === 'history' ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-500/10' : 'text-secondary hover:bg-white/5'
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
                            <p className="text-secondary text-sm text-center mt-4">No comments yet</p>
                        ) : (
                            document.comments?.map((comment, idx) => (
                                <div key={idx} className="bg-white/20 dark:bg-slate-900/20 p-3 rounded-lg text-sm border border-white/10">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold text-primary">{comment.author?.firstName}</span>
                                        <span className="text-xs text-secondary">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-primary">{comment.content}</p>
                                </div>
                            ))
                        )}

                        <form onSubmit={handleAddComment} className="mt-4">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write a comment..."
                                className="input-field text-sm"
                                rows="3"
                            />
                            <button
                                type="submit"
                                className="mt-2 w-full btn-primary text-sm"
                            >
                                Post Comment
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4">
                        {document.versions?.length === 0 ? (
                            <p className="text-secondary text-sm text-center mt-4">No version history</p>
                        ) : (
                            document.versions?.map((version, idx) => (
                                <div key={idx} className="flex items-start justify-between group p-3 rounded-lg hover:bg-white/10 transition-all">
                                    <div>
                                        <p className="text-sm font-medium text-primary">Version {document.versions.length - idx}</p>
                                        <p className="text-xs text-secondary">
                                            {new Date(version.timestamp).toLocaleString()} by {version.author?.firstName}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => onRestoreVersion(version)}
                                        className="text-xs text-blue-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
