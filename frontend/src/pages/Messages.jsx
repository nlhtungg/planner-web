import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import messageService from '../services/messageService';
import socketService from '../services/socketService';
import {
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PlusIcon,
  HomeIcon,
  BriefcaseIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  BellIcon,
  Cog6ToothIcon,
  UserIcon,
  PaperAirplaneIcon,
  FaceSmileIcon,
  EllipsisVerticalIcon,
  PaintBrushIcon,
  UserCircleIcon,
  MagnifyingGlassPlusIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid';
import moment from 'moment';

const Messages = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Chat states
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // New feature states
  const [showEmojiPicker, setShowEmojiPicker] = useState(null); // messageId or null
  const [showSettings, setShowSettings] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [searchedMessages, setSearchedMessages] = useState([]);
  const [conversationSettings, setConversationSettings] = useState({
    nickname: '',
    themeColor: '#3B82F6'
  });

  const emojiList = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🎉', '🔥', '💯'];

  const sidebarItems = [
    { id: 'home', name: 'Home', icon: HomeIcon, path: '/' },
    { id: 'workspaces', name: 'Workspaces', icon: BriefcaseIcon, path: '/workspaces' },
    { id: 'connections', name: 'Connections', icon: UserGroupIcon, path: '#' },
    { id: 'messages', name: 'Messages', icon: ChatBubbleLeftRightIcon, path: '/messages' },
    { id: 'calendar', name: 'Calendar', icon: CalendarDaysIcon, path: '/calendar' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    fetchConversations();
    
    // Connect and join chat room
    socketService.connect();
    if (user?._id) {
      socketService.joinChat(user._id);
    }

    // Get socket instance for listeners
    const socket = socketService.connect();

    // Define handler inline
    const onNewMessage = (message) => {
      console.log('📨 Messages: Received new message, updating conversation list');
      
      // Update conversation list
      setConversations(prev => {
        const conversationId = message.conversationId;
        const existingIndex = prev.findIndex(conv => conv.conversationId === conversationId);
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: message.content,
            lastMessageAt: message.createdAt,
            unreadCount: message.receiver._id === user._id 
              ? (updated[existingIndex].unreadCount || 0) + 1 
              : updated[existingIndex].unreadCount
          };
          
          const [conversation] = updated.splice(existingIndex, 1);
          return [conversation, ...updated];
        } else {
          fetchConversations();
          return prev;
        }
      });
      
      // Update chat messages if this conversation is open
      if (
        (message.sender._id === selectedUserId && message.receiver._id === user._id) ||
        (message.sender._id === user._id && message.receiver._id === selectedUserId)
      ) {
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(m => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
        if (message.receiver._id === user._id) {
          messageService.markConversationAsRead(selectedUserId);
        }
      }
    };

    const onUserTyping = ({ userId }) => {
      if (userId === selectedUserId) {
        setIsTyping(true);
      }
    };

    const onUserStopTyping = ({ userId }) => {
      if (userId === selectedUserId) {
        setIsTyping(false);
      }
    };

    const onMessageRead = ({ messageId }) => {
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, readAt: new Date() } : msg
      ));
    };

    const onConversationRead = ({ userId }) => {
      if (userId === selectedUserId) {
        setMessages(prev => prev.map(msg => 
          msg.sender._id === user._id && !msg.readAt ? { ...msg, readAt: new Date() } : msg
        ));
      }
    };

    const onMessageReaction = (message) => {
      setMessages(prev => prev.map(msg => 
        msg._id === message._id ? message : msg
      ));
    };

    const onMessagePinned = (message) => {
      setMessages(prev => prev.map(msg => 
        msg._id === message._id ? message : msg
      ));
    };

    const onConversationUpdated = (conversation) => {
      // Update conversation settings
      if (conversation.themeColor) {
        setConversationSettings(prev => ({
          ...prev,
          themeColor: conversation.themeColor
        }));
      }
      // Refresh conversations list
      fetchConversations();
    };

    socket.on('new-message', onNewMessage);
    socket.on('user-typing', onUserTyping);
    socket.on('user-stop-typing', onUserStopTyping);
    socket.on('message-read', onMessageRead);
    socket.on('conversation-read', onConversationRead);
    socket.on('message-reaction', onMessageReaction);
    socket.on('message-pinned', onMessagePinned);
    socket.on('conversation-updated', onConversationUpdated);

    return () => {
      socket.off('new-message', onNewMessage);
      socket.off('user-typing', onUserTyping);
      socket.off('user-stop-typing', onUserStopTyping);
      socket.off('message-read', onMessageRead);
      socket.off('conversation-read', onConversationRead);
      socket.off('message-reaction', onMessageReaction);
      socket.off('message-pinned', onMessagePinned);
      socket.off('conversation-updated', onConversationUpdated);
    };
  }, [user, selectedUserId]);

  useEffect(() => {
    if (selectedUserId) {
      fetchMessages();
    }
  }, [selectedUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showEmojiPicker && !e.target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(null);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (loadMore = false) => {
    if (!selectedUserId) return;
    
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoadingMessages(true);
      }
      
      const skip = loadMore ? messages.length : 0;
      const limit = 30;
      const response = await messageService.getMessages(selectedUserId, limit, skip);
      const newMessages = response.data || [];
      
      if (loadMore) {
        setMessages(prev => [...newMessages, ...prev]);
        setHasMore(newMessages.length === limit);
      } else {
        setMessages(newMessages);
        setHasMore(newMessages.length === limit);
      }
      
      if (newMessages.length > 0) {
        const firstMessage = newMessages[0];
        const other = firstMessage.sender._id === user._id 
          ? firstMessage.receiver 
          : firstMessage.sender;
        setSelectedUser(other);
      }
      
      messageService.markConversationAsRead(selectedUserId);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
      setLoadingMore(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore) return;
    await fetchMessages(true);
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching conversations...');
      const response = await messageService.getConversations();
      console.log('🔍 Conversations response:', response);
      console.log('🔍 Conversations data:', response.data);
      setConversations(response.data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await messageService.searchUsers(query);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleStartChat = (selectedUserObj) => {
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUserId(selectedUserObj._id);
    setSelectedUser(selectedUserObj);
    fetchConversations();
  };

  const handleSelectConversation = async (otherUser) => {
    setSelectedUserId(otherUser._id);
    setSelectedUser(otherUser);
    setMessages([]);
    setHasMore(true);
    // fetchMessages will be called by useEffect when selectedUserId changes
  };

  const getOtherUser = (conversation) => {
    if (!conversation.participants || conversation.participants.length < 2) {
      return { firstName: 'Unknown', lastName: 'User', _id: null };
    }
    return conversation.participants[0]._id === user._id
      ? conversation.participants[1]
      : conversation.participants[0];
  };

  const getUnreadCount = (conversation) => {
    if (!conversation.unreadCount) return 0;
    return conversation.unreadCount[user._id] || 0;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending || !selectedUserId) return;

    try {
      setSending(true);
      const response = await messageService.sendMessage(selectedUserId, newMessage.trim());
      
      if (response.data) {
        setMessages(prev => {
          // Check if message already exists (might come from socket)
          const exists = prev.some(m => m._id === response.data._id);
          if (exists) return prev;
          return [...prev, response.data];
        });
        
        // Update conversation list
        setConversations(prev => {
          const conversationId = response.data.conversationId;
          const existingIndex = prev.findIndex(conv => conv.conversationId === conversationId);
          
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              lastMessage: response.data.content,
              lastMessageAt: response.data.createdAt,
            };
            
            const [conversation] = updated.splice(existingIndex, 1);
            return [conversation, ...updated];
          } else {
            // New conversation, fetch all conversations
            fetchConversations();
            return prev;
          }
        });
      }
      
      setNewMessage('');
      
      const socket = socketService.connect();
      socket.emit('stop-typing', { senderId: user._id, receiverId: selectedUserId });
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (!selectedUserId) return;
    
    const socket = socketService.connect();
    socket.emit('typing', { senderId: user._id, receiverId: selectedUserId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', { senderId: user._id, receiverId: selectedUserId });
    }, 1000);
  };

  const formatTime = (date) => {
    const messageDate = moment(date);
    const today = moment().startOf('day');
    const yesterday = moment().subtract(1, 'day').startOf('day');

    if (messageDate.isSame(today, 'd')) {
      return messageDate.format('HH:mm');
    } else if (messageDate.isSame(yesterday, 'd')) {
      return 'Yesterday ' + messageDate.format('HH:mm');
    } else if (messageDate.isAfter(moment().subtract(7, 'days'))) {
      return messageDate.format('ddd HH:mm');
    } else {
      return messageDate.format('DD/MM/YYYY HH:mm');
    }
  };

  // Emoji reaction handlers
  const handleAddReaction = async (messageId, emoji) => {
    try {
      const response = await messageService.addReaction(messageId, emoji);
      if (response.data) {
        setMessages(prev => prev.map(msg => 
          msg._id === messageId ? response.data : msg
        ));
      }
      setShowEmojiPicker(null);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleRemoveReaction = async (messageId) => {
    try {
      const response = await messageService.removeReaction(messageId);
      if (response.data) {
        setMessages(prev => prev.map(msg => 
          msg._id === messageId ? response.data : msg
        ));
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  };

  // Pin message handler
  const handleTogglePin = async (messageId) => {
    try {
      const response = await messageService.togglePinMessage(messageId);
      if (response.data) {
        setMessages(prev => prev.map(msg => 
          msg._id === messageId ? response.data : msg
        ));
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  // Conversation settings handlers
  const handleUpdateSettings = async () => {
    try {
      await messageService.updateConversationSettings(selectedUserId, conversationSettings);
      setShowSettings(false);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  // Message search handler
  const handleSearchMessages = async () => {
    if (!messageSearchQuery.trim() || messageSearchQuery.length < 2) return;
    
    try {
      const response = await messageService.searchMessages(selectedUserId, messageSearchQuery);
      setSearchedMessages(response.data || []);
    } catch (error) {
      console.error('Error searching messages:', error);
    }
  };

  const handleJumpToMessage = (messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('bg-yellow-100');
      setTimeout(() => {
        messageElement.classList.remove('bg-yellow-100');
      }, 2000);
    }
    setShowMessageSearch(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Planner</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <BellIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => navigate('/profile')}
                className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-sm font-medium">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  )}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </button>
              <button 
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm h-screen sticky top-0 border-r border-gray-200">
          <nav className="p-4 space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === 'messages';
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 mt-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={() => navigate('/workspaces')}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <PlusIcon className="w-4 h-4" />
                <span>New Workspace</span>
              </button>
              <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                <UserGroupIcon className="w-4 h-4" />
                <span>Invite Members</span>
              </button>
              <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                <Cog6ToothIcon className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content - Messages */}
        <div className="flex-1 flex">
      {/* Sidebar - Conversations List */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <button
              onClick={() => setShowSearchModal(true)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500">No conversations yet</p>
              <button
                onClick={() => setShowSearchModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start a conversation
              </button>
            </div>
          ) : (
            conversations.map((conversation) => {
              const otherUser = getOtherUser(conversation);
              const unreadCount = getUnreadCount(conversation);
              
              return (
                <button
                  key={conversation._id}
                  onClick={() => handleSelectConversation(otherUser)}
                  className={`w-full p-4 hover:bg-gray-50 border-b border-gray-100 flex items-start space-x-3 transition-colors ${
                    selectedUserId === otherUser._id ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {otherUser.avatar ? (
                      <img
                        src={otherUser.avatar}
                        alt={`${otherUser.firstName} ${otherUser.lastName}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                        {otherUser.firstName?.[0]}{otherUser.lastName?.[0]}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`font-semibold ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                        {otherUser.firstName} {otherUser.lastName}
                      </p>
                      <span className="text-xs text-gray-500">
                        {moment(conversation.lastMessageAt).fromNow()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${unreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                        {conversation.lastMessage || 'No messages yet'}
                      </p>
                      {unreadCount > 0 && (
                        <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Room - Right Side */}
      <div className="flex-1 flex flex-col bg-gray-50 h-screen">
        {!selectedUserId ? (
          <div className="flex items-center justify-center h-full">
            {/* Empty when no conversation selected */}
          </div>
        ) : (
          <>
            {/* Chat Header - Fixed */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4" style={{ backgroundColor: conversationSettings.themeColor + '10' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {selectedUser && (
                    <>
                      {selectedUser.avatar ? (
                        <img
                          src={selectedUser.avatar}
                          alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                          {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                        </div>
                      )}
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {conversationSettings.nickname || `${selectedUser.firstName} ${selectedUser.lastName}`}
                        </h2>
                        {isTyping && (
                          <p className="text-sm text-blue-600">typing...</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowMessageSearch(true)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Search messages"
                  >
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Settings"
                  >
                    <Cog6ToothIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {!loadingMore && hasMore && messages.length > 0 && (
                <div className="flex justify-center mb-4">
                  <button
                    onClick={loadMoreMessages}
                    disabled={loadingMore}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-sm"
                  >
                    {loadingMore ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        <span className="text-sm">Loading...</span>
                      </>
                    ) : (
                      <span className="text-sm font-medium">Load older messages</span>
                    )}
                  </button>
                </div>
              )}

              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.sender._id === user._id;
                  const showAvatar = index === 0 || messages[index - 1].sender._id !== message.sender._id;
                  const userReaction = message.reactions?.find(r => r.user._id === user._id);
                  
                  return (
                    <div
                      key={message._id}
                      id={`message-${message._id}`}
                      className={`flex items-end space-x-2 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''} group`}
                    >
                      <div className="flex-shrink-0">
                        {showAvatar ? (
                          isOwn ? (
                            user.avatar ? (
                              <img src={user.avatar} alt="You" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                                {user.firstName?.[0]}{user.lastName?.[0]}
                              </div>
                            )
                          ) : (
                            selectedUser?.avatar ? (
                              <img src={selectedUser.avatar} alt={selectedUser.firstName} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-semibold">
                                {selectedUser?.firstName?.[0]}{selectedUser?.lastName?.[0]}
                              </div>
                            )
                          )
                        ) : (
                          <div className="w-8 h-8"></div>
                        )}
                      </div>

                      <div className={`max-w-md ${isOwn ? 'items-end' : 'items-start'}`}>
                        <div className="relative group/message">
                          {/* Pin indicator */}
                          {message.isPinned && (
                            <div className={`absolute -top-2 ${isOwn ? '-left-2' : '-right-2'} bg-yellow-400 rounded-full p-1`}>
                              <BookmarkIconSolid className="w-3 h-3 text-white" />
                            </div>
                          )}

                          {/* Action menu */}
                          <div className={`absolute top-0 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover/message:opacity-100 transition-opacity flex items-center space-x-1`}>
                            <button
                              onClick={() => setShowEmojiPicker(showEmojiPicker === message._id ? null : message._id)}
                              className="p-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 shadow-sm"
                              title="React"
                            >
                              <FaceSmileIcon className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleTogglePin(message._id)}
                              className="p-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 shadow-sm"
                              title={message.isPinned ? 'Unpin' : 'Pin'}
                            >
                              <BookmarkIcon className={`w-4 h-4 ${message.isPinned ? 'text-yellow-500' : 'text-gray-600'}`} />
                            </button>
                          </div>

                          {/* Message bubble */}
                          <div 
                            className={`px-4 py-2 rounded-2xl ${
                              isOwn 
                                ? 'text-white' 
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}
                            style={isOwn ? { backgroundColor: conversationSettings.themeColor || '#3B82F6' } : {}}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          </div>

                          {/* Emoji picker popup */}
                          {showEmojiPicker === message._id && (
                            <div className={`emoji-picker-container absolute ${isOwn ? 'right-0' : 'left-0'} mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex space-x-1 z-10`}>
                              {emojiList.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => {
                                    if (userReaction?.emoji === emoji) {
                                      handleRemoveReaction(message._id);
                                    } else {
                                      handleAddReaction(message._id, emoji);
                                    }
                                    setShowEmojiPicker(null);
                                  }}
                                  className={`text-xl hover:bg-gray-100 p-1 rounded ${
                                    userReaction?.emoji === emoji ? 'bg-blue-100' : ''
                                  }`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Reactions display */}
                          {message.reactions && message.reactions.length > 0 && (
                            <div className={`flex items-center space-x-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              {Object.entries(
                                message.reactions.reduce((acc, r) => {
                                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([emoji, count]) => (
                                <button
                                  key={emoji}
                                  onClick={() => {
                                    if (userReaction?.emoji === emoji) {
                                      handleRemoveReaction(message._id);
                                    } else {
                                      handleAddReaction(message._id, emoji);
                                    }
                                  }}
                                  className={`px-2 py-0.5 rounded-full text-xs flex items-center space-x-1 ${
                                    userReaction?.emoji === emoji 
                                      ? 'bg-blue-100 border border-blue-500' 
                                      : 'bg-gray-100 border border-gray-300 hover:bg-gray-200'
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span className="text-gray-600">{count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <p className={`text-xs text-gray-500 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                          {formatTime(message.createdAt)}
                          {isOwn && message.readAt && ' · Read'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing Indicator - Fixed */}
            {isTyping && (
              <div className="flex-shrink-0 px-6 py-2 bg-gray-50">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span>{selectedUser?.firstName} is typing...</span>
                </div>
              </div>
            )}

            {/* Input Form - Fixed */}
            <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Conversation Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Settings Form */}
            <div className="p-6 space-y-6">
              {/* Nickname */}
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <UserCircleIcon className="w-5 h-5" />
                  <span>Nickname</span>
                </label>
                <input
                  type="text"
                  value={conversationSettings.nickname}
                  onChange={(e) => setConversationSettings({ ...conversationSettings, nickname: e.target.value })}
                  placeholder={`${selectedUser.firstName} ${selectedUser.lastName}`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Set a custom name for this conversation</p>
              </div>

              {/* Theme Color */}
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <PaintBrushIcon className="w-5 h-5" />
                  <span>Theme Color</span>
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="color"
                    value={conversationSettings.themeColor}
                    onChange={(e) => setConversationSettings({ ...conversationSettings, themeColor: e.target.value })}
                    className="w-16 h-10 rounded-lg border border-gray-300 cursor-pointer"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={conversationSettings.themeColor}
                      onChange={(e) => setConversationSettings({ ...conversationSettings, themeColor: e.target.value })}
                      placeholder="#3B82F6"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Choose a color for your messages</p>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
                <div className="flex justify-end">
                  <div 
                    className="px-4 py-2 rounded-2xl text-white text-sm"
                    style={{ backgroundColor: conversationSettings.themeColor }}
                  >
                    Your message will look like this
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSettings}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Search Modal */}
      {showMessageSearch && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-end z-50">
          <div className="bg-white h-full w-full max-w-md shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                <MagnifyingGlassPlusIcon className="w-6 h-6" />
                <span>Search Messages</span>
              </h3>
              <button
                onClick={() => {
                  setShowMessageSearch(false);
                  setMessageSearchQuery('');
                  setSearchedMessages([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search in conversation..."
                    value={messageSearchQuery}
                    onChange={(e) => setMessageSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleSearchMessages}
                  disabled={messageSearchQuery.trim().length < 2}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Search
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Enter at least 2 characters to search</p>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto p-6">
              {searchedMessages.length === 0 && messageSearchQuery.trim().length >= 2 ? (
                <div className="text-center text-gray-500 py-8">
                  <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No messages found</p>
                </div>
              ) : searchedMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>Search for messages in this conversation</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchedMessages.map((message) => {
                    const isOwn = message.sender._id === user._id;
                    return (
                      <button
                        key={message._id}
                        onClick={() => handleJumpToMessage(message._id)}
                        className="w-full p-4 hover:bg-gray-50 rounded-lg border border-gray-200 text-left transition-colors"
                      >
                        <div className="flex items-start space-x-3">
                          {isOwn ? (
                            user.avatar ? (
                              <img src={user.avatar} alt="You" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                {user.firstName?.[0]}{user.lastName?.[0]}
                              </div>
                            )
                          ) : (
                            selectedUser?.avatar ? (
                              <img src={selectedUser.avatar} alt={selectedUser.firstName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                {selectedUser?.firstName?.[0]}{selectedUser?.lastName?.[0]}
                              </div>
                            )
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {isOwn ? 'You' : `${selectedUser.firstName} ${selectedUser.lastName}`}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTime(message.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 truncate">{message.content}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Start a conversation</h3>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-6">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Search Results */}
              <div className="mt-4 max-h-96 overflow-y-auto">
                {searching ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : searchResults.length === 0 && searchQuery.trim().length >= 2 ? (
                  <p className="text-center text-gray-500 py-8">No users found</p>
                ) : (
                  searchResults.map((searchUser) => (
                    <button
                      key={searchUser._id}
                      onClick={() => handleStartChat(searchUser)}
                      className="w-full p-3 hover:bg-gray-50 rounded-lg flex items-center space-x-3 transition-colors"
                    >
                      {searchUser.avatar ? (
                        <img
                          src={searchUser.avatar}
                          alt={`${searchUser.firstName} ${searchUser.lastName}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                          {searchUser.firstName?.[0]}{searchUser.lastName?.[0]}
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900">
                          {searchUser.firstName} {searchUser.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{searchUser.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
