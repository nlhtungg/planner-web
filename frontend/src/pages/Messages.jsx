import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConnection } from '../context/ConnectionContext';
import messageService from '../services/messageService';
import groupService from '../services/groupService';
import socketService from '../services/socketService';
import ToastContainer from '../components/ToastContainer';
import useToast from '../utils/useToast';
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
  DocumentTextIcon,
  PhotoIcon,
  PaperClipIcon,
  GifIcon,
} from '@heroicons/react/24/outline';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid';
import moment from 'moment';

const Messages = () => {
  const { user, logout } = useAuth();
  const { pendingRequestsCount } = useConnection();
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, removeToast, showSuccess, showError, showWarning } = useToast();
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [allConversations, setAllConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Chat states
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
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
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [searchedMessages, setSearchedMessages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [conversationSettings, setConversationSettings] = useState({
    nickname: '',
    themeColor: '#3B82F6'
  });

  const emojiList = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🎉', '🔥', '💯'];

  // Giphy API key (you can get free key from https://developers.giphy.com/)
  const GIPHY_API_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65'; // This is a public demo key

  // Fetch trending GIFs on mount
  useEffect(() => {
    if (showGifPicker && gifs.length === 0) {
      fetchTrendingGifs();
    }
  }, [showGifPicker]);

  const fetchTrendingGifs = async () => {
    setLoadingGifs(true);
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Error fetching GIFs:', error);
    } finally {
      setLoadingGifs(false);
    }
  };

  const searchGifs = async (query) => {
    if (!query.trim()) {
      fetchTrendingGifs();
      return;
    }
    setLoadingGifs(true);
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Error searching GIFs:', error);
    } finally {
      setLoadingGifs(false);
    }
  };

  const handleSendGif = async (gifUrl) => {
    try {
      setSending(true);
      let response;
      
      // Send GIF URL as message content with special marker
      const gifMessage = `[GIF]${gifUrl}`;
      
      if (selectedGroupId) {
        response = await groupService.sendGroupMessage(selectedGroupId, gifMessage, []);
      } else {
        response = await messageService.sendMessage(selectedUserId, gifMessage, []);
      }

      if (response.data) {
        setMessages(prev => [...prev, response.data]);
        scrollToBottom();
      }
      
      setShowGifPicker(false);
      setGifSearchQuery('');
    } catch (error) {
      console.error('Error sending GIF:', error);
      showError('Failed to send GIF: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    try {
      const fileList = e.target.files;
      console.log('📁 File input changed, files:', fileList?.length || 0);
      
      if (!fileList || fileList.length === 0) {
        console.log('   No files selected');
        return;
      }
      
      const input = e.target;
      const files = Array.from(fileList);
      console.log('   Files array:', files.map(f => `${f.name} (${f.size} bytes)`));
      
      // Reset input immediately
      input.value = '';
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      const maxFiles = 5;
      
      setSelectedFiles(prev => {
        console.log('   Current files count:', prev.length);
        const validFiles = [];
        let error = null;
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          if (prev.length + validFiles.length >= maxFiles) {
            error = 'Maximum 5 files allowed';
            console.log('   ❌ Max files reached');
            break;
          }
          
          if (file.size > maxSize) {
            error = `${file.name} exceeds 10MB limit`;
            console.log('   ❌ File too large:', file.name);
            continue;
          }
          
          validFiles.push(file);
          console.log('   ✅ Valid file:', file.name);
        }
        
        if (error) {
          showError(error);
        }
        
        const newFiles = validFiles.length > 0 ? [...prev, ...validFiles] : prev;
        console.log('   Total files after update:', newFiles.length);
        return newFiles;
      });
    } catch (error) {
      console.error('❌ Error in handleFileSelect:', error);
      showError('Error selecting files: ' + error.message);
    }
  };

  const sidebarItems = [
    { id: 'home', name: 'Home', icon: HomeIcon, path: '/home' },
    { id: 'workspaces', name: 'Workspaces', icon: BriefcaseIcon, path: '/workspaces' },
    { id: 'connections', name: 'Connections', icon: UserGroupIcon, path: '/connections' },
    { id: 'messages', name: 'Messages', icon: ChatBubbleLeftRightIcon, path: '/messages' },
    { id: 'calendar', name: 'Calendar', icon: CalendarDaysIcon, path: '/calendar' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchConversations();
    
    // Connect and join chat room
    socketService.connect();
    if (user?._id) {
      socketService.joinChat(user._id);
    }

    // Check if user was passed from navigation (from Connections page)
    if (location.state?.selectUser) {
      const userToSelect = location.state.selectUser;
      console.log('📨 Auto-selecting user from navigation:', userToSelect);
      // Wait a bit for conversations to load, then select
      setTimeout(() => {
        handleSelectConversation(userToSelect);
      }, 500);
      // Clear the state to prevent re-selection on re-render
      navigate(location.pathname, { replace: true });
    }

    // Get socket instance for listeners
    const socket = socketService.connect();

    // Define handler inline
    const onNewMessage = (message) => {
      console.log('📨 Messages: Received new message, updating conversation list');
      
      // Update allConversations list
      updateAllConversations(prev => {
        const conversationId = message.conversationId;
        const existingIndex = prev.findIndex(conv => 
          conv.type === 'direct' && conv.conversationId === conversationId
        );
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          const isReceiver = message.receiver._id === user._id;
          const currentUnreadCount = updated[existingIndex].unreadCount || {};
          
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: message.content,
            lastMessageSender: message.sender,
            lastMessageAt: message.createdAt,
            unreadCount: isReceiver
              ? { ...currentUnreadCount, [user._id]: (currentUnreadCount[user._id] || 0) + 1 }
              : currentUnreadCount
          };
          
          return updated;
        } else {
          fetchConversations();
          return prev;
        }
      });
      
      // Also update separate conversations state for compatibility
      setConversations(prev => {
        const conversationId = message.conversationId;
        const existingIndex = prev.findIndex(conv => conv.conversationId === conversationId);
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: message.content,
            lastMessageSender: message.sender,
            lastMessageAt: message.createdAt
          };
          return updated;
        }
        return prev;
      });
      
      // Update chat messages if this conversation is open
      // For system messages or regular messages, check if it belongs to current conversation
      const belongsToCurrentConversation = 
        (message.sender._id === selectedUserId && message.receiver._id === user._id) ||
        (message.sender._id === user._id && message.receiver._id === selectedUserId) ||
        (message.receiver._id === selectedUserId && message.sender._id === user._id) ||
        (message.receiver._id === user._id && message.sender._id === selectedUserId);
      
      if (belongsToCurrentConversation) {
        console.log('📨 Adding message to chat:', message.isSystemMessage ? 'SYSTEM' : 'REGULAR', message.content);
        console.log('   sender:', message.sender._id, 'receiver:', message.receiver._id);
        console.log('   currentUser:', user._id, 'selectedUser:', selectedUserId);
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(m => m._id === message._id);
          if (exists) {
            console.log('   ⚠️ Message already exists, skipping');
            return prev;
          }
          console.log('   ✅ Adding message to list');
          return [...prev, message];
        });
        if (message.receiver._id === user._id && !message.isSystemMessage) {
          messageService.markConversationAsRead(selectedUserId);
        }
      } else {
        console.log('   ❌ Message does not belong to current conversation, skipping');
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

    const onMessageRead = ({ messageId, readAt, readBy }) => {
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, readAt: readAt || new Date(), readBy: readBy || msg.readBy } : msg
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
      console.log('👍 Reaction event received:', message._id);
      
      // Update message in chat if conversation is open
      setMessages(prev => prev.map(msg => 
        msg._id === message._id ? message : msg
      ));
      
      // Update conversation list to show latest reaction activity
      setConversations(prev => {
        const conversationId = message.conversationId;
        const existingIndex = prev.findIndex(conv => conv.conversationId === conversationId);
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          // Find who reacted
          const latestReaction = message.reactions?.[message.reactions.length - 1];
          const reactorName = latestReaction?.user?.firstName || 'Someone';
          const emoji = latestReaction?.emoji || '👍';
          
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: `${reactorName} reacted ${emoji}`,
            lastMessageAt: new Date()
          };
          
          // Move to top
          const [conversation] = updated.splice(existingIndex, 1);
          return [conversation, ...updated];
        }
        return prev;
      });
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

    const onNewGroupMessage = (message) => {
      console.log('📨 New group message received:', message);
      
      // Update allConversations list
      updateAllConversations(prev => {
        const groupId = message.group?._id;
        const existingIndex = prev.findIndex(conv => 
          conv.type === 'group' && conv._id === groupId
        );
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          const isNotSender = message.sender._id !== user._id;
          const currentUnreadCount = updated[existingIndex].unreadCount || {};
          
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: message.content,
            lastMessageSender: message.sender,
            lastMessageAt: message.createdAt || new Date(),
            unreadCount: isNotSender
              ? { ...currentUnreadCount, [user._id]: (currentUnreadCount[user._id] || 0) + 1 }
              : currentUnreadCount
          };
          
          return updated;
        }
        return prev;
      });
      
      // Also update separate groups state
      setGroups(prev => {
        const groupId = message.group?._id;
        const existingIndex = prev.findIndex(g => g._id === groupId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: message.content,
            lastMessageSender: message.sender,
            lastMessageAt: message.createdAt || new Date()
          };
          return updated;
        }
        return prev;
      });
      
      if (selectedGroupId === message.group?._id) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
        // Mark as read if message is from another user
        if (message.sender._id !== user._id && !message.isSystemMessage) {
          groupService.markMessageAsRead(message._id);
        }
      }
    };

    const onGroupUpdated = (group) => {
      console.log('📝 Group updated:', group);
      fetchConversations();
      if (selectedGroupId === group._id) {
        setSelectedGroup(group);
      }
    };

    const onGroupMessageReaction = (message) => {
      console.log('👍 Group message reaction updated:', message);
      if (selectedGroupId === message.group?._id) {
        setMessages(prev =>
          prev.map(m => m._id === message._id ? message : m)
        );
      }
    };

    const onGroupMessagePinned = (data) => {
      console.log('📌 Group message pinned:', data);
      if (selectedGroupId === data.groupId) {
        setMessages(prev =>
          prev.map(m => m._id === data.messageId ? { ...m, isPinned: data.isPinned } : m)
        );
      }
    };

    const onGroupMessageRead = ({ messageId, readBy }) => {
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, readBy: readBy || msg.readBy } : msg
      ));
    };

    socket.on('new-message', onNewMessage);
    socket.on('new-group-message', onNewGroupMessage);
    socket.on('user-typing', onUserTyping);
    socket.on('user-stop-typing', onUserStopTyping);
    socket.on('message-read', onMessageRead);
    socket.on('group-message-read', onGroupMessageRead);
    socket.on('conversation-read', onConversationRead);
    socket.on('message-reaction', onMessageReaction);
    socket.on('group-message-reaction', onGroupMessageReaction);
    socket.on('message-pinned', onMessagePinned);
    socket.on('group-message-pinned', onGroupMessagePinned);
    socket.on('conversation-updated', onConversationUpdated);
    socket.on('group-updated', onGroupUpdated);

    return () => {
      socket.off('new-message', onNewMessage);
      socket.off('new-group-message', onNewGroupMessage);
      socket.off('user-typing', onUserTyping);
      socket.off('user-stop-typing', onUserStopTyping);
      socket.off('message-read', onMessageRead);
      socket.off('group-message-read', onGroupMessageRead);
      socket.off('conversation-read', onConversationRead);
      socket.off('message-reaction', onMessageReaction);
      socket.off('group-message-reaction', onGroupMessageReaction);
      socket.off('message-pinned', onMessagePinned);
      socket.off('group-message-pinned', onGroupMessagePinned);
      socket.off('conversation-updated', onConversationUpdated);
      socket.off('group-updated', onGroupUpdated);
    };
  }, [user, selectedUserId, selectedGroupId]);

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
      if (showGifPicker && !e.target.closest('.gif-picker-container') && !e.target.closest('button[title="Send GIF"]')) {
        setShowGifPicker(false);
      }
    };

    if (showEmojiPicker || showGifPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker, showGifPicker]);

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
      
      console.log('📬 Fetched messages:', newMessages.length, 'messages');
      const systemMessages = newMessages.filter(m => m.isSystemMessage);
      console.log('🔔 System messages found:', systemMessages.length);
      systemMessages.forEach(sm => console.log('   -', sm.content));
      
      if (loadMore) {
        setMessages(prev => [...newMessages, ...prev]);
        setHasMore(newMessages.length === limit);
      } else {
        setMessages(newMessages);
        setHasMore(newMessages.length === limit);
        // Scroll to bottom when loading new conversation
        setTimeout(() => scrollToBottom(), 100);
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
      console.log('🔍 Fetching conversations and groups...');
      
      // Fetch both conversations and groups in parallel
      const [conversationsRes, groupsRes] = await Promise.all([
        messageService.getConversations(),
        groupService.getUserGroups()
      ]);
      
      console.log('🔍 Conversations:', conversationsRes.data);
      console.log('🔍 Groups:', groupsRes.data);
      
      // Combine conversations and groups, then sort by last message time
      const combined = [
        ...(conversationsRes.data || []).map(conv => ({ ...conv, type: 'direct' })),
        ...(groupsRes.data || []).map(group => ({ ...group, type: 'group' }))
      ].sort((a, b) => {
        const timeA = new Date(a.lastMessageAt || 0);
        const timeB = new Date(b.lastMessageAt || 0);
        return timeB - timeA;
      });
      
      // Set the combined sorted list
      setAllConversations(combined);
      // Also keep separate for compatibility
      setConversations(conversationsRes.data || []);
      setGroups(groupsRes.data || []);
    } catch (error) {
      console.error('Error fetching conversations/groups:', error);
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
    console.log('🔵 Selecting conversation, resetting unread count for:', otherUser.firstName);
    setSelectedUserId(otherUser._id);
    setSelectedUser(otherUser);
    setSelectedGroupId(null);
    setSelectedGroup(null);
    setMessages([]);
    setHasMore(true);
    
    // Reset unread count in allConversations immediately
    updateAllConversations(prev => {
      console.log('📝 Updating allConversations, current state:', prev);
      return prev.map(conv => {
        if (conv.type === 'direct' && conv.participants) {
          const hasUser = conv.participants.some(p => p._id === otherUser._id);
          if (hasUser) {
            console.log('✅ Found conversation, resetting unread count. Old:', conv.unreadCount);
            const currentUnreadCount = conv.unreadCount || {};
            return {
              ...conv,
              unreadCount: { ...currentUnreadCount, [user._id]: 0 }
            };
          }
        }
        return conv;
      });
    });
    
    // Also reset in separate conversations state
    setConversations(prev => {
      return prev.map(conv => {
        if (conv.participants) {
          const hasUser = conv.participants.some(p => p._id === otherUser._id);
          if (hasUser) {
            const currentUnreadCount = conv.unreadCount || {};
            return {
              ...conv,
              unreadCount: { ...currentUnreadCount, [user._id]: 0 }
            };
          }
        }
        return conv;
      });
    });
    
    // Mark conversation as read immediately
    try {
      await messageService.markConversationAsRead(otherUser._id);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
    // fetchMessages will be called by useEffect when selectedUserId changes
  };

  const handleSelectGroup = async (group) => {
    setSelectedGroupId(group._id);
    setSelectedGroup(group);
    setSelectedUserId(null);
    setSelectedUser(null);
    setMessages([]);
    setHasMore(true);
    
    // Reset unread count in allConversations immediately
    updateAllConversations(prev => {
      return prev.map(conv => {
        if (conv.type === 'group' && conv._id === group._id) {
          const currentUnreadCount = conv.unreadCount || {};
          return {
            ...conv,
            unreadCount: { ...currentUnreadCount, [user._id]: 0 }
          };
        }
        return conv;
      });
    });
    
    // Also reset in separate groups state
    setGroups(prev => {
      return prev.map(g => {
        if (g._id === group._id) {
          const currentUnreadCount = g.unreadCount || {};
          return {
            ...g,
            unreadCount: { ...currentUnreadCount, [user._id]: 0 }
          };
        }
        return g;
      });
    });
    
    try {
      setLoadingMessages(true);
      const response = await groupService.getGroupMessages(group._id);
      setMessages(response.data || []);
      
      // Mark all messages as read
      await groupService.markGroupMessagesAsRead(group._id);
      
      // Scroll to bottom after loading messages
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error fetching group messages:', error);
    } finally {
      setLoadingMessages(false);
    }
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

  // Helper function to update and re-sort allConversations
  const updateAllConversations = (updateFn) => {
    setAllConversations(prev => {
      const updated = updateFn(prev);
      // Re-sort by lastMessageAt
      return updated.sort((a, b) => {
        const timeA = new Date(a.lastMessageAt || 0);
        const timeB = new Date(b.lastMessageAt || 0);
        return timeB - timeA;
      });
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && selectedFiles.length === 0) || sending || (!selectedUserId && !selectedGroupId)) return;

    try {
      setSending(true);
      console.log('📤 Sending message with files:', selectedFiles.length);
      
      let response;
      if (selectedGroupId) {
        // Send group message
        response = await groupService.sendGroupMessage(
          selectedGroupId,
          newMessage.trim() || '📎 Attachment',
          selectedFiles
        );
      } else {
        // Send direct message
        response = await messageService.sendMessage(
          selectedUserId, 
          newMessage.trim() || '📎 Attachment', 
          selectedFiles
        );
      }
      
      console.log('✅ Message sent:', response);
      
      if (response.data) {
        setMessages(prev => {
          // Check if message already exists (might come from socket)
          const exists = prev.some(m => m._id === response.data._id);
          if (exists) return prev;
          return [...prev, response.data];
        });
        
        // Update conversation list
        if (selectedUserId) {
          // Direct message - update allConversations
          updateAllConversations(prev => {
            const conversationId = response.data.conversationId;
            const existingIndex = prev.findIndex(conv => 
              conv.type === 'direct' && conv.conversationId === conversationId
            );
            
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                lastMessage: response.data.content,
                lastMessageSender: response.data.sender,
                lastMessageAt: response.data.createdAt
              };
              return updated;
            } else {
              // New conversation, fetch all conversations
              fetchConversations();
              return prev;
            }
          });
          
          // Also update separate state
          setConversations(prev => {
            const conversationId = response.data.conversationId;
            const existingIndex = prev.findIndex(conv => conv.conversationId === conversationId);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                lastMessage: response.data.content,
                lastMessageSender: response.data.sender,
                lastMessageAt: response.data.createdAt
              };
              return updated;
            }
            return prev;
          });
        } else if (selectedGroupId) {
          // Group message - update allConversations
          updateAllConversations(prev => {
            const existingIndex = prev.findIndex(conv => 
              conv.type === 'group' && conv._id === selectedGroupId
            );
            
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                lastMessage: response.data.content,
                lastMessageSender: response.data.sender,
                lastMessageAt: response.data.createdAt || new Date()
              };
              return updated;
            }
            return prev;
          });
          
          // Also update separate state
          setGroups(prev => {
            const existingIndex = prev.findIndex(g => g._id === selectedGroupId);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                lastMessage: response.data.content,
                lastMessageSender: response.data.sender,
                lastMessageAt: response.data.createdAt || new Date()
              };
              return updated;
            }
            return prev;
          });
        }
      }
      
      setNewMessage('');
      setSelectedFiles([]);
      
      if (selectedUserId) {
        const socket = socketService.connect();
        socket.emit('stop-typing', { senderId: user._id, receiverId: selectedUserId });
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      showError('Failed to send message: ' + error.message);
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
      let response;
      if (selectedGroupId) {
        response = await groupService.addReaction(messageId, emoji);
      } else {
        response = await messageService.addReaction(messageId, emoji);
      }
      
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
      let response;
      if (selectedGroupId) {
        response = await groupService.removeReaction(messageId);
      } else {
        response = await messageService.removeReaction(messageId);
      }
      
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
      let response;
      if (selectedGroupId) {
        response = await groupService.togglePinMessage(messageId);
      } else {
        response = await messageService.togglePinMessage(messageId);
      }
      
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
  const handleSearchMessages = async (query = messageSearchQuery) => {
    if (!query.trim() || query.length < 2) {
      setSearchedMessages([]);
      return;
    }
    
    try {
      let response;
      if (selectedGroupId) {
        // For group, use backend API
        response = await groupService.searchGroupMessages(selectedGroupId, query);
        setSearchedMessages(response.data || []);
      } else {
        response = await messageService.searchMessages(selectedUserId, query);
        setSearchedMessages(response.data || []);
      }
    } catch (error) {
      console.error('Error searching messages:', error);
    }
  };
  
  // Auto search when query changes
  useEffect(() => {
    if (messageSearchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        handleSearchMessages(messageSearchQuery);
      }, 300); // Debounce 300ms
      return () => clearTimeout(timeoutId);
    } else {
      setSearchedMessages([]);
    }
  }, [messageSearchQuery, messages, selectedUserId, selectedGroupId]);

  const handleJumpToMessage = (messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add highlight effect with ring
      messageElement.classList.add('ring-4', 'ring-yellow-300', 'bg-yellow-50');
      setTimeout(() => {
        messageElement.classList.remove('ring-4', 'ring-yellow-300', 'bg-yellow-50');
      }, 2000);
    }
    setShowMessageSearch(false);
    setShowPinnedMessages(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 sm:gap-6 justify-between flex-wrap">
            {/* Left: Menu + Logo */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                className="md:hidden p-2.5 rounded-xl hover:bg-gray-100 text-gray-700"
                aria-label="Open sidebar"
                onClick={() => setSidebarOpen(true)}
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 hidden sm:block">Planner</h1>
            </div>

            {/* Middle: Search (full-width on mobile) */}
            <div className="relative flex-1 min-w-[200px] w-full order-last sm:order-none">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search workspaces, people, or content..."
                className="pl-12 pr-4 py-2.5 w-full sm:w-96 bg-gray-100 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>

            {/* Right: Date/Time + User */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-right px-3 py-2 bg-gray-50 rounded-xl hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">
                  {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-gray-500">
                  {currentTime.toLocaleDateString('en-US', { weekday: 'long' })}
                </p>
              </div>
              <button className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                <BellIcon className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3 border-l border-gray-200 pl-4 sm:pl-6">
                <button 
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-3 hover:bg-gray-50 rounded-xl px-3 py-2 transition-colors"
                >
                  <div className="w-11 h-11 bg-blue-500 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-blue-100">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-base font-semibold">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </button>
                <button 
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:block w-72 bg-white shadow-sm h-screen sticky top-0 border-r border-gray-200">
          <nav className="p-6 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === 'messages';
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 font-medium'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-base">{item.name}</span>
                  {item.id === 'connections' && pendingRequestsCount > 0 && (
                    <span className="ml-auto bg-red-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold">
                      {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)}></div>
            <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl border-r border-gray-200 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">P</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">Planner</span>
                </div>
                <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(false)}>
                  <XMarkIcon className="w-6 h-6 text-gray-700" />
                </button>
              </div>
              <nav className="space-y-1">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const handleClick = () => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  };
                  return (
                    <button
                      key={item.id}
                      onClick={handleClick}
                      className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl text-left transition-all ${
                        item.id === 'messages'
                          ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50 font-medium'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-base">{item.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content - Messages */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 flex">
      {/* Sidebar - Conversations List */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                title="Create Group"
              >
                <UserGroupIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowSearchModal(true)}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Start Chat"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : allConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500">No conversations yet</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start a chat
                </button>
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <UserGroupIcon className="w-5 h-5" />
                  Create Group
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Combined list - Groups and Direct Messages sorted by last message */}
              {allConversations.map((item) => {
                const isGroup = item.type === 'group';
                
                if (isGroup) {
                  // Group item
                  const group = item;
                  
                  // Get unread count for group
                  const groupUnreadCount = group.unreadCount ? (group.unreadCount[user._id] || 0) : 0;
                  
                  // Format last message with sender name for groups
                  const formatGroupLastMessage = () => {
                    if (!group.lastMessage) return `${group.members?.length || 0} members`;
                    
                    if (group.lastMessageSender) {
                      const isMe = group.lastMessageSender._id === user._id;
                      const senderName = isMe ? 'Me' : group.lastMessageSender.firstName;
                      return `${senderName}: ${group.lastMessage}`;
                    }
                    return group.lastMessage;
                  };
                  
                  return (
                    <button
                      key={`group-${group._id}`}
                      onClick={() => handleSelectGroup(group)}
                      className={`w-full p-4 hover:bg-gray-50 border-b border-gray-100 flex items-start space-x-3 transition-colors ${
                        selectedGroupId === group._id ? 'bg-green-50' : ''
                      }`}
                    >
                      {/* Group Icon */}
                      <div className="flex-shrink-0 relative">
                        <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white">
                          <UserGroupIcon className="w-6 h-6" />
                        </div>
                        {groupUnreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {groupUnreadCount > 9 ? '9+' : groupUnreadCount}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`${groupUnreadCount > 0 ? 'font-semibold text-gray-900' : 'font-normal text-gray-700'}`}>
                            {group.name}
                          </p>
                          <span className="text-xs text-gray-500">
                            {group.lastMessageAt && moment(group.lastMessageAt).fromNow()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${groupUnreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                            {formatGroupLastMessage()}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                } else {
                  // Direct Message item
                  const conversation = item;
                  const otherUser = getOtherUser(conversation);
                  const unreadCount = getUnreadCount(conversation);
                  
                  // Format last message with sender name
                  const formatLastMessage = () => {
                    if (!conversation.lastMessage) return 'No messages yet';
                    
                    if (conversation.lastMessageSender) {
                      const isMe = conversation.lastMessageSender._id === user._id;
                      const senderName = isMe ? 'Me' : conversation.lastMessageSender.firstName;
                      return `${senderName}: ${conversation.lastMessage}`;
                    }
                    return conversation.lastMessage;
                  };
                  
                  return (
                    <button
                      key={conversation._id}
                      onClick={() => handleSelectConversation(otherUser)}
                      className={`w-full p-4 hover:bg-gray-50 border-b border-gray-100 flex items-start space-x-3 transition-colors ${
                        selectedUserId === otherUser._id ? 'bg-blue-50' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0 relative">
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
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`${unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-normal text-gray-700'}`}>
                            {otherUser.firstName} {otherUser.lastName}
                          </p>
                          <span className="text-xs text-gray-500">
                            {moment(conversation.lastMessageAt).fromNow()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${unreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                            {formatLastMessage()}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                }
              })}
            </>
          )}
        </div>
      </div>

      {/* Chat Room - Right Side */}
      <div className="flex-1 flex flex-col bg-gray-50 h-screen">
        {!selectedUserId && !selectedGroupId ? (
          <div className="flex items-center justify-center h-full">
            {/* Empty when no conversation selected */}
          </div>
        ) : (
          <>
            {/* Chat Header - Fixed */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4" style={{ backgroundColor: (selectedGroup ? '#10b981' : conversationSettings.themeColor) + '10' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {selectedGroup ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white">
                        <UserGroupIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {selectedGroup.name}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {selectedGroup.members?.length || 0} members
                        </p>
                      </div>
                    </>
                  ) : selectedUser && (
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
                  {/* Pinned Messages Button */}
                  <button
                    onClick={() => setShowPinnedMessages(true)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
                    title="Pinned messages"
                  >
                    <BookmarkIcon className="w-5 h-5 text-gray-600" />
                    {messages.filter(m => m.isPinned).length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {messages.filter(m => m.isPinned).length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setShowMessageSearch(true)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Search messages"
                  >
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-600" />
                  </button>
                  {!selectedGroup && (
                    <button
                      onClick={() => setShowSettings(true)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="Settings"
                    >
                      <Cog6ToothIcon className="w-5 h-5 text-gray-600" />
                    </button>
                  )}
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
                  // System notification messages
                  if (message.isSystemMessage) {
                    console.log('🔔 Rendering system message:', message.content);
                    
                    // Handler to jump to related message
                    const handleNotificationClick = () => {
                      if (message.relatedMessage) {
                        const messageElement = document.getElementById(`message-${message.relatedMessage}`);
                        if (messageElement) {
                          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          // Add highlight effect
                          messageElement.classList.add('ring-4', 'ring-yellow-300', 'bg-yellow-50');
                          setTimeout(() => {
                            messageElement.classList.remove('ring-4', 'ring-yellow-300', 'bg-yellow-50');
                          }, 2000);
                        }
                      }
                    };
                    
                    return (
                      <div
                        key={message._id}
                        id={`message-${message._id}`}
                        className="flex items-center justify-center py-3 px-4"
                      >
                        <button
                          onClick={handleNotificationClick}
                          className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-full shadow-sm hover:bg-blue-100 hover:shadow-md transition-all cursor-pointer"
                        >
                          <p className="text-sm text-blue-700 font-medium text-center">
                            {message.content}
                          </p>
                        </button>
                      </div>
                    );
                  }

                  // Regular messages
                  const isOwn = message.sender._id === user._id;
                  const showAvatar = index === 0 || messages[index - 1].sender._id !== message.sender._id;
                  const showSenderName = !isOwn; // Show sender name for all messages from others
                  const userReaction = message.reactions?.find(r => {
                    const reactionUserId = typeof r.user === 'object' ? r.user._id : r.user;
                    return reactionUserId === user._id;
                  });
                  
                  return (
                    <div
                      key={message._id}
                      id={`message-${message._id}`}
                      className={`flex items-end space-x-2 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''} group transition-all duration-300 rounded-lg px-2 py-1`}
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
                            message.sender.avatar ? (
                              <img src={message.sender.avatar} alt={message.sender.firstName} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-semibold">
                                {message.sender.firstName?.[0]}{message.sender.lastName?.[0]}
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
                            {/* Sender name - show for all messages */}
                            <p className={`text-xs font-semibold mb-1 ${isOwn ? 'text-white/90' : 'text-gray-600'}`}>
                              {isOwn ? 'Me' : `${message.sender.firstName} ${message.sender.lastName}`}
                            </p>
                            
                            {/* Check if message is a GIF */}
                            {message.content?.startsWith('[GIF]') ? (
                              <div className="mt-1">
                                <img 
                                  src={message.content.replace('[GIF]', '')} 
                                  alt="GIF"
                                  className="max-w-xs rounded-lg"
                                  style={{ maxHeight: '200px' }}
                                />
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            )}
                            
                            {/* Attachments */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {message.attachments.map((attachment, idx) => {
                                  const isImage = attachment.mimetype?.startsWith('image/');
                                  const isVideo = attachment.mimetype?.startsWith('video/');
                                  
                                  if (isImage) {
                                    return (
                                      <div key={idx} className="mt-2">
                                        <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                          <img 
                                            src={attachment.url} 
                                            alt={attachment.filename}
                                            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            style={{ maxHeight: '300px' }}
                                          />
                                        </a>
                                        <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                                          {attachment.filename}
                                        </p>
                                      </div>
                                    );
                                  }
                                  
                                  if (isVideo) {
                                    return (
                                      <div key={idx} className="mt-2">
                                        <video 
                                          controls 
                                          className="max-w-xs rounded-lg"
                                          style={{ maxHeight: '300px' }}
                                        >
                                          <source src={attachment.url} type={attachment.mimetype} />
                                          Your browser does not support the video tag.
                                        </video>
                                        <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                                          {attachment.filename}
                                        </p>
                                      </div>
                                    );
                                  }
                                  
                                  // Default file display
                                  return (
                                    <a
                                      key={idx}
                                      href={attachment.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center space-x-2 p-2 rounded-lg ${
                                        isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-100 hover:bg-gray-200'
                                      } transition-colors`}
                                    >
                                      <DocumentTextIcon className={`w-5 h-5 flex-shrink-0 ${
                                        isOwn ? 'text-white' : 'text-gray-600'
                                      }`} />
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-medium truncate ${
                                          isOwn ? 'text-white' : 'text-gray-900'
                                        }`}>
                                          {attachment.filename}
                                        </p>
                                        <p className={`text-xs ${
                                          isOwn ? 'text-white/70' : 'text-gray-500'
                                        }`}>
                                          {(attachment.size / 1024).toFixed(1)} KB
                                        </p>
                                      </div>
                                    </a>
                                  );
                                })}
                              </div>
                            )}
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

                        {/* Timestamp and Read Receipts */}
                        <div className={`mt-1 flex items-center space-x-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <p className="text-xs text-gray-500">
                            {formatTime(message.createdAt)}
                          </p>
                          
                          {/* Read receipts with avatars */}
                          {isOwn && message.readBy && message.readBy.length > 0 && (
                            <div className="flex items-center -space-x-1">
                              {message.readBy.slice(0, 3).map((read, idx) => (
                                <div
                                  key={read.user?._id || idx}
                                  className="relative"
                                  title={`Read by ${read.user?.firstName || 'Unknown'} ${read.user?.lastName || ''}`}
                                >
                                  {read.user?.avatar ? (
                                    <img
                                      src={read.user.avatar}
                                      alt={read.user.firstName}
                                      className="w-4 h-4 rounded-full border border-white"
                                    />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full bg-blue-500 border border-white flex items-center justify-center text-[8px] text-white font-semibold">
                                      {read.user?.firstName?.[0]}{read.user?.lastName?.[0]}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {message.readBy.length > 3 && (
                                <div className="w-4 h-4 rounded-full bg-gray-300 border border-white flex items-center justify-center text-[8px] text-gray-600 font-semibold">
                                  +{message.readBy.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Sent indicator */}
                          {isOwn && (!message.readBy || message.readBy.length === 0) && (
                            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
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
                  <span>
                    {selectedGroup ? 'Someone' : selectedUser?.firstName} is typing...
                  </span>
                </div>
              </div>
            )}

            {/* Input Form - Fixed */}
            <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
              {/* GIF Picker */}
              {showGifPicker && (
                <div className="gif-picker-container mb-3 p-4 bg-white rounded-lg border-2 border-purple-200 shadow-lg max-h-96 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <GifIcon className="w-5 h-5 text-purple-600" />
                      Send GIF
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowGifPicker(false);
                        setGifSearchQuery('');
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Search Input */}
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Search GIFs..."
                      value={gifSearchQuery}
                      onChange={(e) => {
                        setGifSearchQuery(e.target.value);
                        searchGifs(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>

                  {/* GIFs Grid */}
                  <div className="flex-1 overflow-y-auto">
                    {loadingGifs ? (
                      <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {gifs.map((gif) => (
                          <button
                            key={gif.id}
                            type="button"
                            onClick={() => handleSendGif(gif.images.fixed_height.url)}
                            className="relative rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all group"
                          >
                            <img
                              src={gif.images.fixed_height_small.url}
                              alt={gif.title}
                              className="w-full h-32 object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all"></div>
                          </button>
                        ))}
                      </div>
                    )}
                    {!loadingGifs && gifs.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <GifIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No GIFs found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* File Preview */}
              {selectedFiles.length > 0 && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      📎 {selectedFiles.length} file(s) • {(selectedFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedFiles([])}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove all
                    </button>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedFiles.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="flex items-center justify-between text-xs bg-white p-2 rounded shadow-sm">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <DocumentTextIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="truncate font-medium">{file.name}</span>
                          <span className="text-gray-400 text-xs">•</span>
                          <span className="text-gray-500 whitespace-nowrap">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="ml-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                {/* Image Upload Button */}
                <label className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors" title="Send images">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*"
                    disabled={sending || selectedFiles.length >= 5}
                  />
                  <PhotoIcon className={`w-5 h-5 ${
                    selectedFiles.length >= 5 ? 'text-gray-300' : 'text-green-600'
                  }`} />
                </label>

                {/* File Upload Button */}
                <label className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors" title="Attach files">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                    disabled={sending || selectedFiles.length >= 5}
                  />
                  <PaperClipIcon className={`w-5 h-5 ${
                    selectedFiles.length >= 5 ? 'text-gray-300' : 'text-blue-600'
                  }`} />
                </label>

                {/* GIF Button */}
                <button
                  type="button"
                  onClick={() => setShowGifPicker(!showGifPicker)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Send GIF"
                >
                  <GifIcon className="w-5 h-5 text-purple-600" />
                </button>
                
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
                  disabled={(!newMessage.trim() && selectedFiles.length === 0) || sending}
                  className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <PaperAirplaneIcon className="w-5 h-5" />
                  )}
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
              <div className="relative">
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
              <p className="text-xs text-gray-500 mt-2">Type to search in real-time</p>
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

      {/* Pinned Messages Modal */}
      {showPinnedMessages && (selectedUser || selectedGroup) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50">
          <div className="bg-white h-full w-full max-w-md shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-yellow-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                <BookmarkIconSolid className="w-6 h-6 text-yellow-600" />
                <span>Pinned Messages</span>
              </h3>
              <button
                onClick={() => setShowPinnedMessages(false)}
                className="p-2 hover:bg-yellow-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Pinned Messages List */}
            <div className="flex-1 overflow-y-auto p-6">
              {messages.filter(m => m.isPinned).length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <BookmarkIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">No pinned messages</p>
                  <p className="text-sm">Pin important messages to find them easily later</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages
                    .filter(m => m.isPinned)
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((message) => {
                      const isOwn = message.sender._id === user._id;
                      return (
                        <button
                          key={message._id}
                          onClick={() => {
                            handleJumpToMessage(message._id);
                            setShowPinnedMessages(false);
                          }}
                          className="w-full p-4 hover:bg-yellow-50 rounded-xl border-2 border-yellow-200 text-left transition-all hover:shadow-md group relative"
                        >
                          {/* Pin indicator */}
                          <div className="absolute top-3 right-3">
                            <BookmarkIconSolid className="w-5 h-5 text-yellow-500" />
                          </div>

                          <div className="flex items-start space-x-3">
                            {isOwn ? (
                              user.avatar ? (
                                <img src={user.avatar} alt="You" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </div>
                              )
                            ) : (
                              message.sender?.avatar ? (
                                <img src={message.sender.avatar} alt={message.sender.firstName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                                  {message.sender?.firstName?.[0]}{message.sender?.lastName?.[0]}
                                </div>
                              )
                            )}
                            <div className="flex-1 min-w-0 pr-6">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-900">
                                  {isOwn ? 'You' : `${message.sender.firstName} ${message.sender.lastName}`}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatTime(message.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words line-clamp-3">
                                {message.content}
                              </p>
                              
                              {/* Reactions if any */}
                              {message.reactions && message.reactions.length > 0 && (
                                <div className="flex items-center space-x-1 mt-2">
                                  {Object.entries(
                                    message.reactions.reduce((acc, r) => {
                                      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                      return acc;
                                    }, {})
                                  ).map(([emoji, count]) => (
                                    <span
                                      key={emoji}
                                      className="px-2 py-0.5 rounded-full text-xs bg-gray-100 border border-gray-300"
                                    >
                                      {emoji} {count}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Click to view hint */}
                              <div className="mt-2 text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Click to view in conversation →
                              </div>
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

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Create Group</h3>
                <button
                  onClick={() => {
                    setShowCreateGroupModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Group Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter group name..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    id="groupName"
                  />
                </div>

                {/* Group Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    placeholder="What's this group about?"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    rows="3"
                    id="groupDescription"
                  />
                </div>

                {/* Search Members */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Members
                  </label>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Selected Members */}
                <div className="flex flex-wrap gap-2" id="selectedMembers">
                  {/* Will be populated by selected users */}
                </div>

                {/* Search Results */}
                {searchQuery.length >= 2 && (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    {searching ? (
                      <div className="p-4 text-center text-gray-500">Searching...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">No users found</div>
                    ) : (
                      searchResults.map(searchUser => (
                        <button
                          key={searchUser._id}
                          onClick={() => {
                            const selected = document.getElementById('selectedMembers');
                            const existing = document.getElementById(`member-${searchUser._id}`);
                            if (!existing) {
                              const badge = document.createElement('div');
                              badge.id = `member-${searchUser._id}`;
                              badge.className = 'flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm';
                              badge.innerHTML = `
                                <span>${searchUser.firstName} ${searchUser.lastName}</span>
                                <button onclick="this.parentElement.remove()" class="hover:text-green-900">
                                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                  </svg>
                                </button>
                              `;
                              badge.dataset.userId = searchUser._id;
                              selected.appendChild(badge);
                            }
                          }}
                          className="w-full p-3 hover:bg-gray-50 flex items-center space-x-3 border-b border-gray-100 transition-colors"
                        >
                          {searchUser.avatar ? (
                            <img
                              src={searchUser.avatar}
                              alt={searchUser.firstName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
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
                )}

                {/* Create Button */}
                <button
                  onClick={async () => {
                    const name = document.getElementById('groupName').value;
                    const description = document.getElementById('groupDescription').value;
                    const memberElements = document.getElementById('selectedMembers').children;
                    const memberIds = Array.from(memberElements).map(el => el.dataset.userId);

                    if (!name || memberIds.length === 0) {
                      showWarning('Please enter group name and add at least one member');
                      return;
                    }

                    try {
                      await groupService.createGroup(name, description, memberIds);
                      setShowCreateGroupModal(false);
                      setSearchQuery('');
                      setSearchResults([]);
                      fetchConversations();
                    } catch (error) {
                      console.error('Error creating group:', error);
                      showError('Failed to create group');
                    }
                  }}
                  className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Create Group
                </button>
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
