import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConnection } from '../context/ConnectionContext';
import { useTheme } from '../context/ThemeContext';
import workspaceService from '../services/workspaceService';
import WorkspaceListItem from '../components/WorkspaceListItem';
import GlassPageContainer from '../components/layout/GlassPageContainer';
import GlassHeader from '../components/layout/GlassHeader';
import GlassCard from '../components/layout/GlassCard';
import {
  Briefcase,
  Search,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  AlertCircle,
  Globe,
  X,
  Clock
} from 'lucide-react';

const Workspaces = () => {
  const { user } = useAuth();
  const { pendingRequestsCount } = useConnection();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeView, setActiveView] = useState('my-workspaces'); // 'my-workspaces' or 'discover'
  const [myWorkspaces, setMyWorkspaces] = useState([]);
  const [publicWorkspaces, setPublicWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [joiningWorkspaceId, setJoiningWorkspaceId] = useState(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    isPublic: false
  });

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    isPublic: false
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

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch all workspaces (including public ones)
      const response = await workspaceService.getMyWorkspaces(true);
      if (response.success) {
        const allWorkspaces = response.data;
        
        // Separate user's workspaces from public non-member workspaces
        const userWorkspaces = [];
        const publicNonMemberWorkspaces = [];
        
        const currentUserId = (user && (user._id || user.id)) ? (user._id || user.id).toString() : null;
        allWorkspaces.forEach(workspace => {
          const isMember = workspace.members?.some(member => {
            const memberUser = member.user;
            const memberId = (memberUser && (memberUser._id || memberUser.id))
              ? (memberUser._id || memberUser.id).toString()
              : (typeof memberUser === 'string' ? memberUser : null);

            // Prefer ID match; fall back to email match if IDs unavailable
            if (currentUserId && memberId) {
              return memberId === currentUserId;
            }
            if (memberUser && memberUser.email && user?.email) {
              return memberUser.email.toLowerCase() === user.email.toLowerCase();
            }
            return false;
          });
          const isOwner = currentUserId && (workspace.owner?._id || workspace.owner?.id)
            ? (workspace.owner._id || workspace.owner.id).toString() === currentUserId
            : false;
          
          if (isMember || isOwner) {
            userWorkspaces.push(workspace);
          } else if (workspace.settings?.isPublic) {
            publicNonMemberWorkspaces.push(workspace);
          }
        });
        
        setMyWorkspaces(userWorkspaces);
        setPublicWorkspaces(publicNonMemberWorkspaces);
      } else {
        const errorMsg = response.message || 'Failed to fetch workspaces';
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Fetch workspaces error:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch workspaces';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Memoized filtered public workspaces
  const filteredPublicWorkspaces = useMemo(() => {
    if (debouncedSearchQuery.trim() === '') {
      return publicWorkspaces;
    }
    
    const query = debouncedSearchQuery.toLowerCase();
    return publicWorkspaces.filter(workspace =>
      workspace.name.toLowerCase().includes(query) ||
      workspace.description?.toLowerCase().includes(query) ||
      workspace.owner.firstName?.toLowerCase().includes(query) ||
      workspace.owner.lastName?.toLowerCase().includes(query)
    );
  }, [debouncedSearchQuery, publicWorkspaces]);

  // Memoized workspace statistics
  const workspaceStats = useMemo(() => ({
    totalWorkspaces: myWorkspaces.length,
    publicAvailable: filteredPublicWorkspaces.length,
    hasSearchQuery: debouncedSearchQuery.trim() !== ''
  }), [myWorkspaces.length, filteredPublicWorkspaces.length, debouncedSearchQuery]);

  // Theme classes
  const textClass = isDark ? 'text-white' : 'text-slate-800';
  const textSecondaryClass = isDark ? 'text-slate-300/70' : 'text-slate-500';
  const glassCardClass = isDark ? 'bg-slate-900/40' : 'bg-white/60';
  const inputClass = isDark
    ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-white/20 focus:shadow-[0_0_18px_rgba(255,255,255,0.08)]'
    : 'bg-white/40 border-white/30 text-slate-800 placeholder:text-slate-500 focus:ring-2 focus:ring-white/50';

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      const workspaceData = {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        color: createForm.color,
        settings: {
          isPublic: createForm.isPublic
        }
      };

      const response = await workspaceService.createWorkspace(workspaceData);
      
      if (response.success) {
        setMyWorkspaces(prev => [response.data, ...prev]);
        setShowCreateModal(false);
        setCreateForm({ name: '', description: '', color: '#3B82F6', isPublic: false });
      }
    } catch (error) {
      console.error('Create workspace error:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  const openEditModal = (workspace) => {
    setEditingWorkspace(workspace);
    setEditForm({
      name: workspace.name,
      description: workspace.description || '',
      color: workspace.color,
      isPublic: workspace.settings?.isPublic || false
    });
    setIsEditModalOpen(true);
    setDropdownOpen(null);
  };

  const handleUpdateWorkspace = async (e) => {
    e.preventDefault();
    
    try {
      const updateData = {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        color: editForm.color,
        settings: {
          isPublic: editForm.isPublic
        }
      };

      const response = await workspaceService.updateWorkspace(editingWorkspace._id, updateData);
      
      if (response.success) {
        setMyWorkspaces(myWorkspaces.map(ws => 
          ws._id === editingWorkspace._id ? response.data : ws
        ));
        setIsEditModalOpen(false);
        setEditingWorkspace(null);
        setEditForm({ name: '', description: '', color: '#3B82F6', isPublic: false });
      }
    } catch (error) {
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
        setMyWorkspaces(myWorkspaces.filter(ws => ws._id !== workspaceId));
      }
    } catch (error) {
      console.error('Delete workspace error:', error);
    }
    setDropdownOpen(null);
  };

  const handleJoinWorkspace = async (workspaceId) => {
    setJoiningWorkspaceId(workspaceId);
    try {
      const response = await workspaceService.joinWorkspace(workspaceId);
      if (response.success) {
        // Move workspace from public list to user's workspaces
        const joinedWorkspace = publicWorkspaces.find(ws => ws._id === workspaceId);
        if (joinedWorkspace) {
          setMyWorkspaces(prev => [response.data, ...prev]);
          setPublicWorkspaces(prev => prev.filter(ws => ws._id !== workspaceId));
        }
        alert('Successfully joined the workspace!');
      }
    } catch (error) {
      console.error('Join workspace error:', error);
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert('Failed to join workspace. Please try again.');
      }
    } finally {
      setJoiningWorkspaceId(null);
    }
  };

  if (loading) {
    return (
      <GlassPageContainer>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-white' : 'border-blue-600'} mx-auto`}></div>
            <p className={`mt-4 ${textClass}`}>Loading workspaces...</p>
          </div>
        </div>
      </GlassPageContainer>
    );
  }

  return (
    <GlassPageContainer className="p-2 sm:p-4 md:p-6 max-w-7xl mx-auto">
      <GlassHeader activeNav="workspaces">
        {/* Search Bar */}
        <div className="relative flex justify-end mb-4 sm:mb-6">
          <div className="relative w-full sm:w-80 md:w-96">
            <Search className={`w-4 h-4 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 ${textSecondaryClass}`} />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`backdrop-blur-xl border rounded-full w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm transition-all focus:outline-none ${inputClass}`}
            />
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className={`mb-4 ${isDark ? 'bg-red-900/40' : 'bg-red-50/80'} backdrop-blur-xl border ${isDark ? 'border-red-500/30' : 'border-red-200'} rounded-2xl p-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${isDark ? 'text-red-300' : 'text-red-500'}`} />
                <p className={`text-sm ${isDark ? 'text-red-200' : 'text-red-700'}`}>{error}</p>
              </div>
              <button
                onClick={fetchWorkspaces}
                className={`px-3 py-1 ${isDark ? 'bg-red-500/20 hover:bg-red-500/30' : 'bg-red-100 hover:bg-red-200'} ${isDark ? 'text-red-200' : 'text-red-700'} rounded-lg text-sm font-medium transition-colors`}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <GlassCard className="flex flex-col flex-1 overflow-hidden">
          {/* View Toggle */}
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${textClass}`}>Workspaces</h2>
            <div className={`flex items-center gap-1 p-1 rounded-full border backdrop-blur-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/30 border-white/20'}`}>
              <button
                onClick={() => setActiveView('my-workspaces')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeView === 'my-workspaces'
                    ? (isDark
                        ? 'bg-white/10 text-white shadow-[0_0_18px_rgba(255,255,255,0.10)]'
                        : 'bg-white/50 text-slate-800 shadow-sm')
                    : (isDark
                        ? 'text-slate-300/70 hover:text-white hover:bg-white/5'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/20')
                }`}
              >
                My Workspaces
              </button>
              <button
                onClick={() => setActiveView('discover')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeView === 'discover'
                    ? (isDark
                        ? 'bg-white/10 text-white shadow-[0_0_18px_rgba(255,255,255,0.10)]'
                        : 'bg-white/50 text-slate-800 shadow-sm')
                    : (isDark
                        ? 'text-slate-300/70 hover:text-white hover:bg-white/5'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/20')
                }`}
              >
                Discover
              </button>
            </div>
          </div>

          {/* My Workspaces View */}
          {activeView === 'my-workspaces' && (
            <div className="dashboard-scroll flex-1 overflow-auto">
              <div className="flex items-center justify-between mb-6">
                <p className={textSecondaryClass}>
                  {myWorkspaces.length} workspace{myWorkspaces.length !== 1 ? 's' : ''}
                </p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white text-sm font-medium transition-all ${isDark ? 'shadow-[0_0_22px_rgba(59,130,246,0.35)] hover:shadow-[0_0_30px_rgba(59,130,246,0.45)]' : 'shadow-lg'}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>New Workspace</span>
                </button>
              </div>

              {myWorkspaces.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className={`w-16 h-16 ${textSecondaryClass} mx-auto mb-4`} />
                  <h3 className={`text-lg font-medium ${textClass} mb-2`}>No workspaces yet</h3>
                  <p className={`${textSecondaryClass} mb-6`}>Create your first workspace to get started with organizing your projects.</p>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white text-sm font-medium transition-all mx-auto ${isDark ? 'shadow-[0_0_22px_rgba(59,130,246,0.35)]' : 'shadow-lg'}`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Workspace</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myWorkspaces.map((workspace) => (
                    <div key={workspace._id} className="relative">
                      {/* Dropdown Menu */}
                      <div className="absolute top-4 right-4 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDropdownOpen(dropdownOpen === workspace._id ? null : workspace._id);
                          }}
                          className={`p-1 ${textSecondaryClass} hover:${textClass} rounded transition-colors`}
                          aria-label="Workspace options menu"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {dropdownOpen === workspace._id && (
                          <div className={`absolute right-0 mt-2 w-48 ${glassCardClass} backdrop-blur-xl border ${isDark ? 'border-white/10' : 'border-white/40'} rounded-xl shadow-xl`}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(workspace);
                              }}
                              className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${textClass} ${isDark ? 'hover:bg-white/10' : 'hover:bg-white/50'} rounded-t-xl transition-colors`}
                            >
                              <Pencil className="w-4 h-4" />
                              <span>Edit Workspace</span>
                            </button>
                            {workspace.owner._id === user._id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteWorkspace(workspace._id);
                                }}
                                className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${isDark ? 'text-red-400 hover:bg-red-500/20' : 'text-red-600 hover:bg-red-50'} rounded-b-xl transition-colors`}
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete Workspace</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <WorkspaceListItem workspace={workspace} onMenuClick={() => setDropdownOpen(workspace._id)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Discover View */}
          {activeView === 'discover' && (
            <div className="dashboard-scroll flex-1 overflow-auto">
              {/* Discover Search Bar */}
              <div className="max-w-md mb-6">
                <div className="relative">
                  <Search className={`w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 ${textSecondaryClass}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`backdrop-blur-xl border rounded-full w-full pl-10 pr-4 py-2 text-sm transition-all focus:outline-none ${inputClass}`}
                    placeholder="Search public workspaces..."
                  />
                </div>
              </div>

              {filteredPublicWorkspaces.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className={`w-16 h-16 ${textSecondaryClass} mx-auto mb-4`} />
                  <h3 className={`text-lg font-medium ${textClass} mb-2`}>
                    {searchQuery ? 'No workspaces found' : 'No public workspaces available'}
                  </h3>
                  <p className={`${textSecondaryClass} mb-6`}>
                    {searchQuery 
                      ? `No public workspaces match "${searchQuery}". Try a different search term.`
                      : 'There are currently no public workspaces that you can join. Check back later!'
                    }
                  </p>
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className={`px-4 py-2 rounded-full ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'} ${textClass} text-sm font-medium transition-colors`}
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Results Header */}
                  <div className="flex items-center justify-between mb-4">
                    <p className={`text-sm ${textSecondaryClass}`}>
                      {searchQuery 
                        ? `Found ${filteredPublicWorkspaces.length} workspace${filteredPublicWorkspaces.length !== 1 ? 's' : ''} matching "${searchQuery}"`
                        : `${filteredPublicWorkspaces.length} public workspace${filteredPublicWorkspaces.length !== 1 ? 's' : ''} available to join`
                      }
                    </p>
                  </div>

                  {/* Workspaces Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPublicWorkspaces.map((workspace) => (
                      <div 
                        key={workspace._id} 
                        className={`${glassCardClass} backdrop-blur-xl border ${isDark ? 'border-white/10' : 'border-white/40'} rounded-2xl p-6 ${isDark ? 'hover:bg-slate-900/60' : 'hover:bg-white/80'} transition-all relative`}
                      >
                        {/* Public Badge */}
                        <div className="absolute top-4 right-4">
                          <span className={`px-2 py-1 ${isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-800'} text-xs font-medium rounded-full flex items-center gap-1`}>
                            <Globe className="w-3 h-3" />
                            <span>Public</span>
                          </span>
                        </div>

                        <div className="flex items-start gap-4">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: workspace.color }}
                          >
                            <Briefcase className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0 pr-16">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-semibold ${textClass} truncate`}>
                                {workspace.name}
                              </h3>
                            </div>
                            
                            {/* Owner Info */}
                            <div className="flex items-center gap-1 mb-2">
                              <span className={`text-xs ${textSecondaryClass}`}>by</span>
                              <span className={`text-xs font-medium ${textClass}`}>
                                {workspace.owner?.firstName || workspace.owner?.username || workspace.owner?.email || 'Unknown'}{workspace.owner?.lastName ? ` ${workspace.owner.lastName}` : ''}
                              </span>
                            </div>

                            {workspace.description && (
                              <p className={`${textSecondaryClass} text-sm mb-3 line-clamp-2`}>
                                {workspace.description}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between mt-4">
                              <div className={`flex items-center gap-1 text-sm ${textSecondaryClass}`}>
                                <span>
                                  {(workspace.memberCount ?? workspace.members?.length ?? 1)} member
                                  {(workspace.memberCount ?? workspace.members?.length ?? 1) !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {workspace.lastActivity && (
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{new Date(workspace.lastActivity).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>

                            {/* Join Button */}
                            <div className={`mt-3 pt-3 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                              <button
                                onClick={() => handleJoinWorkspace(workspace._id)}
                                disabled={joiningWorkspaceId === workspace._id}
                                className={`w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white text-sm font-medium transition-all ${isDark ? 'shadow-[0_0_22px_rgba(59,130,246,0.35)]' : 'shadow-lg'} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                              >
                                {joiningWorkspaceId === workspace._id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Joining...</span>
                                  </>
                                ) : (
                                  <span>Join Workspace</span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </GlassCard>
      </GlassHeader>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${glassCardClass} backdrop-blur-xl border ${isDark ? 'border-white/10' : 'border-white/40'} rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto`}>
            <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h2 className={`text-xl font-semibold ${textClass}`}>Create New Workspace</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className={`${textSecondaryClass} hover:${textClass} transition-colors`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${textClass} mb-2`}>
                    Workspace Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className={`w-full px-4 py-2 rounded-xl border backdrop-blur-xl transition-all focus:outline-none ${inputClass}`}
                    placeholder="Enter workspace name"
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${textClass} mb-2`}>Description</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className={`w-full px-4 py-2 rounded-xl border backdrop-blur-xl transition-all focus:outline-none ${inputClass}`}
                    placeholder="Describe your workspace"
                    rows="3"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${textClass} mb-2`}>Color</label>
                  <div className="flex gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${createForm.color === color.value ? (isDark ? 'border-white' : 'border-gray-700') : (isDark ? 'border-white/20' : 'border-gray-200')} transition-all`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setCreateForm({ ...createForm, color: color.value })}
                        aria-label={`Select ${color.name} color`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={createForm.isPublic}
                      onChange={(e) => setCreateForm({ ...createForm, isPublic: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className={`text-sm font-medium ${textClass}`}>Make this workspace public</span>
                  </label>
                  <p className={`text-xs ${textSecondaryClass} mt-1`}>Public workspaces can be discovered and joined by other users</p>
                </div>
              </div>

              <div className={`flex items-center justify-end gap-3 mt-6 pt-6 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createLoading}
                  className={`px-4 py-2 rounded-full ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'} ${textClass} text-sm font-medium transition-colors disabled:opacity-50`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !createForm.name.trim()}
                  className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white text-sm font-medium transition-all ${isDark ? 'shadow-[0_0_22px_rgba(59,130,246,0.35)]' : 'shadow-lg'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {createLoading ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Workspace Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${glassCardClass} backdrop-blur-xl border ${isDark ? 'border-white/10' : 'border-white/40'} rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto`}>
            <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h2 className={`text-xl font-semibold ${textClass}`}>Edit Workspace</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className={`${textSecondaryClass} hover:${textClass} transition-colors`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateWorkspace} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${textClass} mb-2`}>
                    Workspace Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className={`w-full px-4 py-2 rounded-xl border backdrop-blur-xl transition-all focus:outline-none ${inputClass}`}
                    placeholder="Enter workspace name"
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${textClass} mb-2`}>Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className={`w-full px-4 py-2 rounded-xl border backdrop-blur-xl transition-all focus:outline-none ${inputClass}`}
                    placeholder="Describe your workspace"
                    rows="3"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${textClass} mb-2`}>Color</label>
                  <div className="flex gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${editForm.color === color.value ? (isDark ? 'border-white' : 'border-gray-700') : (isDark ? 'border-white/20' : 'border-gray-200')} transition-all`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setEditForm({ ...editForm, color: color.value })}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.isPublic}
                      onChange={(e) => setEditForm({ ...editForm, isPublic: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className={`text-sm font-medium ${textClass}`}>Make this workspace public</span>
                  </label>
                  <p className={`text-xs ${textSecondaryClass} mt-1`}>Public workspaces can be discovered and joined by other users</p>
                </div>
              </div>

              <div className={`flex items-center justify-end gap-3 mt-6 pt-6 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className={`px-4 py-2 rounded-full ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'} ${textClass} text-sm font-medium transition-colors`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editForm.name.trim()}
                  className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white text-sm font-medium transition-all ${isDark ? 'shadow-[0_0_22px_rgba(59,130,246,0.35)]' : 'shadow-lg'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Update Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </GlassPageContainer>
  );
};

Workspaces.propTypes = {
  // This component receives props from React Router and context providers
  // No direct props expected
};

export default Workspaces;