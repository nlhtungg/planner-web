import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useConnection } from '../context/ConnectionContext';
import connectionService from '../services/connectionService';
import messageService from '../services/messageService';
import socketService from '../services/socketService';
import ToastContainer from '../components/ToastContainer';
import useToast from '../utils/useToast';
import UserProfileModal from '../components/UserProfileModal';
import GlassPageContainer from '../components/layout/GlassPageContainer';
import GlassHeader from '../components/layout/GlassHeader';
import {
  Search,
  Users,
  UserPlus,
  Check,
  X,
  MessageSquare,
  MoreVertical,
  Ban,
  Clock,
  UserMinus,
  Send
} from 'lucide-react';
import moment from 'moment';

const Connections = () => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { pendingRequestsCount: globalPendingCount, refreshCount } = useConnection();
  const navigate = useNavigate();
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('myFriends');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Theme-aware classes
  const textClass = isDark ? 'text-white' : 'text-slate-800';
  const textSecondaryClass = isDark ? 'text-slate-300/70' : 'text-slate-500';
  const glassCardClass = isDark ? 'bg-slate-900/40 backdrop-blur-xl border border-white/10' : 'bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl';
  const inputClass = isDark
    ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-white/20'
    : 'bg-white/40 border-white/30 text-slate-800 placeholder:text-slate-500 focus:ring-2 focus:ring-white/50';

  // Data states
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  // UI states
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, type: 'danger' });
  const [profileModal, setProfileModal] = useState({ show: false, userId: null });

  // Ref to track locally processed actions to avoid socket duplicates
  const processedActionsRef = React.useRef(new Set());

  useEffect(() => {
    fetchAllData();
  }, []);

  // Socket listeners
  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) {
      console.warn('⚠️ Socket not connected yet');
      return;
    }

    // Helper to check if we already processed this action locally
    const wasProcessedLocally = (actionKey) => {
      if (processedActionsRef.current.has(actionKey)) {
        processedActionsRef.current.delete(actionKey);
        return true;
      }
      return false;
    };

    socket.on('friend-request-sent', (data) => {
      console.log('Friend request sent event:', data);
      if (!data.request) return;
      
      const recipientId = data.request.recipient?._id || data.request.recipient;
      if (wasProcessedLocally(`send-${recipientId}`)) return;
      
      setSentRequests(prev => {
        const exists = prev.find(req => {
          const existingRecipientId = req.recipient?._id || req.recipient;
          return existingRecipientId === recipientId;
        });
        if (exists) return prev;
        return [data.request, ...prev];
      });
    });

    socket.on('friend-request-received', (data) => {
      console.log('Friend request received:', data);
      if (!data.request) return;
      
      setPendingRequests(prev => {
        const exists = prev.find(req => req._id === data.request._id);
        if (exists) return prev;
        return [data.request, ...prev];
      });
      refreshCount();
    });

    socket.on('friend-request-accepted', (data) => {
      console.log('Friend request accepted event:', data);
      const friend = data.friend;
      if (!friend || !friend._id) return;
      
      if (wasProcessedLocally(`accept-${friend._id}`)) return;

      setFriends(prev => {
        const exists = prev.find(f => f._id === friend._id);
        if (exists) return prev;
        return [friend, ...prev];
      });

      setSentRequests(prev => prev.filter(req => req.recipient?._id !== friend._id));
      setPendingRequests(prev => prev.filter(req => req.requester?._id !== friend._id));
      refreshCount();
    });

    socket.on('friend-request-rejected', (data) => {
      console.log('Friend request rejected:', data);
      if (wasProcessedLocally(`reject-${data.requestId}`)) return;
      
      setPendingRequests(prev => prev.filter(req => req._id !== data.requestId));
      setSentRequests(prev => prev.filter(req => req._id !== data.requestId));
      refreshCount();
    });

    socket.on('friend-request-cancelled', (data) => {
      console.log('Friend request cancelled:', data);
      if (wasProcessedLocally(`cancel-${data.requestId}`)) return;
      
      setPendingRequests(prev => prev.filter(req => req._id !== data.requestId));
      refreshCount();
    });

    socket.on('friend-removed', (data) => {
      console.log('Friend removed:', data);
      const removedUserId = data.removedUser?._id || data.userId;
      if (!removedUserId) return;
      if (wasProcessedLocally(`unfriend-${removedUserId}`)) return;
      
      setFriends(prev => prev.filter(f => f._id !== removedUserId));
    });

    socket.on('user-blocked', (data) => {
      console.log('User blocked:', data);
      const blockedUserId = data.blockedUser?._id || data.userId;
      if (!blockedUserId) return;
      if (wasProcessedLocally(`block-${blockedUserId}`)) return;

      setFriends(prev => prev.filter(f => f._id !== blockedUserId));
      setPendingRequests(prev => prev.filter(req => req.requester?._id !== blockedUserId));
      setSentRequests(prev => prev.filter(req => req.recipient?._id !== blockedUserId));

      if (data.blockedUser) {
        setBlockedUsers(prev => {
          const exists = prev.find(b => b._id === blockedUserId);
          if (exists) return prev;
          return [data.blockedUser, ...prev];
        });
      }
    });

    socket.on('user-unblocked', (data) => {
      console.log('User unblocked:', data);
      const unblockedUserId = data.unblockedUser?._id || data.userId;
      if (!unblockedUserId) return;
      if (wasProcessedLocally(`unblock-${unblockedUserId}`)) return;
      
      setBlockedUsers(prev => prev.filter(b => b._id !== unblockedUserId));
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
      const [friendsRes, requestsRes, sentRes, blockedRes] = await Promise.all([
        connectionService.getFriends(),
        connectionService.getPendingRequests(),
        connectionService.getSentRequests(),
        connectionService.getBlockedUsers()
      ]);

      setFriends(friendsRes.data || []);
      setPendingRequests(requestsRes.data || []);
      setSentRequests(sentRes.data || []);
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
        case 'accept': {
          await connectionService.acceptRequest(id);
          showSuccess('Friend request accepted!');

          const acceptedRequest = pendingRequests.find(req => req._id === id);
          if (acceptedRequest && acceptedRequest.requester) {
            const newFriendId = acceptedRequest.requester._id;
            // Mark as processed to skip socket event
            processedActionsRef.current.add(`accept-${newFriendId}`);
            
            setFriends(prev => {
              const exists = prev.find(f => f._id === newFriendId);
              if (exists) return prev;
              return [acceptedRequest.requester, ...prev];
            });
            setPendingRequests(prev => prev.filter(req => req._id !== id));
          }
          refreshCount();
          break;
        }
        case 'reject': {
          await connectionService.rejectRequest(id);
          showSuccess('Friend request rejected');
          processedActionsRef.current.add(`reject-${id}`);
          setPendingRequests(prev => prev.filter(req => req._id !== id));
          refreshCount();
          break;
        }
        case 'cancel': {
          await connectionService.cancelRequest(id);
          showSuccess('Friend request cancelled');
          processedActionsRef.current.add(`cancel-${id}`);
          setSentRequests(prev => prev.filter(req => req._id !== id));
          break;
        }
        case 'unfriend': {
          await connectionService.unfriend(id);
          showSuccess('Friend removed');
          processedActionsRef.current.add(`unfriend-${id}`);
          setFriends(prev => prev.filter(f => f._id !== id));
          break;
        }
        case 'block': {
          await connectionService.blockUser(id);
          showSuccess('User blocked');
          processedActionsRef.current.add(`block-${id}`);

          const blockedUser = friends.find(f => f._id === id) ||
            pendingRequests.find(req => req.requester?._id === id)?.requester ||
            sentRequests.find(req => req.recipient?._id === id)?.recipient ||
            searchResults.find(u => u._id === id);

          setFriends(prev => prev.filter(f => f._id !== id));
          setPendingRequests(prev => prev.filter(req => req.requester?._id !== id));
          setSentRequests(prev => prev.filter(req => req.recipient?._id !== id));
          setSearchResults(prev => prev.filter(u => u._id !== id));

          if (blockedUser) {
            setBlockedUsers(prev => {
              const exists = prev.find(b => b._id === id);
              if (exists) return prev;
              return [blockedUser, ...prev];
            });
          }
          break;
        }
        case 'unblock': {
          await connectionService.unblockUser(id);
          showSuccess('User unblocked');
          processedActionsRef.current.add(`unblock-${id}`);
          setBlockedUsers(prev => prev.filter(b => b._id !== id));
          break;
        }
        case 'send': {
          const response = await connectionService.sendRequest(id);
          showSuccess('Friend request sent!');
          setSearchResults(prev => prev.filter(u => u._id !== id));
          
          // Add the new request to sent requests immediately with the real data from API
          if (response.data) {
            setSentRequests(prev => {
              const exists = prev.find(req => {
                const recipientId = req.recipient?._id || req.recipient;
                return recipientId === id;
              });
              if (exists) return prev;
              return [response.data, ...prev];
            });
          } else {
            // Fallback: refetch sent requests if no data returned
            const sentRes = await connectionService.getSentRequests();
            setSentRequests(sentRes.data || []);
          }
          break;
        }
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      const errorMessage = error.response?.data?.message || 'Action failed';
      if (!errorMessage.toLowerCase().includes('already sent') &&
        !errorMessage.toLowerCase().includes('already exists')) {
        showError(errorMessage);
      }
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
    <GlassPageContainer className="p-2 sm:p-4 md:p-6 max-w-7xl mx-auto">
      <GlassHeader title="Connections" subtitle="Manage your network" />

      <div className="flex-1 overflow-y-auto">
        <div className="pb-8">


          {/* Tabs */}
          <div className={`rounded-2xl mb-6 ${glassCardClass}`}>
            <div className={`border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <nav className="flex -mb-px overflow-x-auto">
                <button
                  onClick={() => setActiveTab('myFriends')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'myFriends'
                    ? 'border-blue-500 text-blue-500'
                    : isDark ? 'border-transparent text-slate-400 hover:text-white hover:border-white/30' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                >
                  Friends ({friends.length})
                </button>
                <button
                  onClick={() => setActiveTab('findFriends')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'findFriends'
                    ? 'border-blue-500 text-blue-500'
                    : isDark ? 'border-transparent text-slate-400 hover:text-white hover:border-white/30' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                >
                  Find Friends
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`relative px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'requests'
                    ? 'border-blue-500 text-blue-500'
                    : isDark ? 'border-transparent text-slate-400 hover:text-white hover:border-white/30' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
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
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'sent'
                    ? 'border-blue-500 text-blue-500'
                    : isDark ? 'border-transparent text-slate-400 hover:text-white hover:border-white/30' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                >
                  Sent ({sentRequests.length})
                </button>
                <button
                  onClick={() => setActiveTab('blocked')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'blocked'
                    ? 'border-blue-500 text-blue-500'
                    : isDark ? 'border-transparent text-slate-400 hover:text-white hover:border-white/30' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                >
                  Blocked ({blockedUsers.length})
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className={`rounded-2xl p-6 ${glassCardClass}`}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-blue-400' : 'border-blue-600'}`}></div>
              </div>
            ) : (
              <>
                {/* My Friends Tab */}
                {activeTab === 'myFriends' && (
                  friends.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                      <p className={textSecondaryClass}>No friends yet</p>
                      <button
                        onClick={() => setActiveTab('findFriends')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300"
                      >
                        Find Friends
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {friends.map((friend) => (
                        <div key={friend._id} className={`rounded-xl p-4 transition-shadow relative ${isDark ? 'bg-white/5 border border-white/10 hover:bg-white/10' : 'border border-gray-200 hover:shadow-md'}`}>
                          <div className="flex items-start gap-3">
                            {friend.avatar ? (
                              <img src={friend.avatar} alt={friend.firstName} className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                {friend.firstName?.[0]}{friend.lastName?.[0]}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-semibold truncate ${textClass}`}>
                                {friend.firstName} {friend.lastName}
                              </h3>
                              <p className={`text-sm truncate ${textSecondaryClass}`}>{friend.email}</p>
                              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                                Friends since {moment(friend.connectedAt).format('MMM YYYY')}
                              </p>
                            </div>
                            {/* Dropdown Menu */}
                            <div className="relative">
                              <button
                                onClick={() => setDropdownOpen(dropdownOpen === friend._id ? null : friend._id)}
                                className={`p-1 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                              >
                                <MoreVertical className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                              </button>
                              {dropdownOpen === friend._id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(null)}></div>
                                  <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-lg py-1 z-20 ${isDark ? 'bg-slate-800/95 backdrop-blur-xl border border-white/10' : 'bg-white border border-gray-200'}`}>
                                    <button
                                      onClick={() => {
                                        handleMessage(friend);
                                        setDropdownOpen(null);
                                      }}
                                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'}`}
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                      Send Message
                                    </button>
                                    <button
                                      onClick={() => {
                                        setProfileModal({ show: true, userId: friend._id });
                                        setDropdownOpen(null);
                                      }}
                                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'}`}
                                    >
                                      <Users className="w-4 h-4" />
                                      View Profile
                                    </button>
                                    <hr className={`my-1 ${isDark ? 'border-white/10' : ''}`} />
                                    <button
                                      onClick={() => {
                                        setDropdownOpen(null);
                                        showConfirmModal(
                                          'Unfriend User',
                                          `Are you sure you want to unfriend ${friend.firstName} ${friend.lastName}?`,
                                          () => handleAction('unfriend', friend._id)
                                        );
                                      }}
                                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'}`}
                                    >
                                      <X className="w-4 h-4" />
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
                                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}
                                    >
                                      <Ban className="w-4 h-4" />
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
                      <p className={textSecondaryClass}>No pending requests</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingRequests.map((request) => (
                        <div key={request._id} className={`rounded-xl p-4 flex items-center justify-between ${isDark ? 'bg-white/5 border border-white/10' : 'border border-gray-200'}`}>
                          <div className="flex items-center gap-3">
                            {request.requester.avatar ? (
                              <img src={request.requester.avatar} alt={request.requester.firstName} className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                {request.requester.firstName?.[0]}{request.requester.lastName?.[0]}
                              </div>
                            )}
                            <div>
                              <h3 className={`font-semibold ${textClass}`}>
                                {request.requester.firstName} {request.requester.lastName}
                              </h3>
                              <p className={`text-sm ${textSecondaryClass}`}>{request.requester.email}</p>
                              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>{moment(request.createdAt).fromNow()}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setProfileModal({ show: true, userId: request.requester._id })}
                              className={`px-4 py-2 rounded-xl transition-all duration-300 ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/20 border border-white/10' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                              View Profile
                            </button>
                            <button
                              onClick={() => handleAction('accept', request._id)}
                              disabled={actionLoading[request._id]}
                              className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-1 transition-all duration-300"
                            >
                              <Check className="w-4 h-4" />
                              Accept
                            </button>
                            <button
                              onClick={() => handleAction('reject', request._id)}
                              disabled={actionLoading[request._id]}
                              className={`px-4 py-2 rounded-xl flex items-center gap-1 transition-all duration-300 ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/20 border border-white/10' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            >
                              <X className="w-4 h-4" />
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
                      <p className={textSecondaryClass}>No sent requests</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sentRequests.map((request) => (
                        <div key={request._id} className={`rounded-xl p-4 flex items-center justify-between ${isDark ? 'bg-white/5 border border-white/10' : 'border border-gray-200'}`}>
                          <div className="flex items-center gap-3">
                            {request.recipient.avatar ? (
                              <img src={request.recipient.avatar} alt={request.recipient.firstName} className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                {request.recipient.firstName?.[0]}{request.recipient.lastName?.[0]}
                              </div>
                            )}
                            <div>
                              <h3 className={`font-semibold ${textClass}`}>
                                {request.recipient.firstName} {request.recipient.lastName}
                              </h3>
                              <p className={`text-sm ${textSecondaryClass}`}>{request.recipient.email}</p>
                              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>Sent {moment(request.createdAt).fromNow()}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAction('cancel', request._id)}
                            disabled={actionLoading[request._id]}
                            className={`px-4 py-2 rounded-xl transition-all duration-300 ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/20 border border-white/10' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
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
                        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                        <input
                          type="text"
                          placeholder="Search for friends by name, email, or username..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className={`w-full pl-10 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${inputClass}`}
                        />
                        {searchQuery && (
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setSearchResults([]);
                            }}
                            className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            <X className="w-5 h-5" />
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
                        <h3 className={`text-lg font-semibold mb-4 ${textClass}`}>Search Results</h3>
                        <div className="space-y-3">
                          {searchResults.map((searchUser) => (
                            <div key={searchUser._id} className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-white/5 border border-white/10 hover:bg-white/10' : 'border border-gray-200 hover:bg-gray-50'}`}>
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {searchUser.avatar ? (
                                  <img src={searchUser.avatar} alt={searchUser.username} className="w-12 h-12 rounded-full object-cover" />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                    {searchUser.firstName?.[0]}{searchUser.lastName?.[0]}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold truncate ${textClass}`}>
                                    {searchUser.firstName} {searchUser.lastName}
                                  </p>
                                  <p className={`text-sm truncate ${textSecondaryClass}`}>{searchUser.email}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setProfileModal({ show: true, userId: searchUser._id })}
                                  className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/20 border border-white/10' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
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
                                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 transition-all duration-300"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty state when no search */}
                    {searchResults.length === 0 && !searching && (
                      <div className="text-center py-12">
                        <Search className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                        <p className={textSecondaryClass}>Search for users by name, email, or username</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Blocked Tab */}
                {activeTab === 'blocked' && (
                  blockedUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <p className={textSecondaryClass}>No blocked users</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {blockedUsers.map((blocked) => (
                        <div key={blocked._id} className={`rounded-xl p-4 ${isDark ? 'bg-white/5 border border-white/10' : 'border border-gray-200'}`}>
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
                                <h3 className={`font-semibold ${textClass}`}>
                                  {blocked.firstName} {blocked.lastName}
                                </h3>
                                <p className={`text-sm ${textSecondaryClass}`}>{blocked.email}</p>
                                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>Blocked user</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setProfileModal({ show: true, userId: blocked._id })}
                                className={`px-4 py-2 rounded-xl transition-all duration-300 ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/20 border border-white/10' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                              >
                                View Profile
                              </button>
                              <button
                                onClick={() => handleAction('unblock', blocked._id)}
                                disabled={actionLoading[blocked._id]}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300"
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
          </div >

          {/* Confirm Modal */}
          {
            confirmModal.show && (
              <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${isDark ? 'bg-black/70' : 'bg-black/50'}`}>
                <div className={`rounded-2xl shadow-xl w-full max-w-md ${glassCardClass}`}>
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {confirmModal.type === 'danger' ? (
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-red-900/50' : 'bg-red-100'}`}>
                          <Ban className={`w-6 h-6 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                        </div>
                      ) : confirmModal.type === 'success' ? (
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-green-900/50' : 'bg-green-100'}`}>
                          <UserPlus className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                        </div>
                      ) : null}
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold mb-2 ${textClass}`}>
                          {confirmModal.title}
                        </h3>
                        <p className={`text-sm ${textSecondaryClass}`}>
                          {confirmModal.message}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`px-6 py-4 flex gap-3 justify-end rounded-b-2xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <button
                      onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: null })}
                      className={`px-4 py-2 rounded-xl transition-all duration-300 ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
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
                      className={`px-4 py-2 rounded-xl transition-all duration-300 ${confirmModal.type === 'danger'
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
            )
          }

          {/* User Profile Modal */}
          <UserProfileModal
            userId={profileModal.userId}
            isOpen={profileModal.show}
            onClose={() => setProfileModal({ show: false, userId: null })}
          />

          {/* Toast Notifications */}
          <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div >
      </div >
    </GlassPageContainer >
  );
};

export default Connections;

