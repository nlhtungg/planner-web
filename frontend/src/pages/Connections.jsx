import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConnection } from '../context/ConnectionContext';
import connectionService from '../services/connectionService';
import messageService from '../services/messageService';
import socketService from '../services/socketService';
import ToastContainer from '../components/ToastContainer';
import useToast from '../utils/useToast';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  UserPlusIcon,
  CheckIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  HomeIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  BellIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import moment from 'moment';

const Connections = () => {
  const { user, logout } = useAuth();
  const { pendingRequestsCount: globalPendingCount, refreshCount } = useConnection();
  const navigate = useNavigate();
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('friends'); // friends, requests, sent, suggestions, blocked
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data states
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  
  // UI states
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, type: 'danger' });

  useEffect(() => {
    fetchAllData();
  }, []);

  // Socket listeners
  useEffect(() => {
    const socket = socketService.connect();

    socket.on('friend-request-received', (data) => {
      console.log('Friend request received:', data);
      fetchAllData();
    });

    socket.on('friend-request-accepted', (data) => {
      console.log('Friend request accepted:', data);
      fetchAllData();
    });

    socket.on('friend-request-rejected', (data) => {
      console.log('Friend request rejected:', data);
      fetchAllData();
    });

    socket.on('friend-request-cancelled', (data) => {
      console.log('Friend request cancelled:', data);
      fetchAllData();
    });

    socket.on('friend-removed', (data) => {
      console.log('Friend removed:', data);
      fetchAllData();
    });

    socket.on('user-blocked', (data) => {
      console.log('User blocked:', data);
      fetchAllData();
    });

    socket.on('user-unblocked', (data) => {
      console.log('User unblocked:', data);
      fetchAllData();
    });

    return () => {
      socket.off('friend-request-received');
      socket.off('friend-request-accepted');
      socket.off('friend-request-rejected');
      socket.off('friend-request-cancelled');
      socket.off('friend-removed');
      socket.off('user-blocked');
      socket.off('user-unblocked');
    };
  }, []);

  const fetchAllData = async () => {
    try {
      // Fetch all data in parallel for real-time counts
      const [friendsRes, requestsRes, sentRes, suggestionsRes, blockedRes] = await Promise.all([
        connectionService.getFriends(),
        connectionService.getPendingRequests(),
        connectionService.getSentRequests(),
        connectionService.getSuggestions(),
        connectionService.getBlockedUsers()
      ]);

      setFriends(friendsRes.data || []);
      setPendingRequests(requestsRes.data || []);
      setSentRequests(sentRes.data || []);
      setSuggestions(suggestionsRes.data || []);
      setBlockedUsers(blockedRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const handleAction = async (action, id) => {
    setActionLoading({ ...actionLoading, [id]: true });
    try {
      switch (action) {
        case 'accept':
          await connectionService.acceptRequest(id);
          showSuccess('Friend request accepted!');
          refreshCount();
          break;
        case 'reject':
          await connectionService.rejectRequest(id);
          showSuccess('Friend request rejected');
          refreshCount();
          break;
        case 'cancel':
          await connectionService.cancelRequest(id);
          showSuccess('Friend request cancelled');
          break;
        case 'unfriend':
          await connectionService.unfriend(id);
          showSuccess('Friend removed');
          break;
        case 'block':
          await connectionService.blockUser(id);
          showSuccess('User blocked');
          break;
        case 'unblock':
          await connectionService.unblockUser(id);
          showSuccess('User unblocked');
          break;
        case 'send':
          await connectionService.sendRequest(id);
          showSuccess('Friend request sent!');
          break;
      }
      fetchAllData();
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      // Don't show notification for "already sent" errors
      const errorMessage = error.response?.data?.message || 'Action failed';
      if (!errorMessage.toLowerCase().includes('already sent') && 
          !errorMessage.toLowerCase().includes('already exists')) {
        showError(errorMessage);
      }
    } finally {
      setActionLoading({ ...actionLoading, [id]: false });
    }
  };

  const handleMessage = (friend) => {
    navigate('/messages', { state: { selectUser: friend } });
  };

  const showConfirmModal = (title, message, onConfirm, type = 'danger') => {
    setConfirmModal({ show: true, title, message, onConfirm, type });
  };

  const pendingRequestsCount = pendingRequests.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo and Search */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Planner</h1>
            </div>
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search workspaces, people, or content..."
                className="pl-10 pr-4 py-2 w-96 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* User Menu */}
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
                onClick={() => logout()}
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
            <button
              onClick={() => navigate('/home')}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-700 hover:bg-gray-100"
            >
              <HomeIcon className="w-5 h-5" />
              <span className="font-medium">Home</span>
            </button>
            <button
              onClick={() => navigate('/workspaces')}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-700 hover:bg-gray-100"
            >
              <BriefcaseIcon className="w-5 h-5" />
              <span className="font-medium">Workspaces</span>
            </button>
            <button
              onClick={() => navigate('/connections')}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors bg-blue-50 text-blue-700 border-r-2 border-blue-700"
            >
              <UserGroupIcon className="w-5 h-5" />
              <span className="font-medium">Connections</span>
              {pendingRequestsCount > 0 && (
                <span className="ml-auto bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/messages')}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-700 hover:bg-gray-100"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              <span className="font-medium">Messages</span>
            </button>
            <button
              onClick={() => navigate('/calendar')}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-700 hover:bg-gray-100"
            >
              <CalendarDaysIcon className="w-5 h-5" />
              <span className="font-medium">Calendar</span>
            </button>
          </nav>

          {/* Quick Actions */}
          <div className="p-4 border-t border-gray-200 mt-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={() => navigate('/workspaces')}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <BriefcaseIcon className="w-4 h-4" />
                <span>New Workspace</span>
              </button>
              <button 
                onClick={() => setShowSearchModal(true)}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <UserPlusIcon className="w-4 h-4" />
                <span>Add Friend</span>
              </button>
              <button 
                onClick={() => navigate('/messages')}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                <span>Messages</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Connections</h1>
                  <p className="text-gray-600 mt-1">Manage your network</p>
                </div>
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <UserPlusIcon className="w-5 h-5" />
                  Add Friend
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('friends')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'friends'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Friends ({friends.length})
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`relative px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'requests'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Requests ({pendingRequests.length})
                  {pendingRequestsCount > 0 && (
                    <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('sent')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'sent'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Sent ({sentRequests.length})
                </button>
                <button
                  onClick={() => setActiveTab('suggestions')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'suggestions'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Suggestions ({suggestions.length})
                </button>
                <button
                  onClick={() => setActiveTab('blocked')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'blocked'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Blocked ({blockedUsers.length})
                </button>
              </nav>
            </div>
          </div>

            {/* Content */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
              <>
                {/* Friends Tab */}
                {activeTab === 'friends' && (
                  friends.length === 0 ? (
                    <div className="text-center py-12">
                      <UserGroupIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No friends yet</p>
                      <button
                        onClick={() => setShowSearchModal(true)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Find Friends
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {friends.map((friend) => (
                        <div key={friend._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative">
                          <div className="flex items-start gap-3">
                            {friend.avatar ? (
                              <img src={friend.avatar} alt={friend.firstName} className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                {friend.firstName?.[0]}{friend.lastName?.[0]}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {friend.firstName} {friend.lastName}
                              </h3>
                              <p className="text-sm text-gray-500 truncate">{friend.email}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                Friends since {moment(friend.connectedAt).format('MMM YYYY')}
                              </p>
                            </div>
                            {/* Dropdown Menu */}
                            <div className="relative">
                              <button
                                onClick={() => setDropdownOpen(dropdownOpen === friend._id ? null : friend._id)}
                                className="p-1 hover:bg-gray-100 rounded-lg"
                              >
                                <EllipsisVerticalIcon className="w-5 h-5 text-gray-500" />
                              </button>
                              {dropdownOpen === friend._id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(null)}></div>
                                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                    <button
                                      onClick={() => {
                                        handleMessage(friend);
                                        setDropdownOpen(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                      <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                      Send Message
                                    </button>
                                    <button
                                      onClick={() => {
                                        navigate(`/profile/${friend._id}`);
                                        setDropdownOpen(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                      <UserGroupIcon className="w-4 h-4" />
                                      View Profile
                                    </button>
                                    <hr className="my-1" />
                                    <button
                                      onClick={() => {
                                        setDropdownOpen(null);
                                        showConfirmModal(
                                          'Unfriend User',
                                          `Are you sure you want to unfriend ${friend.firstName} ${friend.lastName}?`,
                                          () => handleAction('unfriend', friend._id)
                                        );
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                      <XMarkIcon className="w-4 h-4" />
                                      Unfriend
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDropdownOpen(null);
                                        showConfirmModal(
                                          'Block User',
                                          `Are you sure you want to block ${friend.firstName} ${friend.lastName}? This will remove them from your friends list and prevent them from contacting you.`,
                                          () => handleAction('block', friend._id),
                                          'danger'
                                        );
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <NoSymbolIcon className="w-4 h-4" />
                                      Block User
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Requests Tab */}
                {activeTab === 'requests' && (
                  pendingRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No pending requests</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingRequests.map((request) => (
                        <div key={request._id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {request.requester.avatar ? (
                              <img src={request.requester.avatar} alt={request.requester.firstName} className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                {request.requester.firstName?.[0]}{request.requester.lastName?.[0]}
                              </div>
                            )}
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {request.requester.firstName} {request.requester.lastName}
                              </h3>
                              <p className="text-sm text-gray-500">{request.requester.email}</p>
                              <p className="text-xs text-gray-400 mt-1">{moment(request.createdAt).fromNow()}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction('accept', request._id)}
                              disabled={actionLoading[request._id]}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                            >
                              <CheckIcon className="w-4 h-4" />
                              Accept
                            </button>
                            <button
                              onClick={() => handleAction('reject', request._id)}
                              disabled={actionLoading[request._id]}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                            >
                              <XMarkIcon className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Sent Tab */}
                {activeTab === 'sent' && (
                  sentRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No sent requests</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sentRequests.map((request) => (
                        <div key={request._id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {request.recipient.avatar ? (
                              <img src={request.recipient.avatar} alt={request.recipient.firstName} className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                {request.recipient.firstName?.[0]}{request.recipient.lastName?.[0]}
                              </div>
                            )}
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {request.recipient.firstName} {request.recipient.lastName}
                              </h3>
                              <p className="text-sm text-gray-500">{request.recipient.email}</p>
                              <p className="text-xs text-gray-400 mt-1">Sent {moment(request.createdAt).fromNow()}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAction('cancel', request._id)}
                            disabled={actionLoading[request._id]}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Suggestions Tab */}
                {activeTab === 'suggestions' && (
                  suggestions.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No suggestions available</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {suggestions.map((suggestion) => (
                        <div key={suggestion._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow relative">
                          <div className="flex items-start gap-3">
                            {suggestion.avatar ? (
                              <img src={suggestion.avatar} alt={suggestion.firstName} className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                {suggestion.firstName?.[0]}{suggestion.lastName?.[0]}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {suggestion.firstName} {suggestion.lastName}
                              </h3>
                              <p className="text-sm text-gray-500 truncate">{suggestion.email}</p>
                              {suggestion.mutualFriends > 0 && (
                                <p className="text-xs text-blue-600 mt-1">
                                  {suggestion.mutualFriends} mutual friend{suggestion.mutualFriends > 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                            {/* Dropdown Menu */}
                            <div className="relative">
                              <button
                                onClick={() => setDropdownOpen(dropdownOpen === suggestion._id ? null : suggestion._id)}
                                className="p-1 hover:bg-gray-100 rounded-lg"
                              >
                                <EllipsisVerticalIcon className="w-5 h-5 text-gray-500" />
                              </button>
                              {dropdownOpen === suggestion._id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(null)}></div>
                                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                    <button
                                      onClick={() => {
                                        navigate(`/profile/${suggestion._id}`);
                                        setDropdownOpen(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                    >
                                      <UserGroupIcon className="w-4 h-4" />
                                      View Profile
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDropdownOpen(null);
                                        showConfirmModal(
                                          'Block User',
                                          `Are you sure you want to block ${suggestion.firstName} ${suggestion.lastName}? They won't be able to contact you or see your profile.`,
                                          () => handleAction('block', suggestion._id),
                                          'danger'
                                        );
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <NoSymbolIcon className="w-4 h-4" />
                                      Block User
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => {
                                showConfirmModal(
                                  'Send Friend Request',
                                  `Send a friend request to ${suggestion.firstName} ${suggestion.lastName}?`,
                                  () => handleAction('send', suggestion._id),
                                  'success'
                                );
                              }}
                              disabled={actionLoading[suggestion._id]}
                              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center justify-center gap-1"
                            >
                              <UserPlusIcon className="w-4 h-4" />
                              Add Friend
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* Blocked Tab */}
                {activeTab === 'blocked' && (
                  blockedUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No blocked users</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {blockedUsers.map((blocked) => (
                        <div key={blocked._id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {blocked.avatar ? (
                                <img src={blocked.avatar} alt={blocked.firstName} className="w-12 h-12 rounded-full object-cover" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold">
                                  {blocked.firstName?.[0]}{blocked.lastName?.[0]}
                                </div>
                              )}
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {blocked.firstName} {blocked.lastName}
                                </h3>
                                <p className="text-sm text-gray-500">{blocked.email}</p>
                                <p className="text-xs text-gray-400 mt-1">Blocked user</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => navigate(`/profile/${blocked._id}`)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                              >
                                View Profile
                              </button>
                              <button
                                onClick={() => handleAction('unblock', blocked._id)}
                                disabled={actionLoading[blocked._id]}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                              >
                                Unblock
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </>
            )}
            </div>
          </div>
        </main>
      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Find Friends</h3>
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Search Input */}
              <div className="relative mb-4">
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
              <div className="max-h-96 overflow-y-auto">
                {searching ? (
                  <div className="p-4 text-center text-gray-500">Searching...</div>
                ) : searchResults.length === 0 ? (
                  searchQuery.length >= 2 && (
                    <div className="p-4 text-center text-gray-500">No users found</div>
                  )
                ) : (
                  searchResults.map(searchUser => (
                    <div
                      key={searchUser._id}
                      className="p-3 hover:bg-gray-50 flex items-center justify-between border-b border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        {searchUser.avatar ? (
                          <img
                            src={searchUser.avatar}
                            alt={searchUser.firstName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                            {searchUser.firstName?.[0]}{searchUser.lastName?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {searchUser.firstName} {searchUser.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{searchUser.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowSearchModal(false);
                          showConfirmModal(
                            'Send Friend Request',
                            `Send a friend request to ${searchUser.firstName} ${searchUser.lastName}?`,
                            () => {
                              handleAction('send', searchUser._id);
                              setSearchQuery('');
                              setSearchResults([]);
                            },
                            'success'
                          );
                        }}
                        disabled={actionLoading[searchUser._id]}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-start gap-4">
                {confirmModal.type === 'danger' ? (
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <NoSymbolIcon className="w-6 h-6 text-red-600" />
                  </div>
                ) : confirmModal.type === 'success' ? (
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <UserPlusIcon className="w-6 h-6 text-green-600" />
                  </div>
                ) : null}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {confirmModal.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {confirmModal.message}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end rounded-b-lg">
              <button
                onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: null })}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmModal.onConfirm) {
                    confirmModal.onConfirm();
                  }
                  setConfirmModal({ show: false, title: '', message: '', onConfirm: null });
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  confirmModal.type === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : confirmModal.type === 'success'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default Connections;
