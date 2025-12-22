import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import messageService from '../services/messageService';
import socketService from '../services/socketService';
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  EllipsisVerticalIcon,
  HomeIcon,
  BriefcaseIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  BellIcon,
  Cog6ToothIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import moment from 'moment';

const ChatRoom = () => {
  const { userId: otherUserId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef(null);
  const messagesTopRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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
    fetchMessages();
    
    // Socket already connected via SocketProvider
    // User room is auto-joined by server

    // Get socket instance for listeners
    const socket = socketService.socket;
    if (!socket) {
      console.warn('⚠️ Socket not yet connected');
      return;
    }

    // Define handlers inline to capture latest state
    const onNewMessage = (message) => {
      console.log('📨 Received new message:', message);
      // Only add if it's for this conversation
      if (
        (message.sender._id === otherUserId && message.receiver._id === user._id) ||
        (message.sender._id === user._id && message.receiver._id === otherUserId)
      ) {
        console.log('✅ Message is for this conversation, adding to state');
        setMessages(prev => [...prev, message]);
        
        // Mark as read if receiver
        if (message.receiver._id === user._id) {
          messageService.markConversationAsRead(otherUserId);
        }
      } else {
        console.log('⚠️ Message not for this conversation, ignoring');
      }
    };

    const onUserTyping = ({ userId }) => {
      if (userId === otherUserId) {
        setIsTyping(true);
      }
    };

    const onUserStopTyping = ({ userId }) => {
      if (userId === otherUserId) {
        setIsTyping(false);
      }
    };

    const onMessageRead = ({ messageId }) => {
      console.log('✅ Message read:', messageId);
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, readAt: new Date() } : msg
      ));
    };

    const onConversationRead = ({ userId }) => {
      console.log('✅ Conversation read by:', userId);
      if (userId === otherUserId) {
        setMessages(prev => prev.map(msg => 
          msg.sender._id === user._id && !msg.readAt ? { ...msg, readAt: new Date() } : msg
        ));
      }
    };

    // Listen for new messages
    socket.on('new-message', onNewMessage);
    socket.on('user-typing', onUserTyping);
    socket.on('user-stop-typing', onUserStopTyping);
    socket.on('message-read', onMessageRead);
    socket.on('conversation-read', onConversationRead);

    // Mark conversation as read
    messageService.markConversationAsRead(otherUserId);

    return () => {
      console.log('🔴 Cleaning up socket listeners');
      socket.off('new-message', onNewMessage);
      socket.off('user-typing', onUserTyping);
      socket.off('user-stop-typing', onUserStopTyping);
      socket.off('message-read', onMessageRead);
      socket.off('conversation-read', onConversationRead);
    };
  }, [otherUserId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      const skip = loadMore ? messages.length : 0;
      const limit = 30;
      const response = await messageService.getMessages(otherUserId, limit, skip);
      const newMessages = response.data || [];
      
      if (loadMore) {
        setMessages(prev => [...newMessages, ...prev]);
        setHasMore(newMessages.length === limit);
      } else {
        setMessages(newMessages);
        setHasMore(newMessages.length === limit);
      }
      
      // Get other user info from first message
      if (newMessages.length > 0) {
        const firstMessage = newMessages[0];
        const other = firstMessage.sender._id === user._id 
          ? firstMessage.receiver 
          : firstMessage.sender;
        setOtherUser(other);
      } else if (!otherUser) {
        // If no messages, we need to fetch user info separately
        // For now, just set basic info
        setOtherUser({ _id: otherUserId });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!hasMore || loadingMore) return;
    await fetchMessages(true);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const response = await messageService.sendMessage(otherUserId, newMessage.trim());
      
      // ✅ Immediately add message to state (optimistic update)
      if (response.data) {
        setMessages(prev => [...prev, response.data]);
        console.log('✅ Message added to state immediately:', response.data);
      }
      
      setNewMessage('');
      
      // Stop typing indicator
      if (socketService.socket) {
        socketService.socket.emit('stop-typing', { senderId: user._id, receiverId: otherUserId });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (!socketService.socket) return;
    
    socketService.socket.emit('typing', { senderId: user._id, receiverId: otherUserId });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (socketService.socket) {
        socketService.socket.emit('stop-typing', { senderId: user._id, receiverId: otherUserId });
      }
    }, 1000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

      <div className="flex" style={{ height: 'calc(100vh - 73px)' }}>
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm border-r border-gray-200">
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

        {/* Chat Room */}
        <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/messages')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            
            {otherUser && (
              <>
                {otherUser.avatar ? (
                  <img
                    src={otherUser.avatar}
                    alt={`${otherUser.firstName} ${otherUser.lastName}`}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                    {otherUser.firstName?.[0]}{otherUser.lastName?.[0]}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {otherUser.firstName} {otherUser.lastName}
                  </h2>
                  {isTyping && (
                    <p className="text-sm text-blue-600">typing...</p>
                  )}
                </div>
              </>
            )}
          </div>

          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Load More Button */}
        {!loading && hasMore && messages.length > 0 && (
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
        
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.sender._id === user._id;
            const showAvatar = index === 0 || messages[index - 1].sender._id !== message.sender._id;
            
            return (
              <div
                key={message._id}
                className={`flex items-end space-x-2 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {showAvatar ? (
                    isOwn ? (
                      user.avatar ? (
                        <img
                          src={user.avatar}
                          alt="You"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                      )
                    ) : (
                      otherUser?.avatar ? (
                        <img
                          src={otherUser.avatar}
                          alt={otherUser.firstName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-semibold">
                          {otherUser?.firstName?.[0]}{otherUser?.lastName?.[0]}
                        </div>
                      )
                    )
                  ) : (
                    <div className="w-8 h-8"></div>
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-md ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      isOwn
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
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

      {/* Typing Indicator */}
      {isTyping && (
        <div className="px-6 py-2 bg-gray-50">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span>{otherUser?.firstName} is typing...</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
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
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
