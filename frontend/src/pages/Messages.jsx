import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import messageService from '../services/messageService';
import socketService from '../services/socketService';
import {
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import moment from 'moment';

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

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
      
      // Update conversation list directly without API call
      setConversations(prev => {
        const conversationId = message.conversationId;
        const existingIndex = prev.findIndex(conv => conv.conversationId === conversationId);
        
        if (existingIndex >= 0) {
          // Update existing conversation
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: message.content,
            lastMessageAt: message.createdAt,
            unreadCount: message.receiver._id === user._id 
              ? (updated[existingIndex].unreadCount || 0) + 1 
              : updated[existingIndex].unreadCount
          };
          
          // Move to top
          const [conversation] = updated.splice(existingIndex, 1);
          return [conversation, ...updated];
        } else {
          // New conversation - need to fetch full list
          fetchConversations();
          return prev;
        }
      });
    };

    // Listen for new messages
    socket.on('new-message', onNewMessage);

    return () => {
      socket.off('new-message', onNewMessage);
    };
  }, [user]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await messageService.getConversations();
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

  const handleStartChat = (selectedUser) => {
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
    navigate(`/messages/${selectedUser._id}`);
  };

  const getOtherUser = (conversation) => {
    return conversation.participants.find(p => p._id !== user._id);
  };

  const getUnreadCount = (conversation) => {
    return conversation.unreadCount?.get?.(user._id) || 0;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
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
                  onClick={() => navigate(`/messages/${otherUser._id}`)}
                  className="w-full p-4 hover:bg-gray-50 border-b border-gray-100 flex items-start space-x-3 transition-colors"
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

      {/* Empty State */}
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ChatBubbleLeftRightIcon className="w-24 h-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Select a conversation</h2>
          <p className="text-gray-500">Choose a conversation from the list to start messaging</p>
        </div>
      </div>

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
  );
};

export default Messages;
