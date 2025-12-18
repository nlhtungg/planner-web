import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConnection } from '../context/ConnectionContext';
import authService from '../services/authService';
import connectionService from '../services/connectionService';
import useToast from '../utils/useToast';
import ToastContainer from '../components/ToastContainer';
import {
  ArrowLeftIcon,
  UserCircleIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  UserPlusIcon,
  ChatBubbleLeftRightIcon,
  NoSymbolIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import moment from 'moment';

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { refreshCount } = useConnection();
  const { toasts, removeToast, showSuccess, showError } = useToast();

  const [profile, setProfile] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    fetchConnectionStatus();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await authService.getUserPublicProfile(userId);
      console.log('User profile response:', response);
      if (response.success && response.data?.user) {
        setProfile(response.data.user);
      } else {
        showError('User not found');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      showError(error.response?.data?.message || 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionStatus = async () => {
    try {
      const response = await connectionService.getConnectionStatus(userId);
      setConnectionStatus(response.status);
    } catch (error) {
      console.error('Error fetching connection status:', error);
    }
  };

  const handleSendRequest = async () => {
    try {
      setActionLoading(true);
      await connectionService.sendRequest(userId);
      setConnectionStatus('pending');
      showSuccess('Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      showError(error.response?.data?.message || 'Failed to send friend request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    try {
      setActionLoading(true);
      const sentRequests = await connectionService.getSentRequests();
      const request = sentRequests.find(r => r.recipient._id === userId);
      if (request) {
        await connectionService.cancelRequest(request._id);
        setConnectionStatus('none');
        showSuccess('Friend request cancelled');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      showError('Failed to cancel request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    try {
      setActionLoading(true);
      const requests = await connectionService.getPendingRequests();
      const request = requests.find(r => r.requester._id === userId);
      if (request) {
        await connectionService.acceptRequest(request._id);
        setConnectionStatus('friends');
        refreshCount();
        showSuccess('Friend request accepted!');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      showError('Failed to accept request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    try {
      setActionLoading(true);
      const requests = await connectionService.getPendingRequests();
      const request = requests.find(r => r.requester._id === userId);
      if (request) {
        await connectionService.rejectRequest(request._id);
        setConnectionStatus('none');
        refreshCount();
        showSuccess('Friend request rejected');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      showError('Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    
    try {
      setActionLoading(true);
      const friends = await connectionService.getFriends();
      const friend = friends.find(f => f._id === userId);
      if (friend) {
        await connectionService.unfriend(friend.connectionId);
        setConnectionStatus('none');
        showSuccess('Friend removed');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      showError('Failed to remove friend');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = () => {
    navigate('/messages', { state: { selectUser: profile } });
  };

  const handleBlock = async () => {
    if (!window.confirm('Are you sure you want to block this user?')) return;
    
    try {
      setActionLoading(true);
      await connectionService.blockUser(userId);
      setConnectionStatus('blocked');
      showSuccess('User blocked');
    } catch (error) {
      console.error('Error blocking user:', error);
      showError('Failed to block user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblock = async () => {
    try {
      setActionLoading(true);
      await connectionService.unblockUser(userId);
      setConnectionStatus('none');
      showSuccess('User unblocked');
    } catch (error) {
      console.error('Error unblocking user:', error);
      showError('Failed to unblock user');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <UserCircleIcon className="w-24 h-24 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User Not Found</h2>
          <p className="text-gray-600 mb-4">The user you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Check if viewing own profile
  const isOwnProfile = currentUser._id === userId;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back</span>
          </button>
          {isOwnProfile && (
            <button
              onClick={() => navigate('/profile')}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-6">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.firstName}
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-gray-200">
                {profile.firstName?.[0]}{profile.lastName?.[0]}
              </div>
            )}

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="text-gray-600 mb-2">@{profile.username}</p>
              
              <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <EnvelopeIcon className="w-4 h-4" />
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CalendarDaysIcon className="w-4 h-4" />
                  <span>Joined {moment(profile.createdAt).format('MMM YYYY')}</span>
                </div>
              </div>

              {profile.bio && (
                <p className="text-gray-700 mb-4">{profile.bio}</p>
              )}

              {/* Action Buttons */}
              {!isOwnProfile && (
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  {connectionStatus === 'none' && (
                    <>
                      <button
                        onClick={handleSendRequest}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        <UserPlusIcon className="w-5 h-5" />
                        Add Friend
                      </button>
                      <button
                        onClick={handleBlock}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        <NoSymbolIcon className="w-5 h-5" />
                        Block
                      </button>
                    </>
                  )}

                  {connectionStatus === 'pending' && (
                    <button
                      onClick={handleCancelRequest}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      <XMarkIcon className="w-5 h-5" />
                      Cancel Request
                    </button>
                  )}

                  {connectionStatus === 'received' && (
                    <>
                      <button
                        onClick={handleAcceptRequest}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <CheckIcon className="w-5 h-5" />
                        Accept Request
                      </button>
                      <button
                        onClick={handleRejectRequest}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        <XMarkIcon className="w-5 h-5" />
                        Reject
                      </button>
                    </>
                  )}

                  {connectionStatus === 'friends' && (
                    <>
                      <button
                        onClick={handleMessage}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <ChatBubbleLeftRightIcon className="w-5 h-5" />
                        Message
                      </button>
                      <button
                        onClick={handleUnfriend}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        <XMarkIcon className="w-5 h-5" />
                        Unfriend
                      </button>
                      <button
                        onClick={handleBlock}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                      >
                        <NoSymbolIcon className="w-5 h-5" />
                        Block
                      </button>
                    </>
                  )}

                  {connectionStatus === 'blocked' && (
                    <button
                      onClick={handleUnblock}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <CheckIcon className="w-5 h-5" />
                      Unblock
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
            <div className="space-y-2 text-gray-600">
              <p><strong>Account Type:</strong> {profile.authMethod === 'google' ? 'Google Account' : 'Local Account'}</p>
              <p><strong>Member Since:</strong> {moment(profile.createdAt).format('MMMM D, YYYY')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default UserProfile;
