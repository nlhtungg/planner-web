import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import GlassPageContainer from '../components/layout/GlassPageContainer';
import GlassHeader from '../components/layout/GlassHeader';
import {
  Pencil,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import TotpSetup from '../components/TotpSetup';

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  // Theme-aware classes
  const textClass = isDark ? 'text-white' : 'text-slate-800';
  const textSecondaryClass = isDark ? 'text-slate-300/70' : 'text-slate-500';
  const glassCardClass = isDark ? 'bg-slate-900/40 backdrop-blur-xl border border-white/10' : 'bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl';
  const inputClass = isDark
    ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-white/20 focus:shadow-[0_0_18px_rgba(255,255,255,0.08)]'
    : 'bg-white/40 border-white/30 text-slate-800 placeholder:text-slate-500 focus:ring-2 focus:ring-white/50';

  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Avatar upload state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updateData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        username: formData.username.trim() || null
      };

      const response = await api.put('/auth/profile', updateData);

      if (response.data.success) {
        await updateUser(response.data.data.user);
        setSuccess('Profile updated successfully!');
        setEditMode(false);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Update profile error:', error);
      setError(error.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
      email: user.email || ''
    });
    setEditMode(false);
    setError('');
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    setPasswordError('');
  };

  const handleChangePassword = async () => {
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      setPasswordLoading(false);
      return;
    }

    // Validate password strength
    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      setPasswordLoading(false);
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      setPasswordError('New password must contain at least one uppercase letter, one lowercase letter, and one number');
      setPasswordLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        setPasswordSuccess('Password changed successfully! Please log in again.');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowChangePassword(false);

        // Auto logout after 3 seconds
        setTimeout(() => {
          handleLogout();
        }, 3000);
      }
    } catch (error) {
      console.error('Change password error:', error);
      setPasswordError(error.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowChangePassword(false);
    setPasswordError('');
    setPasswordSuccess('');
  };

  // Avatar handling functions
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    console.log('🖼️ Avatar file selected:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: file.lastModified
    });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select a valid image file');
      console.log('❌ Invalid file type:', file.type);
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image size must be less than 5MB');
      console.log('❌ File too large:', file.size);
      return;
    }

    setAvatarError('');
    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target.result);
      console.log('✅ Preview created');
    };
    reader.readAsDataURL(file);

    // Automatically upload the selected file
    console.log('🚀 Calling handleAvatarUpload with file');
    await handleAvatarUpload(file);

    // Clear the input so the same file can be selected again if needed
    e.target.value = '';
  };

  const handleAvatarUpload = async (file = avatarFile) => {
    if (!file) return;

    console.log('🚀 Starting avatar upload...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    setAvatarLoading(true);
    setAvatarError('');

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      console.log('📦 FormData created and file appended');
      console.log('📋 FormData entries:', Array.from(formData.entries()));

      // Log the file object details again
      console.log('📂 File being uploaded:', {
        name: file.name,
        size: file.size,
        type: file.type,
        constructor: file.constructor.name
      });

      console.log('🌐 Sending request to /auth/upload-avatar');
      const response = await api.post('/auth/upload-avatar', formData);
      console.log('📥 Upload response received:', response.data);

      if (response.data.success) {
        console.log('✅ Upload successful, updating user context');
        console.log('📷 New avatar URL:', response.data.data.avatarUrl);
        console.log('👤 Current user before update:', user);

        // Update user context with new avatar URL
        const updatedUser = { ...user, avatar: response.data.data.avatarUrl };
        console.log('👤 Updated user object:', updatedUser);
        updateUser(updatedUser);

        // Clear file state
        setAvatarFile(null);
        setAvatarPreview(null);
        setSuccess('Avatar uploaded successfully!');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      setAvatarError(error.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleAvatarDelete = async () => {
    setAvatarLoading(true);
    setAvatarError('');

    try {
      const response = await api.delete('/auth/delete-avatar');

      if (response.data.success) {
        // Update user context to remove avatar URL
        updateUser({ ...user, avatar: null });
        setSuccess('Avatar deleted successfully!');
      }
    } catch (error) {
      console.error('Avatar delete error:', error);
      setAvatarError(error.response?.data?.message || 'Failed to delete avatar');
    } finally {
      setAvatarLoading(false);
    }
  };

  const cancelAvatarUpload = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarError('');
  };

  return (
    <GlassPageContainer>
      <GlassHeader title="Profile Settings" subtitle="Manage your account information and preferences" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          {/* Success/Error Messages */}
          {success && (
            <div className={`mb-6 rounded-lg p-4 ${isDark ? 'bg-green-900/30 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
              <div className="flex items-center space-x-2">
                <Check className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
                <p className={isDark ? 'text-green-300' : 'text-green-700'}>{success}</p>
              </div>
            </div>
          )}

          {error && (
            <div className={`mb-6 rounded-lg p-4 ${isDark ? 'bg-red-900/30 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center space-x-2">
                <AlertCircle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                <p className={isDark ? 'text-red-300' : 'text-red-700'}>{error}</p>
              </div>
            </div>
          )}

          {/* Profile Card */}
          <div className={`rounded-2xl ${glassCardClass}`}>
            {/* Profile Header */}
            <div className={`px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative group">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-blue-500 flex items-center justify-center">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.log('❌ Avatar image failed to load:', e.target.src);
                          }}
                          onLoad={() => {
                            console.log('✅ Avatar image loaded successfully');
                          }}
                        />
                      ) : (
                        <span className="text-white text-xl font-medium">
                          {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </span>
                      )}
                    </div>
                    {/* Avatar Change Button - Always Available */}
                    <button
                      onClick={() => document.getElementById('avatar-input').click()}
                      disabled={avatarLoading}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 shadow-lg border-2 border-white"
                      title="Change Avatar"
                    >
                      {avatarLoading ? (
                        <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                      ) : (
                        <Pencil className="w-3 h-3" />
                      )}
                    </button>
                    {/* Hidden File Input */}
                    <input
                      id="avatar-input"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold ${textClass}`}>
                      {user?.firstName} {user?.lastName}
                    </h3>
                    <p className={textSecondaryClass}>{user?.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        {user?.authMethod === 'google' ? 'Google Account' : 'Local Account'}
                      </span>
                      {user?.isEmailVerified && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Email Verified
                        </span>
                      )}
                    </div>

                    {/* Avatar Error Display */}
                    {avatarError && (
                      <div className={`mt-2 flex items-center space-x-2 text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        <AlertCircle className="w-4 h-4" />
                        <span>{avatarError}</span>
                      </div>
                    )}

                    {/* Delete Avatar Button */}
                    {user?.avatar && (
                      <button
                        onClick={handleAvatarDelete}
                        disabled={avatarLoading}
                        className="mt-2 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Remove Avatar
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!editMode ? (
                    <button
                      onClick={() => setEditMode(true)}
                      className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 ${isDark ? 'shadow-[0_0_18px_rgba(59,130,246,0.3)]' : 'shadow-lg'}`}
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Edit Profile</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleCancel}
                        disabled={loading}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 disabled:opacity-50 ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 ${isDark ? 'shadow-[0_0_18px_rgba(59,130,246,0.3)]' : 'shadow-lg'}`}
                      >
                        {loading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                    First Name <span className="text-red-500">*</span>
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg transition-all duration-300 ${inputClass}`}
                      placeholder="Enter your first name"
                      required
                    />
                  ) : (
                    <p className={`px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border border-white/10 text-white' : 'bg-gray-50 border border-gray-200 text-gray-900'}`}>
                      {user?.firstName || 'Not provided'}
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg transition-all duration-300 ${inputClass}`}
                      placeholder="Enter your last name"
                      required
                    />
                  ) : (
                    <p className={`px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border border-white/10 text-white' : 'bg-gray-50 border border-gray-200 text-gray-900'}`}>
                      {user?.lastName || 'Not provided'}
                    </p>
                  )}
                </div>

                {/* Username */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                    Username
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg transition-all duration-300 ${inputClass}`}
                      placeholder="Choose a unique username (optional)"
                    />
                  ) : (
                    <p className={`px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border border-white/10 text-white' : 'bg-gray-50 border border-gray-200 text-gray-900'}`}>
                      {user?.username || 'Not set'}
                    </p>
                  )}
                  <p className={`text-xs mt-1 ${textSecondaryClass}`}>
                    Username must be 3-30 characters and contain only letters and numbers
                  </p>
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                    Email Address
                  </label>
                  <p className={`px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border border-white/10 text-white' : 'bg-gray-50 border border-gray-200 text-gray-900'}`}>
                    {user?.email}
                  </p>
                  <p className={`text-xs mt-1 ${textSecondaryClass}`}>
                    Email address cannot be changed
                  </p>
                </div>

                {/* Account Type */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                    Account Type
                  </label>
                  <p className={`px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border border-white/10 text-white' : 'bg-gray-50 border border-gray-200 text-gray-900'}`}>
                    {user?.authMethod === 'google' ? 'Google Account' : 'Local Account'}
                  </p>
                </div>

                {/* Member Since */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                    Member Since
                  </label>
                  <p className={`px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border border-white/10 text-white' : 'bg-gray-50 border border-gray-200 text-gray-900'}`}>
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Unknown'}
                  </p>
                </div>
              </div>

              {/* Additional Information */}
              <div className={`mt-8 pt-6 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <h4 className={`text-lg font-medium mb-4 ${textClass}`}>Account Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${user?.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={`text-sm ${textSecondaryClass}`}>
                      Account Status: <span className={`font-medium ${textClass}`}>{user?.isActive ? 'Active' : 'Inactive'}</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${user?.isEmailVerified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <span className={`text-sm ${textSecondaryClass}`}>
                      Email Status: <span className={`font-medium ${textClass}`}>{user?.isEmailVerified ? 'Verified' : 'Unverified'}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Section (for local accounts) */}
          {user?.authMethod === 'local' && (
            <div className={`mt-6 rounded-2xl ${glassCardClass}`}>
              <div className={`px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-semibold ${textClass}`}>Security Settings</h3>
                <p className={textSecondaryClass + ' mt-1'}>Manage your account security and password</p>
              </div>
              <div className="p-6">
                {!showChangePassword ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`font-medium ${textClass}`}>Password</h4>
                      <p className={`text-sm ${textSecondaryClass}`}>Change your account password</p>
                    </div>
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className={`px-4 py-2 rounded-xl transition-all duration-300 ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      Change Password
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h4 className={`font-medium ${textClass}`}>Change Password</h4>
                      <button
                        onClick={handleCancelPasswordChange}
                        disabled={passwordLoading}
                        className={isDark ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {passwordError && (
                      <div className={`mb-4 rounded-lg p-3 ${isDark ? 'bg-red-900/30 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-center space-x-2">
                          <AlertCircle className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                          <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>{passwordError}</p>
                        </div>
                      </div>
                    )}

                    {passwordSuccess && (
                      <div className={`mb-4 rounded-lg p-3 ${isDark ? 'bg-green-900/30 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
                        <div className="flex items-center space-x-2">
                          <Check className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
                          <p className={`text-sm ${isDark ? 'text-green-300' : 'text-green-700'}`}>{passwordSuccess}</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                          Current Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordInputChange}
                          className={`w-full px-3 py-2 border rounded-lg transition-all duration-300 ${inputClass}`}
                          placeholder="Enter your current password"
                          disabled={passwordLoading}
                          required
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                          New Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordInputChange}
                          className={`w-full px-3 py-2 border rounded-lg transition-all duration-300 ${inputClass}`}
                          placeholder="Enter your new password"
                          disabled={passwordLoading}
                          required
                        />
                        <p className={`text-xs mt-1 ${textSecondaryClass}`}>
                          Must be at least 6 characters with uppercase, lowercase, and number
                        </p>
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                          Confirm New Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordInputChange}
                          className={`w-full px-3 py-2 border rounded-lg transition-all duration-300 ${inputClass}`}
                          placeholder="Confirm your new password"
                          disabled={passwordLoading}
                          required
                        />
                      </div>

                      <div className={`flex items-center justify-end space-x-3 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                        <button
                          onClick={handleCancelPasswordChange}
                          disabled={passwordLoading}
                          className={`px-4 py-2 rounded-xl transition-all duration-300 disabled:opacity-50 ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleChangePassword}
                          disabled={passwordLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                          className={`px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${isDark ? 'shadow-[0_0_18px_rgba(220,38,38,0.3)]' : 'shadow-lg'}`}
                        >
                          {passwordLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          <span>{passwordLoading ? 'Changing...' : 'Change Password'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Two-Factor Authentication Section */}
          <div className={`mt-6 rounded-2xl ${glassCardClass}`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${textClass}`}>Two-Factor Authentication</h3>
              <p className={textSecondaryClass + ' mt-1'}>Add an extra layer of security to your account</p>
            </div>
            <div className="p-6">
              <TotpSetup />
            </div>
          </div>
        </div>
      </div>
    </GlassPageContainer>
  );
};

export default Profile;