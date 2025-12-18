import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConnection } from '../context/ConnectionContext';
import connectionService from '../services/connectionService';
import messageService from '../services/messageService';
import socketService from '../services/socketService';
import ToastContainer from '../components/ToastContainer';
import useToast from '../utils/useToast';
import UserProfileModal from '../components/UserProfileModal';
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
  const [activeTab, setActiveTab] = useState('myFriends'); // myFriends, findFriends, requests, sent, blocked
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
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, type: 'danger' });
  const [profileModal, setProfileModal] = useState({ show: false, userId: null });

  useEffect(() => {
    fetchAllData();
  }, []);

  // Socket listeners
  useEffect(() => {
    const socket = socketService.connect();

    socket.on('friend-request-sent', (data) => {
      console.log('Friend request sent event:', data);
      // Add to sent requests immediately (for sender)
      if (data.request) {
        setSentRequests(prev => {
          const exists = prev.find(req => req._id === data.request._id);
          if (!exists) {
            return [data.request, ...prev];
          }
          return prev;
        });
      }
    });

    socket.on('friend-request-received', (data) => {
      console.log('Friend request received:', data);
      // Add new request to pending requests immediately
      setPendingRequests(prev => {
        const exists = prev.find(req => req._id === data.request._id);
        if (!exists) {
          return [data.request, ...prev];
        }
        return prev;
      });
      refreshCount();
    });

    socket.on('friend-request-accepted', (data) => {
      console.log('Friend request accepted event:', data);
      // If I sent the request, move from sent to friends
      // If I received the request, move from pending to friends
      const friend = data.friend;
      
      if (friend && friend._id) {
        console.log('Adding friend to list:', friend);
        
        // Add to friends list immediately
        setFriends(prev => {
          const exists = prev.find(f => f._id === friend._id);
          if (!exists) {
            console.log('Friend added to list');
            return [friend, ...prev];
          }
          console.log('Friend already in list');
          return prev;
        });
        
        // Remove from sent requests
        setSentRequests(prev => prev.filter(req => req.recipient?._id !== friend._id));
        
        // Remove from pending requests
        setPendingRequests(prev => {
          const filtered = prev.filter(req => req.requester?._id !== friend._id);
          console.log('Pending requests after filter:', filtered.length);
          return filtered;
        });
        
        // Remove from suggestions
        setSuggestions(prev => prev.filter(s => s._id !== friend._id));
      }
      
      refreshCount();
    });

    socket.on('friend-request-rejected', (data) => {
      console.log('Friend request rejected:', data);
      // Remove from pending or sent requests
      setPendingRequests(prev => prev.filter(req => req._id !== data.requestId));
      setSentRequests(prev => prev.filter(req => req._id !== data.requestId));
      refreshCount();
    });

    socket.on('friend-request-cancelled', (data) => {
      console.log('Friend request cancelled:', data);
      // Remove from pending requests
      setPendingRequests(prev => prev.filter(req => req._id !== data.requestId));
      refreshCount();
    });

    socket.on('friend-removed', (data) => {
      console.log('Friend removed:', data);
      const removedUserId = data.removedUser?._id || data.userId;
      if (removedUserId) {
        // Remove from friends list immediately
        setFriends(prev => prev.filter(f => f._id !== removedUserId));
      }
    });

    socket.on('user-blocked', (data) => {
      console.log('User blocked:', data);
      const blockedUserId = data.blockedUser?._id || data.userId;
      if (blockedUserId) {
        // Remove from all lists and add to blocked
        setFriends(prev => prev.filter(f => f._id !== blockedUserId));
        setPendingRequests(prev => prev.filter(req => req.requester._id !== blockedUserId));
        setSentRequests(prev => prev.filter(req => req.recipient._id !== blockedUserId));
        setSuggestions(prev => prev.filter(s => s._id !== blockedUserId));
        
        if (data.blockedUser) {
          setBlockedUsers(prev => {
            const exists = prev.find(b => b._id === blockedUserId);
            if (!exists) {
              return [data.blockedUser, ...prev];
            }
            return prev;
          });
        }
      }
    });

    socket.on('user-unblocked', (data) => {
      console.log('User unblocked:', data);
      const unblockedUserId = data.unblockedUser?._id || data.userId;
      if (unblockedUserId) {
        // Remove from blocked list
        setBlockedUsers(prev => prev.filter(b => b._id !== unblockedUserId));
      }
    });

    return () => {
      socket.off('friend-request-sent');
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

  // Auto search when query changes (with debounce)
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch();
      } else if (searchQuery.trim().length === 0) {
        setSearchResults([]);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await messageService.searchUsers(searchQuery);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      showError('Failed to search users');
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
          
          // Update state immediately
          const acceptedRequest = pendingRequests.find(req => req._id === id);
          if (acceptedRequest) {
            // Add to friends
            setFriends(prev => [acceptedRequest.requester, ...prev]);
            // Remove from pending requests
            setPendingRequests(prev => prev.filter(req => req._id !== id));
            // Remove from suggestions
            setSuggestions(prev => prev.filter(s => s._id === acceptedRequest.requester._id));
          }
          
          refreshCount();
          break;
        case 'reject':
          await connectionService.rejectRequest(id);
          showSuccess('Friend request rejected');
          
          // Remove from pending requests immediately
          setPendingRequests(prev => prev.filter(req => req._id !== id));
          
          refreshCount();
          break;
        case 'cancel':
          await connectionService.cancelRequest(id);
          showSuccess('Friend request cancelled');
          
          // Remove from sent requests immediately
          setSentRequests(prev => prev.filter(req => req._id === id));
          break;
        case 'unfriend':
          await connectionService.unfriend(id);
          showSuccess('Friend removed');
          
          // Remove from friends list immediately
          setFriends(prev => prev.filter(f => f._id === id));
          break;
        case 'block':
          await connectionService.blockUser(id);
          showSuccess('User blocked');
          
          // Remove from all lists and add to blocked immediately
          const blockedUser = friends.find(f => f._id === id) || 
                             suggestions.find(s => s._id === id) ||
                             pendingRequests.find(req => req.requester._id === id)?.requester ||
                             sentRequests.find(req => req.recipient._id === id)?.recipient;
          
          if (blockedUser) {
            setBlockedUsers(prev => [blockedUser, ...prev]);
          }
          setFriends(prev => prev.filter(f => f._id !== id));
          setPendingRequests(prev => prev.filter(req => req.requester._id !== id));
          setSentRequests(prev => prev.filter(req => req.recipient._id !== id));
          setSuggestions(prev => prev.filter(s => s._id !== id));
          break;
        case 'unblock':
          await connectionService.unblockUser(id);
          showSuccess('User unblocked');
          
          // Remove from blocked list immediately
          setBlockedUsers(prev => prev.filter(b => b._id !== id));
          break;
        case 'send':
          await connectionService.sendRequest(id);
          showSuccess('Friend request sent!');
          
          // Add to sent requests and remove from suggestions immediately
          const targetUser = suggestions.find(s => s._id === id) || searchResults.find(u => u._id === id);
          if (targetUser) {
            setSentRequests(prev => [{
              _id: Date.now().toString(), // temporary ID
              recipient: targetUser,
              createdAt: new Date().toISOString()
            }, ...prev]);
            setSuggestions(prev => prev.filter(s => s._id !== id));
          }
          break;
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      // Don't show notification for "already sent" errors
      const errorMessage = error.response?.data?.message || 'Action failed';
      if (!errorMessage.toLowerCase().includes('already sent') && 
          !errorMessage.toLowerCase().includes('already exists')) {
        showError(errorMessage);
      }
      
      // Rollback on error - fetch fresh data
      fetchAllData();
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
                  onClick={() => setActiveTab('myFriends')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'myFriends'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Friends ({friends.length})
                </button>
                <button
                  onClick={() => setActiveTab('findFriends')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'findFriends'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Find Friends
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
                {/* My Friends Tab */}
                {activeTab === 'myFriends' && (
                  friends.length === 0 ? (
                    <div className="text-center py-12">
                      <UserGroupIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No friends yet</p>
                      <button
                        onClick={() => setActiveTab('findFriends')}
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
                                        setProfileModal({ show: true, userId: friend._id });
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
                              onClick={() => setProfileModal({ show: true, userId: request.requester._id })}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                              View Profile
                            </button>
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

                {/* Find Friends Tab */}
                {activeTab === 'findFriends' && (
                  <div>
                    {/* Search Bar */}
                    <div className="mb-6">
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search for friends by name, email, or username..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setSearchResults([]);
                            }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        )}
                        {searching && (
                          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Results</h3>
                        <div className="space-y-3">
                          {searchResults.map((searchUser) => (
                            <div key={searchUser._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {searchUser.avatar ? (
                                  <img src={searchUser.avatar} alt={searchUser.username} className="w-12 h-12 rounded-full object-cover" />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                    {searchUser.firstName?.[0]}{searchUser.lastName?.[0]}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 truncate">
                                    {searchUser.firstName} {searchUser.lastName}
                                  </p>
                                  <p className="text-sm text-gray-500 truncate">{searchUser.email}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setProfileModal({ show: true, userId: searchUser._id })}
                                  className="px-3 py-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => {
                                    showConfirmModal(
                                      'Send Friend Request',
                                      `Send a friend request to ${searchUser.firstName} ${searchUser.lastName}?`,
                                      () => {
                                        handleAction('send', searchUser._id);
                                        setSearchResults([]);
                                        setSearchQuery('');
                                      },
                                      'success'
                                    );
                                  }}
                                  disabled={actionLoading[searchUser._id]}
                                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggestions */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Suggested Friends</h3>
                      {suggestions.length === 0 ? (
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
                                            setProfileModal({ show: true, userId: suggestion._id });
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
                      )}
                    </div>
                  </div>
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
                                onClick={() => setProfileModal({ show: true, userId: blocked._id })}
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

      {/* User Profile Modal */}
      <UserProfileModal
        userId={profileModal.userId}
        isOpen={profileModal.show}
        onClose={() => setProfileModal({ show: false, userId: null })}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default Connections;
