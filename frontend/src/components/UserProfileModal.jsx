import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  EnvelopeIcon, 
  CalendarIcon, 
  UserPlusIcon, 
  UserMinusIcon, 
  UserIcon, 
  NoSymbolIcon, 
  XCircleIcon, 
  CheckCircleIcon,
  PhoneIcon,
  MapPinIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import authService from '../services/authService';
import connectionService from '../services/connectionService';
import useToast from '../utils/useToast';

const UserProfileModal = ({ userId, isOpen, onClose }) => {
  const { showSuccess, showError } = useToast();
  const [profile, setProfile] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile();
      fetchConnectionStatus();
    }
  }, [userId, isOpen]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await authService.getUserPublicProfile(userId);
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
      await connectionService.cancelRequest(userId);
      setConnectionStatus('none');
      showSuccess('Friend request cancelled');
    } catch (error) {
      console.error('Error cancelling request:', error);
      showError(error.response?.data?.message || 'Failed to cancel request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    try {
      setActionLoading(true);
      await connectionService.acceptRequest(userId);
      setConnectionStatus('friends');
      showSuccess('Friend request accepted!');
    } catch (error) {
      console.error('Error accepting request:', error);
      showError(error.response?.data?.message || 'Failed to accept request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    try {
      setActionLoading(true);
      await connectionService.rejectRequest(userId);
      setConnectionStatus('none');
      showSuccess('Friend request rejected');
    } catch (error) {
      console.error('Error rejecting request:', error);
      showError(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    try {
      setActionLoading(true);
      await connectionService.unfriend(userId);
      setConnectionStatus('none');
      showSuccess('Friend removed');
    } catch (error) {
      console.error('Error unfriending:', error);
      showError(error.response?.data?.message || 'Failed to remove friend');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlock = async () => {
    try {
      setActionLoading(true);
      await connectionService.blockUser(userId);
      setConnectionStatus('blocked');
      showSuccess('User blocked');
    } catch (error) {
      console.error('Error blocking user:', error);
      showError(error.response?.data?.message || 'Failed to block user');
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
      showError(error.response?.data?.message || 'Failed to unblock user');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">User Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : !profile ? (
            <div className="text-center py-12">
              <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">User Not Found</h3>
              <p className="text-gray-600">The user you're looking for doesn't exist.</p>
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <div className="flex items-start space-x-6 mb-6 pb-6 border-b border-gray-200">
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-1">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      {profile.avatar ? (
                        <img
                          src={profile.avatar}
                          alt={profile.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl font-bold text-gray-600">
                          {profile.firstName?.charAt(0).toUpperCase()}{profile.lastName?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    {profile.firstName} {profile.lastName}
                  </h3>
                  <p className="text-lg text-gray-600 mb-3">@{profile.username}</p>
                  
                  {profile.jobTitle && (
                    <p className="text-gray-700 font-medium mb-2">
                      <BriefcaseIcon className="w-4 h-4 inline mr-2 text-gray-400" />
                      {profile.jobTitle}
                      {profile.company && <span className="text-gray-500"> at {profile.company}</span>}
                    </p>
                  )}

                  {/* Connection Status Badge */}
                  <div className="flex items-center gap-2 mt-3">
                    {connectionStatus === 'friends' && (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="w-4 h-4 mr-1.5" />
                        Friends
                      </span>
                    )}
                    {connectionStatus === 'pending' && (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        <XCircleIcon className="w-4 h-4 mr-1.5" />
                        Request Sent
                      </span>
                    )}
                    {connectionStatus === 'received' && (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        <UserPlusIcon className="w-4 h-4 mr-1.5" />
                        Request Received
                      </span>
                    )}
                    {connectionStatus === 'blocked' && (
                      <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        <NoSymbolIcon className="w-4 h-4 mr-1.5" />
                        Blocked
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              {profile.bio && (
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">About</h4>
                  <p className="text-gray-700 leading-relaxed bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* Contact Information */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Contact Information</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center text-gray-700 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <EnvelopeIcon className="w-5 h-5 mr-3 text-blue-500 flex-shrink-0" />
                    <span className="break-all">{profile.email}</span>
                  </div>

                  {profile.phone && (
                    <div className="flex items-center text-gray-700 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <PhoneIcon className="w-5 h-5 mr-3 text-green-500 flex-shrink-0" />
                      <span>{profile.phone}</span>
                    </div>
                  )}

                  {profile.location && (
                    <div className="flex items-center text-gray-700 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <MapPinIcon className="w-5 h-5 mr-3 text-red-500 flex-shrink-0" />
                      <span>{profile.location}</span>
                    </div>
                  )}

                  {profile.company && !profile.jobTitle && (
                    <div className="flex items-center text-gray-700 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <BuildingOfficeIcon className="w-5 h-5 mr-3 text-purple-500 flex-shrink-0" />
                      <span>{profile.company}</span>
                    </div>
                  )}

                  {profile.website && (
                    <div className="flex items-center text-gray-700 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <GlobeAltIcon className="w-5 h-5 mr-3 text-indigo-500 flex-shrink-0" />
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                        {profile.website}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center text-gray-700 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <CalendarIcon className="w-5 h-5 mr-3 text-orange-500 flex-shrink-0" />
                    <span>Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              {profile.socialLinks && Object.values(profile.socialLinks).some(link => link) && (
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Social Links</h4>
                  <div className="flex flex-wrap gap-3">
                    {profile.socialLinks.facebook && (
                      <a
                        href={profile.socialLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                      </a>
                    )}
                    {profile.socialLinks.twitter && (
                      <a
                        href={profile.socialLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                        Twitter
                      </a>
                    )}
                    {profile.socialLinks.linkedin && (
                      <a
                        href={profile.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        LinkedIn
                      </a>
                    )}
                    {profile.socialLinks.github && (
                      <a
                        href={profile.socialLinks.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        GitHub
                      </a>
                    )}
                    {profile.socialLinks.instagram && (
                      <a
                        href={profile.socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-lg hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 transition-all"
                      >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                        </svg>
                        Instagram
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                {connectionStatus === 'none' && (
                  <button
                    onClick={handleSendRequest}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    <UserPlusIcon className="w-5 h-5 mr-2" />
                    Add Friend
                  </button>
                )}

                {connectionStatus === 'pending' && (
                  <button
                    onClick={handleCancelRequest}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    <XCircleIcon className="w-5 h-5 mr-2" />
                    Cancel Request
                  </button>
                )}

                {connectionStatus === 'received' && (
                  <>
                    <button
                      onClick={handleAcceptRequest}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      <CheckCircleIcon className="w-5 h-5 mr-2" />
                      Accept
                    </button>
                    <button
                      onClick={handleRejectRequest}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      <XCircleIcon className="w-5 h-5 mr-2" />
                      Reject
                    </button>
                  </>
                )}

                {connectionStatus === 'friends' && (
                  <button
                    onClick={handleUnfriend}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    <UserMinusIcon className="w-5 h-5 mr-2" />
                    Unfriend
                  </button>
                )}

                {connectionStatus !== 'blocked' && (
                  <button
                    onClick={handleBlock}
                    disabled={actionLoading}
                    className="flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                  >
                    <NoSymbolIcon className="w-5 h-5 mr-2" />
                    Block
                  </button>
                )}

                {connectionStatus === 'blocked' && (
                  <button
                    onClick={handleUnblock}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                    Unblock
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
