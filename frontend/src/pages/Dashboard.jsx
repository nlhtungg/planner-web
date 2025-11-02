import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    const result = await updateUserProfile(formData);

    if (result.success) {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setEditing(false);
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      username: user?.username || '',
    });
    setEditing(false);
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="btn-secondary"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Info Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {message.text && (
              <div
                className={`mb-4 p-3 rounded-md ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                {message.text}
              </div>
            )}

            {editing ? (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                </div>

                {user?.authMethod === 'local' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1">
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="text-base font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                </div>

                {user?.username && (
                  <div>
                    <p className="text-sm text-gray-500">Username</p>
                    <p className="text-base font-medium text-gray-900">@{user?.username}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-base font-medium text-gray-900">{user?.email}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Authentication Method</p>
                  <p className="text-base font-medium text-gray-900">
                    {user?.authMethod === 'google' ? (
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Google
                      </span>
                    ) : (
                      'Email & Password'
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Account Status</p>
                  <p className="text-base font-medium text-green-600">
                    {user?.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Email Verified</p>
                  <p className="text-base font-medium text-gray-900">
                    {user?.isEmailVerified ? '✓ Verified' : '✗ Not Verified'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Account Details Card */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">User ID</p>
                <p className="text-base font-mono text-gray-900 text-xs">{user?._id}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="text-base font-medium text-gray-900 capitalize">{user?.role}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Account Created</p>
                <p className="text-base font-medium text-gray-900">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>

              {user?.lastLogin && (
                <div>
                  <p className="text-sm text-gray-500">Last Login</p>
                  <p className="text-base font-medium text-gray-900">
                    {new Date(user.lastLogin).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {user?.authMethod === 'local' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  onClick={() => alert('Change password feature - coming soon!')}
                >
                  Change Password
                </button>
              </div>
            )}
          </div>
        </div>

        {/* API Testing Card */}
        <div className="card mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">API Information</h2>
          <div className="bg-gray-100 rounded-md p-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>API Base URL:</strong> http://localhost:3001/api/auth
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Access Token:</strong>{' '}
              <span className="font-mono text-xs break-all">
                {localStorage.getItem('accessToken')?.substring(0, 50)}...
              </span>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              ℹ️ Tokens are automatically included in API requests
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
