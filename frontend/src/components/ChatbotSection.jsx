import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import chatbotService from '../services/chatbotService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  PaperAirplaneIcon,
  DocumentArrowUpIcon,
  LinkIcon,
  TrashIcon,
  PlusIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ClockIcon,
  XMarkIcon,
  EyeIcon,
  BriefcaseIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';

const ChatbotSection = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [uploadType, setUploadType] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [hasReadyDocuments, setHasReadyDocuments] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [viewingDocument, setViewingDocument] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [workspaceDocuments, setWorkspaceDocuments] = useState([]);
  const [loadingWorkspaceDocs, setLoadingWorkspaceDocs] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    loadDocuments();
    setSessionId(`session_${Date.now()}`);
    setMessages([
      {
        role: 'assistant',
        content: 'Xin chào! Tôi là trợ lý AI của bạn. Bạn có thể upload file PDF hoặc URL để tôi học và trả lời câu hỏi về nội dung đó.\n\n📤 Vui lòng upload tài liệu trước khi chat!',
        timestamp: new Date(),
      },
    ]);
    startPolling();
    
    return () => stopPolling();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadDocuments = async () => {
    try {
      const response = await chatbotService.getDocuments();
      if (response.success) {
        const docs = response.data;
        setDocuments(docs);
        
        const readyDocs = docs.filter(doc => doc.status === 'ready');
        setHasReadyDocuments(readyDocs.length > 0);
        
        const prevDocs = documents;
        docs.forEach(doc => {
          const prevDoc = prevDocs.find(d => d._id === doc._id);
          if (prevDoc && prevDoc.status === 'processing' && doc.status === 'ready') {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `✅ Tài liệu "${doc.title}" đã xử lý xong! Bạn có thể bắt đầu chat ngay.`,
                timestamp: new Date(),
              },
            ]);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };
  
  const startPolling = () => {
    pollingIntervalRef.current = setInterval(() => {
      loadDocuments();
    }, 3000);
  };
  
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };
  
  const toggleDocumentSelection = (docId) => {
    setSelectedDocIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage, timestamp: new Date() },
    ]);

    setIsLoading(true);

    try {
      const response = await chatbotService.sendMessage({
        message: userMessage,
        sessionId,
        selectedDocumentIds: Array.from(selectedDocIds),
      });

      if (response.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: response.data.response,
            sources: response.data.sources,
            timestamp: new Date(),
          },
        ]);
        setSessionId(response.data.sessionId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Chỉ chấp nhận file PDF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File không được vượt quá 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const response = await chatbotService.uploadDocument(file, 'pdf');
      if (response.success) {
        loadDocuments();
        setShowUploadMenu(false);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `✅ Đã upload file "${file.name}" thành công!\n\n⏳ Đang xử lý nội dung... Vui lòng đợi file chuyển sang trạng thái "Ready" trước khi chat.`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Upload file thất bại. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlUpload = async () => {
    if (!urlInput.trim()) return;

    setIsUploading(true);
    try {
      const response = await chatbotService.uploadUrl(urlInput.trim());
      if (response.success) {
        loadDocuments();
        setShowUploadMenu(false);
        setUploadType(null);
        setUrlInput('');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `✅ Đã trích xuất nội dung từ URL thành công!\n\n⏳ Đang xử lý dữ liệu... Vui lòng đợi file chuyển sang trạng thái "Ready" trước khi chat.`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error uploading URL:', error);
      alert('Trích xuất URL thất bại. Vui lòng kiểm tra lại URL.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Bạn có chắc muốn xóa tài liệu này?')) return;

    try {
      await chatbotService.deleteDocument(docId);
      
      setSelectedDocIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(docId);
        return newSet;
      });
      
      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const loadWorkspaces = async () => {
    try {
      const response = await chatbotService.getUserWorkspaces();
      if (response.success) {
        setWorkspaces(response.data);
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
    }
  };

  const loadWorkspaceDocuments = async (workspaceId) => {
    try {
      setLoadingWorkspaceDocs(true);
      const response = await chatbotService.getWorkspaceDocuments(workspaceId);
      if (response.success) {
        setWorkspaceDocuments(response.data);
      }
    } catch (error) {
      console.error('Error loading workspace documents:', error);
      alert('Không thể tải danh sách file từ workspace');
    } finally {
      setLoadingWorkspaceDocs(false);
    }
  };

  const handleImportFromWorkspace = async (documentId) => {
    try {
      setIsUploading(true);
      const response = await chatbotService.importFromWorkspace(documentId);
      if (response.success) {
        loadDocuments();
        setUploadType(null);
        setSelectedWorkspace(null);
        setWorkspaceDocuments([]);
        setShowUploadMenu(false);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `✅ Đã import file từ workspace thành công!\n\n⏳ Đang xử lý nội dung... Vui lòng đợi file chuyển sang trạng thái "Ready" trước khi chat.`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error importing document:', error);
      alert('Import file thất bại. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (uploadType === 'workspace') {
      loadWorkspaces();
    }
  }, [uploadType]);

  useEffect(() => {
    if (selectedWorkspace) {
      loadWorkspaceDocuments(selectedWorkspace);
    }
  }, [selectedWorkspace]);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50">
      {/* Sidebar - Documents */}
      <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">
              Knowledge Base ({documents.length})
            </h3>
          </div>

          <button
            onClick={() => setShowUploadMenu(!showUploadMenu)}
            className="w-full mb-4 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm"
          >
            <PlusIcon className="w-5 h-5" />
            Add Document
          </button>

          {showUploadMenu && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowUploadMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-white rounded-lg transition-colors border border-gray-200"
              >
                <DocumentArrowUpIcon className="w-5 h-5" />
                <span className="font-medium">Upload PDF</span>
              </button>
              
              <button
                onClick={() => setUploadType('url')}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-white rounded-lg transition-colors border border-gray-200"
              >
                <LinkIcon className="w-5 h-5" />
                <span className="font-medium">Extract from URL</span>
              </button>

              <button
                onClick={() => setUploadType('workspace')}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-white rounded-lg transition-colors border border-gray-200"
              >
                <BriefcaseIcon className="w-5 h-5" />
                <span className="font-medium">Import from Workspace</span>
              </button>

              {uploadType === 'url' && (
                <div className="space-y-2 pt-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleUrlUpload}
                    disabled={isUploading || !urlInput.trim()}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Processing...' : 'Extract'}
                  </button>
                </div>
              )}

              {uploadType === 'workspace' && (
                <div className="space-y-3 pt-2">
                  {/* Workspace Selection */}
                  {!selectedWorkspace ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Chọn Workspace:</p>
                      {workspaces.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">Không có workspace nào</p>
                      ) : (
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {workspaces.map((workspace) => (
                            <button
                              key={workspace._id}
                              onClick={() => setSelectedWorkspace(workspace._id)}
                              className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"
                            >
                              <div 
                                className="w-4 h-4 rounded" 
                                style={{ backgroundColor: workspace.color }}
                              />
                              <span className="font-medium text-sm">{workspace.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">Chọn File:</p>
                        <button
                          onClick={() => {
                            setSelectedWorkspace(null);
                            setWorkspaceDocuments([]);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          ← Đổi workspace
                        </button>
                      </div>
                      
                      {loadingWorkspaceDocs ? (
                        <div className="text-center py-4">
                          <ArrowPathIcon className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                          <p className="text-sm text-gray-500 mt-2">Đang tải...</p>
                        </div>
                      ) : workspaceDocuments.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">Không có file PDF nào</p>
                      ) : (
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {workspaceDocuments.map((doc) => (
                            <button
                              key={doc._id}
                              onClick={() => handleImportFromWorkspace(doc._id)}
                              disabled={isUploading}
                              className="w-full flex items-start gap-2 px-3 py-2 text-left text-gray-700 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200 disabled:opacity-50"
                            >
                              <FolderIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{doc.title}</p>
                                <p className="text-xs text-gray-500">
                                  {doc.fileCategory || 'PDF'} • {(doc.fileSize / 1024).toFixed(0)} KB
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Documents List */}
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc._id}
                className={`p-4 bg-white rounded-xl border transition-colors group ${
                  selectedDocIds.has(doc._id) && doc.status === 'ready'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  {doc.status === 'ready' && (
                    <input
                      type="checkbox"
                      checked={selectedDocIds.has(doc._id)}
                      onChange={() => toggleDocumentSelection(doc._id)}
                      className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate" title={doc.title}>
                      {doc.title}
                    </p>
                    <p className="text-xs text-gray-600 capitalize mt-1">
                      {doc.type} •{' '}
                      {doc.status === 'ready' ? (
                        <span className="text-green-600 font-semibold">✓ Ready</span>
                      ) : doc.status === 'processing' ? (
                        <span className="text-yellow-600 font-semibold">⏳ Processing...</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Failed</span>
                      )}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {doc.type === 'pdf' && doc.fileUrl && (
                      <button
                        onClick={() => setViewingDocument(doc)}
                        className="p-2 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-blue-50"
                        title="View PDF"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteDocument(doc._id)}
                      className="p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-red-50"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {documents.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">
                Chưa có tài liệu. Upload PDF hoặc URL để bắt đầu.
              </p>
            )}
            
            {documents.length > 0 && documents.filter(d => d.status === 'ready').length === 0 && (
              <p className="text-xs text-yellow-700 text-center py-3 bg-yellow-50 rounded-lg font-medium">
                ⏳ Đang xử lý tài liệu...
              </p>
            )}
            
            {selectedDocIds.size > 0 && (
              <p className="text-xs text-blue-700 text-center py-3 bg-blue-50 rounded-lg font-semibold">
                ✓ Đã chọn {selectedDocIds.size} tài liệu
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
                    : message.isError
                    ? 'bg-red-50 text-red-900 border-2 border-red-200'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                {/* Message Content */}
                <div className={`text-sm leading-relaxed prose prose-sm max-w-none ${
                  message.role === 'user' 
                    ? 'prose-invert text-white prose-headings:text-white prose-strong:text-white prose-p:text-white prose-li:text-white' 
                    : 'text-gray-800 prose-headings:text-gray-900 prose-strong:text-gray-900'
                }`}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1 my-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-5 space-y-1 my-2" {...props} />,
                      li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                      p: ({node, ...props}) => <p className="my-2 first:mt-0 last:mb-0" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                      em: ({node, ...props}) => <em className="italic" {...props} />,
                      code: ({node, inline, ...props}) => 
                        inline 
                          ? <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
                          : <code className="block bg-gray-800 text-white p-3 rounded-lg text-xs font-mono overflow-x-auto my-2" {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2 mt-3" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-base font-bold mb-2 mt-3" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-1 mt-2" {...props} />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-1 mb-2">
                      <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-semibold text-gray-700">Nguồn tham khảo:</span>
                    </div>
                    <div className="space-y-1.5">
                      {message.sources.map((source, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-start gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100"
                        >
                          <span className="text-blue-600 font-bold text-xs mt-0.5">•</span>
                          <span className="text-xs text-gray-700 font-medium flex-1">
                            {source.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div className={`flex items-center gap-1 mt-2 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <ClockIcon className="w-3 h-3" />
                  <span className="text-xs">
                    {new Date(message.timestamp).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-5 py-3 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-600">Đang suy nghĩ...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Warning if no document selected */}
        {hasReadyDocuments && selectedDocIds.size === 0 && (
          <div className="mx-6 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              ℹ️ Vui lòng tick chọn tài liệu bạn muốn sử dụng để chat!
            </p>
          </div>
        )}

        {/* Input Form */}
        <div className="p-6 border-t border-gray-200 bg-white">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={selectedDocIds.size > 0 ? "Nhập câu hỏi của bạn..." : "Chọn tài liệu để bắt đầu chat..."}
              className="flex-1 px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isLoading || selectedDocIds.size === 0}
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim() || selectedDocIds.size === 0}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2 font-medium"
              title={selectedDocIds.size === 0 ? "Chọn tài liệu trước" : "Gửi tin nhắn"}
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">{viewingDocument.title}</h3>
              <button
                onClick={() => setViewingDocument(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={viewingDocument.fileUrl}
                className="w-full h-full border-0"
                title={viewingDocument.title}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotSection;
