import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import workspaceService from '../services/workspaceService';
import {
  PlusIcon,
  BriefcaseIcon,
  UserGroupIcon,
  EllipsisVerticalIcon,
  ClockIcon,
  Cog6ToothIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

const Workspaces = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    settings: {
      isPublic: false,
      allowMemberInvites: true,
      defaultRole: 'member'
    }
  });

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    settings: {
      isPublic: false,
      allowMemberInvites: true,
      defaultRole: 'member'
    }
  });

  const colorOptions = [
    { value: '#3B82F6', name: 'Blue' },
    { value: '#10B981', name: 'Green' },
    { value: '#8B5CF6', name: 'Purple' },
    { value: '#F59E0B', name: 'Yellow' },
    { value: '#EF4444', name: 'Red' },
    { value: '#06B6D4', name: 'Cyan' },
    { value: '#84CC16', name: 'Lime' },
    { value: '#F97316', name: 'Orange' },
  ];

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const response = await workspaceService.getMyWorkspaces();
      if (response.success) {
        setWorkspaces(response.data);
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError('Failed to fetch workspaces');
      console.error('Fetch workspaces error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await workspaceService.createWorkspace(createForm);
      if (response.success) {
        setWorkspaces([response.data, ...workspaces]);
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          description: '',
          color: '#3B82F6',
          settings: {
            isPublic: false,
            allowMemberInvites: true,
            defaultRole: 'member'
          }
        });
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create workspace');
      console.error('Create workspace error:', error);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await workspaceService.updateWorkspace(editingWorkspace._id, editForm);
      if (response.success) {
        setWorkspaces(workspaces.map(ws => 
          ws._id === editingWorkspace._id ? response.data : ws
        ));
        setShowEditModal(false);
        setEditingWorkspace(null);
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update workspace');
      console.error('Update workspace error:', error);
    }
  };

  const handleDeleteWorkspace = async (workspaceId) => {
    if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await workspaceService.deleteWorkspace(workspaceId);
      if (response.success) {
        setWorkspaces(workspaces.filter(ws => ws._id !== workspaceId));
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete workspace');
      console.error('Delete workspace error:', error);
    }
  };

  const openEditModal = (workspace) => {
    setEditingWorkspace(workspace);
    setEditForm({
      name: workspace.name,
      description: workspace.description || '',
      color: workspace.color,
      settings: workspace.settings
    });
    setShowEditModal(true);
    setDropdownOpen(null);
  };

  const formatLastActivity = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Less than an hour ago';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/home')}
              className="flex items-center space-x-3 text-gray-700 hover:text-gray-900"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Planner</h1>
            </button>
            <span className="text-gray-400">/</span>
            <h2 className="text-lg font-medium text-gray-900">Workspaces</h2>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
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

      {/* Main Content */}
      <main className="p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Workspaces</h1>
            <p className="text-gray-600 mt-2">
              Manage your workspaces where you collaborate with your team
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Create Workspace</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Workspaces Grid */}
        {workspaces.length === 0 ? (
          <div className="text-center py-12">
            <BriefcaseIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workspaces yet</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first workspace</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center space-x-2 mx-auto"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Create Workspace</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace) => (
              <div key={workspace._id} className="card hover:shadow-lg transition-shadow cursor-pointer relative">
                {/* Dropdown Menu */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDropdownOpen(dropdownOpen === workspace._id ? null : workspace._id);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <EllipsisVerticalIcon className="w-5 h-5" />
                  </button>

                  {dropdownOpen === workspace._id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <button
                        onClick={() => openEditModal(workspace)}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                      >
                        <PencilIcon className="w-4 h-4" />
                        <span>Edit Workspace</span>
                      </button>
                      {workspace.owner._id === user._id && (
                        <button
                          onClick={() => handleDeleteWorkspace(workspace._id)}
                          className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                        >
                          <TrashIcon className="w-4 h-4" />
                          <span>Delete Workspace</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-start space-x-4">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: workspace.color }}
                  >
                    <BriefcaseIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1 truncate pr-8">
                      {workspace.name}
                    </h3>
                    {workspace.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {workspace.description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <UserGroupIcon className="w-3 h-3" />
                        <span>{workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="w-3 h-3" />
                        <span>{formatLastActivity(workspace.lastActivity)}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-gray-500">Owner:</span>
                        <span className="ml-1 text-gray-700">
                          {workspace.owner.firstName} {workspace.owner.lastName}
                        </span>
                      </div>
                      {workspace.settings?.isPublic && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Public
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Create Workspace</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Workspace Name *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="input-field"
                    placeholder="Enter workspace name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="input-field"
                    placeholder="Brief description (optional)"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color Theme
                  </label>
                  <div className="flex space-x-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, color: color.value })}
                        className={`w-8 h-8 rounded-full border-2 ${
                          createForm.color === color.value ? 'border-gray-400' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={createForm.settings.isPublic}
                      onChange={(e) => setCreateForm({
                        ...createForm,
                        settings: { ...createForm.settings, isPublic: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Make workspace public</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={createForm.settings.allowMemberInvites}
                      onChange={(e) => setCreateForm({
                        ...createForm,
                        settings: { ...createForm.settings, allowMemberInvites: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Allow members to invite others</span>
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1 flex items-center justify-center space-x-2"
                  >
                    <CheckIcon className="w-4 h-4" />
                    <span>Create</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Workspace Modal */}
      {showEditModal && editingWorkspace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Edit Workspace</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Workspace Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="input-field"
                    placeholder="Enter workspace name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="input-field"
                    placeholder="Brief description (optional)"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color Theme
                  </label>
                  <div className="flex space-x-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, color: color.value })}
                        className={`w-8 h-8 rounded-full border-2 ${
                          editForm.color === color.value ? 'border-gray-400' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editForm.settings.isPublic}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        settings: { ...editForm.settings, isPublic: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Make workspace public</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editForm.settings.allowMemberInvites}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        settings: { ...editForm.settings, allowMemberInvites: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Allow members to invite others</span>
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1 flex items-center justify-center space-x-2"
                  >
                    <CheckIcon className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspaces;