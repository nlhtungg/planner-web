import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  EyeIcon,
  BriefcaseIcon,
  FolderIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

const ChatbotModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [uploadType, setUploadType] = useState(null); // 'pdf', 'url', or 'workspace'
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [hasReadyDocuments, setHasReadyDocuments] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [workspaceDocuments, setWorkspaceDocuments] = useState([]);
  const [loadingWorkspaceDocs, setLoadingWorkspaceDocs] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [chatSessions, setChatSessions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [chatMode, setChatMode] = useState('documents'); // 'documents' or 'workspace'
  const [selectedWorkspaceForInsight, setSelectedWorkspaceForInsight] = useState(null);
  const [isIndexingWorkspace, setIsIndexingWorkspace] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
      loadChatHistory();
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
  
  const loadChatHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await chatbotService.getChatSessions();
      if (response.success) {
        setChatSessions(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setLoadingHistory(false);
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
      let response;
      
      // Check chat mode
      if (chatMode === 'workspace' && selectedWorkspaceForInsight) {
        // Workspace Insights mode
        response = await chatbotService.chatWorkspaceInsight(
          selectedWorkspaceForInsight._id,
          userMessage,
          sessionId
        );
      } else {
        // Document mode
        response = await chatbotService.sendMessage({
          message: userMessage,
          sessionId,
          selectedDocumentIds: Array.from(selectedDocIds),
        });
      }

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
    setShowHistory(false);
  };
  
  const handleLoadSession = async (session) => {
    try {
      const response = await chatbotService.getChatHistory(session.sessionId);
      if (response.success && response.data) {
        setMessages(response.data.messages || []);
        setSessionId(session.sessionId);
        setShowHistory(false);
        
        // Load selected docs from session
        if (session.selectedDocumentIds && session.selectedDocumentIds.length > 0) {
          setSelectedDocIds(new Set(session.selectedDocumentIds));
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      alert('Không thể tải lịch sử chat');
    }
  };
  
  const handleDeleteSession = async (sessionId) => {
    if (!confirm('Bạn có chắc muốn xóa lịch sử chat này?')) return;
    
    try {
      await chatbotService.deleteSession(sessionId);
      loadChatHistory();
      
      // If currently viewing this session, start new chat
      if (sessionId === sessionId) {
        handleNewChat();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Không thể xóa lịch sử chat');
    }
  };

  const handleSwitchToWorkspaceMode = async () => {
    if (!workspaces || workspaces.length === 0) {
      await loadWorkspaces();
    }
    setChatMode('workspace');
    setMessages([
      {
        role: 'assistant',
        content: '📊 Chào bạn! Tôi có thể giúp bạn phân tích và tóm tắt thông tin về workspace của bạn.\n\nVui lòng chọn một workspace để bắt đầu!',
        timestamp: new Date(),
      },
    ]);
    setSessionId(`ws_${Date.now()}`);
  };

  const handleSwitchToDocumentMode = () => {
    setChatMode('documents');
    setSelectedWorkspaceForInsight(null);
    setMessages([
      {
        role: 'assistant',
        content: 'Xin chào! Tôi là trợ lý AI của bạn. Bạn có thể upload file PDF hoặc URL để tôi học và trả lời câu hỏi về nội dung đó.\n\n📤 Vui lòng upload tài liệu trước khi chat!',
        timestamp: new Date(),
      },
    ]);
    setSessionId(`session_${Date.now()}`);
  };

  const handleSelectWorkspaceForInsight = async (workspace) => {
    try {
      setIsIndexingWorkspace(true);
      setSelectedWorkspaceForInsight(workspace);
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⏳ Đang phân tích workspace "${workspace.name}"...\n\nVui lòng chờ trong giây lát!`,
          timestamp: new Date(),
        },
      ]);

      // Index workspace
      const result = await chatbotService.indexWorkspace(workspace._id);
      console.log('Indexing result:', result);
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `✅ Đã phân tích xong workspace "${workspace.name}"!\n\nBạn có thể hỏi tôi về:\n- Tóm tắt tình hình workspace\n- Các task đang pending\n- Tiến độ dự án\n- Thảo luận gần đây\n- Vấn đề cần chú ý\n\nHãy đặt câu hỏi của bạn! 🚀`,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Error indexing workspace:', error);
      console.error('Error details:', error.response?.data);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ Lỗi: ${error.response?.data?.message || error.message || 'Không thể phân tích workspace'}`,
          timestamp: new Date(),
          isError: true,
        },
      ]);
      // Reset selected workspace on error
      setSelectedWorkspaceForInsight(null);
    } finally {
      setIsIndexingWorkspace(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-700 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600' : 'border-gray-200 bg-gradient-to-r from-red-600 via-rose-500 to-pink-600'} text-white rounded-t-2xl shadow-lg`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm animate-pulse">
              <SparklesIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                {isDark ? '🌙' : '🎄'} Festive Suit Chatbot
              </h2>
              <p className={`text-xs ${isDark ? 'text-cyan-100' : 'text-red-100'}`}>Your AI Holiday Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors relative"
              title="Lịch sử chat"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              {chatSessions.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-xs font-bold text-gray-900 rounded-full flex items-center justify-center">
                  {chatSessions.length}
                </span>
              )}
            </button>
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
          {/* Sidebar - Documents or Workspaces */}
          <div className={`w-64 border-r ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'} overflow-y-auto`}>
            <div className="p-4">
              {/* Mode Switcher */}
              <div className={`flex rounded-lg p-1 mb-4 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                <button
                  onClick={handleSwitchToDocumentMode}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${chatMode === 'documents' ? isDark ? 'bg-cyan-600 text-white' : 'bg-rose-500 text-white' : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  📄 Documents
                </button>
                <button
                  onClick={handleSwitchToWorkspaceMode}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${chatMode === 'workspace' ? isDark ? 'bg-cyan-600 text-white' : 'bg-rose-500 text-white' : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  📊 Workspace
                </button>
              </div>

              {chatMode === 'documents' ? (
                <>
                  <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    Knowledge Base ({documents.length})
                  </h3>

                  <button
                    onClick={() => setShowUploadMenu(!showUploadMenu)}
                    className={`w-full mb-3 px-3 py-2 text-white rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm font-medium ${isDark ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600' : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'}`}
                  >
                    <PlusIcon className="w-4 h-4" />
                    {isDark ? '✨' : '🎁'} Add Document
                  </button>
                </>
              ) : (
                <>
                  <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    📊 Workspaces ({workspaces.length})
                  </h3>
                  
                  {selectedWorkspaceForInsight && (
                    <div className={`mb-3 p-3 rounded-lg border ${isDark ? 'bg-cyan-900/30 border-cyan-600' : 'bg-rose-50 border-rose-300'}`}>
                      <p className={`text-xs font-medium ${isDark ? 'text-cyan-200' : 'text-rose-900'}`}>
                        📌 Analyzing:
                      </p>
                      <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {selectedWorkspaceForInsight.name}
                      </p>
                      <button
                        onClick={() => setSelectedWorkspaceForInsight(null)}
                        className={`mt-2 text-xs ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-rose-600 hover:text-rose-700'}`}
                      >
                        ← Change workspace
                      </button>
                    </div>
                  )}
                </>
              )}

              {chatMode === 'documents' && (
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

                  <button
                    onClick={() => setUploadType('workspace')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <BriefcaseIcon className="w-4 h-4" />
                    Import from Workspace
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

                  {uploadType === 'workspace' && (
                    <div className="space-y-3 pt-2">
                      {!selectedWorkspace ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-700">Chọn Workspace:</p>
                          {workspaces.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-3">Không có workspace nào</p>
                          ) : (
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {workspaces.map((workspace) => (
                                <button
                                  key={workspace._id}
                                  onClick={() => setSelectedWorkspace(workspace._id)}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-gray-700 hover:bg-blue-50 rounded text-xs transition-colors border border-gray-200"
                                >
                                  <div 
                                    className="w-3 h-3 rounded" 
                                    style={{ backgroundColor: workspace.color }}
                                  />
                                  <span className="font-medium truncate">{workspace.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-gray-700">Chọn File:</p>
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
                            <div className="text-center py-3">
                              <ArrowPathIcon className="w-5 h-5 text-blue-600 animate-spin mx-auto" />
                              <p className="text-xs text-gray-500 mt-1">Đang tải...</p>
                            </div>
                          ) : workspaceDocuments.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-3">Không có file PDF nào</p>
                          ) : (
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {workspaceDocuments.map((doc) => (
                                <button
                                  key={doc._id}
                                  onClick={() => handleImportFromWorkspace(doc._id)}
                                  disabled={isUploading}
                                  className="w-full flex items-start gap-2 px-2 py-1.5 text-left text-gray-700 hover:bg-blue-50 rounded text-xs transition-colors border border-gray-200 disabled:opacity-50"
                                >
                                  <FolderIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{doc.title}</p>
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

              {/* Documents or Workspaces List */}
              {chatMode === 'workspace' ? (
                <div className="space-y-2">
                  {workspaces.length === 0 ? (
                    <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Không có workspace nào
                    </p>
                  ) : selectedWorkspaceForInsight ? null : (
                    workspaces.map((workspace) => (
                      <button
                        key={workspace._id}
                        onClick={() => handleSelectWorkspaceForInsight(workspace)}
                        disabled={isIndexingWorkspace}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${isDark ? 'bg-gray-800 border-gray-700 hover:border-cyan-500' : 'bg-white border-gray-200 hover:border-rose-400'} disabled:opacity-50`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: workspace.color }}
                          />
                          <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                            {workspace.name}
                          </p>
                        </div>
                        {workspace.description && (
                          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {workspace.description.substring(0, 50)}...
                          </p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc._id}
                      className={`p-3 rounded-lg border transition-colors group ${
                        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                      } ${
                        selectedDocIds.has(doc._id) && doc.status === 'ready'
                          ? isDark ? 'border-cyan-500 bg-cyan-900/20' : 'border-rose-500 bg-rose-50'
                          : isDark ? 'hover:border-cyan-600' : 'hover:border-rose-300'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {/* Checkbox for selection */}
                        {doc.status === 'ready' && (
                          <input
                            type="checkbox"
                            checked={selectedDocIds.has(doc._id)}
                            onChange={() => toggleDocumentSelection(doc._id)}
                            className={`mt-1 w-4 h-4 rounded ${isDark ? 'text-cyan-600 focus:ring-cyan-500' : 'text-rose-600 focus:ring-rose-500'}`}
                          />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-900'}`} title={doc.title}>
                            {doc.title}
                          </p>
                          <p className={`text-xs capitalize ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
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
                          {doc.status === 'ready' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingDocument(doc);
                              }}
                              className={`p-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'hover:text-cyan-600' : 'hover:text-rose-600'}`}
                              title="Xem nội dung"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteDocument(doc._id)}
                            className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Xóa"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {documents.length === 0 && chatMode === 'documents' && (
                    <p className="text-xs text-gray-500 text-center py-4">
                      Chưa có tài liệu. Upload PDF hoặc URL để bắt đầu.
                    </p>
                  )}
                  
                  {documents.length > 0 && documents.filter(d => d.status === 'ready').length === 0 && chatMode === 'documents' && (
                    <p className="text-xs text-yellow-700 text-center py-2 bg-yellow-50 rounded">
                      ⏳ Đang xử lý tài liệu...
                    </p>
                  )}
                  
                  {selectedDocIds.size > 0 && chatMode === 'documents' && (
                    <p className="text-xs text-blue-700 text-center py-2 bg-blue-50 rounded font-medium">
                      ✓ Đã chọn {selectedDocIds.size} tài liệu
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-row overflow-hidden relative">
            {/* Messages Area */}
            <div className={`flex-1 flex flex-col ${showHistory ? 'w-[calc(100%-320px)]' : 'w-full'} transition-all duration-300`}>
              {/* Messages */}
              <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
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
                      <ArrowPathIcon className={`w-4 h-4 animate-spin ${isDark ? 'text-cyan-600' : 'text-rose-600'}`} />
                      <span className="text-sm text-gray-600">Đang suy nghĩ...✨</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Warning if no document selected or no workspace selected */}
            {chatMode === 'documents' && hasReadyDocuments && selectedDocIds.size === 0 && (
              <div className={`mx-4 mb-3 p-3 rounded-lg ${isDark ? 'bg-cyan-50 border border-cyan-200' : 'bg-rose-50 border border-rose-200'}`}>
                <p className={`text-sm ${isDark ? 'text-cyan-800' : 'text-rose-800'}`}>
                  {isDark ? '💡' : '❤️'} Vui lòng tick chọn tài liệu bạn muốn sử dụng để chat!
                </p>
              </div>
            )}

            {chatMode === 'workspace' && !selectedWorkspaceForInsight && (
              <div className={`mx-4 mb-3 p-3 rounded-lg ${isDark ? 'bg-cyan-50 border border-cyan-200' : 'bg-rose-50 border border-rose-200'}`}>
                <p className={`text-sm ${isDark ? 'text-cyan-800' : 'text-rose-800'}`}>
                  📊 Vui lòng chọn workspace để bắt đầu phân tích!
                </p>
              </div>
            )}

            {/* Input Form */}
            <div className={`p-4 border-t ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    chatMode === 'workspace' 
                      ? selectedWorkspaceForInsight 
                        ? "Hỏi về workspace..." 
                        : "Chọn workspace để bắt đầu..."
                      : selectedDocIds.size > 0 
                        ? "Nhập câu hỏi của bạn..." 
                        : "Chọn tài liệu để bắt đầu chat..."
                  }
                  className={`flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent disabled:cursor-not-allowed ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-cyan-500 disabled:bg-gray-800' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 disabled:bg-gray-100'}`}
                  disabled={isLoading || (chatMode === 'documents' && selectedDocIds.size === 0) || (chatMode === 'workspace' && !selectedWorkspaceForInsight) || isIndexingWorkspace}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim() || (chatMode === 'documents' && selectedDocIds.size === 0) || (chatMode === 'workspace' && !selectedWorkspaceForInsight) || isIndexingWorkspace}
                  className={`px-6 py-3 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2 ${isDark ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600' : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'}`}
                  title={
                    chatMode === 'documents' 
                      ? selectedDocIds.size === 0 ? "Chọn tài liệu trước" : "Gửi tin nhắn"
                      : !selectedWorkspaceForInsight ? "Chọn workspace trước" : "Gửi tin nhắn"
                  }
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>

          {/* Chat History Sidebar - Sliding from right */}
          {showHistory && (
            <div className={`w-80 ${isDark ? 'bg-gray-800 border-l border-gray-700' : 'bg-white border-l border-gray-200'} shadow-2xl flex flex-col`}>
                <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>📜 Lịch sử chat</h3>
                    <button
                      onClick={() => setShowHistory(false)}
                      className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  {loadingHistory ? (
                    <div className="text-center py-8">
                      <ArrowPathIcon className={`w-6 h-6 animate-spin mx-auto ${isDark ? 'text-cyan-500' : 'text-rose-500'}`} />
                      <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Đang tải...</p>
                    </div>
                  ) : chatSessions.length === 0 ? (
                    <p className={`text-sm text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Chưa có lịch sử chat
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {chatSessions.map((session) => (
                        <div
                          key={session.sessionId}
                          className={`p-3 rounded-lg border cursor-pointer transition-all group ${isDark ? 'bg-gray-700 border-gray-600 hover:border-cyan-500 hover:bg-gray-600' : 'bg-gray-50 border-gray-200 hover:border-rose-400 hover:bg-rose-50'}`}
                          onClick={() => handleLoadSession(session)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                                {session.title || 'Chat session'}
                              </p>
                              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                💬 {session.messageCount || 0} tin nhắn
                              </p>
                              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                🕒 {new Date(session.lastMessageAt || session.createdAt).toLocaleString('vi-VN')}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(session.sessionId);
                              }}
                              className={`p-1 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'hover:text-red-400 text-gray-500' : 'hover:text-red-600 text-gray-400'}`}
                              title="Xóa"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Viewer Popup */}
      {viewingDocument && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
            {/* Popup Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600' : 'border-gray-200 bg-gradient-to-r from-red-600 via-rose-500 to-pink-600'} text-white rounded-t-2xl shadow-lg`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <DocumentTextIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold truncate">{viewingDocument.title}</h3>
                  <p className={`text-xs flex items-center gap-2 mt-1 ${isDark ? 'text-cyan-100' : 'text-red-100'}`}>
                    <span className="px-2 py-0.5 bg-white/20 rounded-full">
                      {isDark ? '🌟' : '🎄'} {viewingDocument.type.toUpperCase()}
                    </span>
                    {viewingDocument.metadata?.pageCount && (
                      <span>📄 {viewingDocument.metadata.pageCount} trang</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingDocument(null)}
                className="p-2.5 hover:bg-white/20 rounded-xl transition-all hover:scale-110 ml-3"
                title="Đóng"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Document Content */}
            {viewingDocument.type === 'pdf' && viewingDocument.fileUrl ? (
              // PDF Full View
              <div className="flex-1 overflow-hidden bg-gray-100 relative">
                <iframe
                  src={viewingDocument.fileUrl}
                  className="w-full h-full border-0"
                  title={viewingDocument.title}
                  style={{ minHeight: '700px' }}
                />
              </div>
            ) : (
              // URL/Text Content View
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-sm max-w-none">
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">📄 Thông tin tài liệu</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600">Loại:</span>
                        <span className="ml-2 font-medium text-gray-900">{viewingDocument.type}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Trạng thái:</span>
                        <span className="ml-2 font-medium text-green-600">✓ {viewingDocument.status}</span>
                      </div>
                      {viewingDocument.metadata?.chunkCount && (
                        <div>
                          <span className="text-gray-600">Chunks:</span>
                          <span className="ml-2 font-medium text-gray-900">{viewingDocument.metadata.chunkCount}</span>
                        </div>
                      )}
                      {viewingDocument.source && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Nguồn:</span>
                          <span className="ml-2 font-medium text-gray-900 break-all">{viewingDocument.source}</span>
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="text-gray-600">Ngày tạo:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {new Date(viewingDocument.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">📝 Nội dung</h4>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                      {viewingDocument.content ? (
                        <p>{viewingDocument.content.substring(0, 5000)}{viewingDocument.content.length > 5000 ? '...' : ''}</p>
                      ) : (
                        <p className="text-gray-500 italic">Nội dung đang được xử lý...</p>
                      )}
                    </div>
                  </div>

                  {viewingDocument.fileUrl && (
                    <div className="mt-4">
                      <a
                        href={viewingDocument.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <DocumentArrowUpIcon className="w-4 h-4" />
                        Mở URL gốc
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Popup Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 rounded-b-2xl shadow-inner">
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Tạo lúc:</span> {new Date(viewingDocument.createdAt).toLocaleString('vi-VN')}
                </div>
                <button
                  onClick={() => setViewingDocument(null)}
                  className="px-6 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotModal;
