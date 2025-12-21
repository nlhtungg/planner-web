import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import chatbotService from '../services/chatbotService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  DocumentArrowUpIcon,
  LinkIcon,
  TrashIcon,
  PlusIcon,
  SparklesIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const ChatbotModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [uploadType, setUploadType] = useState(null); // 'pdf' or 'url'
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [hasReadyDocuments, setHasReadyDocuments] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
      // Generate new session ID
      setSessionId(`session_${Date.now()}`);
      // Initial greeting
      setMessages([
        {
          role: 'assistant',
          content: 'Xin chào! Tôi là trợ lý AI của bạn. Bạn có thể upload file PDF hoặc URL để tôi học và trả lời câu hỏi về nội dung đó.\n\n📤 Vui lòng upload tài liệu trước khi chat!',
          timestamp: new Date(),
        },
      ]);
      
      // Start polling for document status updates
      startPolling();
    } else {
      // Stop polling when modal closes
      stopPolling();
    }
    
    return () => stopPolling();
  }, [isOpen]);

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
        
        // Check if there are any ready documents
        const readyDocs = docs.filter(doc => doc.status === 'ready');
        setHasReadyDocuments(readyDocs.length > 0);
        
        // Check if any docs just became ready
        const prevDocs = documents;
        docs.forEach(doc => {
          const prevDoc = prevDocs.find(d => d._id === doc._id);
          if (prevDoc && prevDoc.status === 'processing' && doc.status === 'ready') {
            // Document just finished processing
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
    // Poll every 3 seconds to check for status updates
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

    // Add user message
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
        // Add assistant response
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
      
      // Remove from selected documents
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

  const handleNewChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Xin chào! Hãy bắt đầu cuộc trò chuyện mới. Bạn cần hỗ trợ gì? 🚀',
        timestamp: new Date(),
      },
    ]);
    setSessionId(`session_${Date.now()}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <SparklesIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Chatbot Assistant</h2>
              <p className="text-xs text-blue-100">Powered by Google Gemini</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewChat}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="New Chat"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Documents */}
          <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Knowledge Base ({documents.length})
              </h3>

              <button
                onClick={() => setShowUploadMenu(!showUploadMenu)}
                className="w-full mb-3 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <PlusIcon className="w-4 h-4" />
                Add Document
              </button>

              {showUploadMenu && (
                <div className="mb-4 p-3 bg-white rounded-lg shadow-sm border border-gray-200 space-y-2">
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowUploadMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <DocumentArrowUpIcon className="w-4 h-4" />
                    Upload PDF
                  </button>
                  
                  <button
                    onClick={() => setUploadType('url')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Extract from URL
                  </button>

                  {uploadType === 'url' && (
                    <div className="mt-2 space-y-2">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleUrlUpload}
                        disabled={isUploading || !urlInput.trim()}
                        className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploading ? 'Processing...' : 'Extract'}
                      </button>
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
                    className={`p-3 bg-white rounded-lg border transition-colors group ${
                      selectedDocIds.has(doc._id) && doc.status === 'ready'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Checkbox for selection */}
                      {doc.status === 'ready' && (
                        <input
                          type="checkbox"
                          checked={selectedDocIds.has(doc._id)}
                          onChange={() => toggleDocumentSelection(doc._id)}
                          className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate" title={doc.title}>
                          {doc.title}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
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
                      
                      <button
                        onClick={() => handleDeleteDocument(doc._id)}
                        className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {documents.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-4">
                    Chưa có tài liệu. Upload PDF hoặc URL để bắt đầu.
                  </p>
                )}
                
                {documents.length > 0 && documents.filter(d => d.status === 'ready').length === 0 && (
                  <p className="text-xs text-yellow-700 text-center py-2 bg-yellow-50 rounded">
                    ⏳ Đang xử lý tài liệu...
                  </p>
                )}
                
                {selectedDocIds.size > 0 && (
                  <p className="text-xs text-blue-700 text-center py-2 bg-blue-50 rounded font-medium">
                    ✓ Đã chọn {selectedDocIds.size} tài liệu
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
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
              <div className="mx-4 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ℹ️ Vui lòng tick chọn tài liệu bạn muốn sử dụng để chat!
                </p>
              </div>
            )}

            {/* Input Form */}
            <div className="p-4 border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={selectedDocIds.size > 0 ? "Nhập câu hỏi của bạn..." : "Chọn tài liệu để bắt đầu chat..."}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isLoading || selectedDocIds.size === 0}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim() || selectedDocIds.size === 0}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  title={selectedDocIds.size === 0 ? "Chọn tài liệu trước" : "Gửi tin nhắn"}
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotModal;
