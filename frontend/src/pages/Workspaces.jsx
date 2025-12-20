import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConnection } from '../context/ConnectionContext';
import workspaceService from '../services/workspaceService';
import WorkspaceListItem from '../components/WorkspaceListItem';
import {
  HomeIcon,
  BriefcaseIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  BellIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  ExclamationCircleIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const Workspaces = () => {
  const { user, logout } = useAuth();
  const { pendingRequestsCount } = useConnection();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeView, setActiveView] = useState('my-workspaces'); // 'my-workspaces' or 'discover'
  const [myWorkspaces, setMyWorkspaces] = useState([]);
  const [publicWorkspaces, setPublicWorkspaces] = useState([]);
  const [filteredPublicWorkspaces, setFilteredPublicWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [joiningWorkspaceId, setJoiningWorkspaceId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  const sidebarItems = [
    { id: 'home', name: 'Home', icon: HomeIcon, path: '/home' },
    { id: 'workspaces', name: 'Workspaces', icon: BriefcaseIcon, path: '/workspaces', active: true },
    { id: 'connections', name: 'Connections', icon: UserGroupIcon, path: '/connections', active: false },
    { id: 'messages', name: 'Messages', icon: ChatBubbleLeftRightIcon, path: '/messages', active: false },
    { id: 'calendar', name: 'Calendar', icon: CalendarDaysIcon, path: '/calendar', active: false },
  ];

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

  useEffect(() => {
    // Filter public workspaces based on search query
    if (searchQuery.trim() === '') {
      setFilteredPublicWorkspaces(publicWorkspaces);
    } else {
      const filtered = publicWorkspaces.filter(workspace =>
        workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workspace.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workspace.owner.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workspace.owner.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPublicWorkspaces(filtered);
    }
  }, [searchQuery, publicWorkspaces]);

  const fetchWorkspaces = async () => {
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
        setFilteredPublicWorkspaces(publicNonMemberWorkspaces);
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
          setFilteredPublicWorkspaces(prev => prev.filter(ws => ws._id !== workspaceId));
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
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 sm:gap-6 justify-between flex-wrap">
            {/* Left: Menu + Logo */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                className="md:hidden p-2.5 rounded-xl hover:bg-gray-100 text-gray-700"
                aria-label="Open sidebar"
                onClick={() => setSidebarOpen(true)}
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 hidden sm:block">Planner</h1>
            </div>

            {/* Middle: Search (full-width on mobile) */}
            <div className="relative flex-1 min-w-[200px] w-full order-last sm:order-none">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search workspaces, people, or content..."
                className="pl-12 pr-4 py-2.5 w-full sm:w-96 bg-gray-100 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>

            {/* Right: Date/Time + User */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-right px-3 py-2 bg-gray-50 rounded-xl hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">
                  {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-gray-500">
                  {currentTime.toLocaleDateString('en-US', { weekday: 'long' })}
                </p>
              </div>
              <button className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                <BellIcon className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3 border-l border-gray-200 pl-4 sm:pl-6">
                <button 
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-3 hover:bg-gray-50 rounded-xl px-3 py-2 transition-colors"
                >
                  <div className="w-11 h-11 bg-blue-500 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-blue-100">
                    {user?.avatar ? (
                      <img
                        src={`${user.avatar}?t=${Date.now()}`}
                        alt="Profile Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-base font-semibold">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </span>
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </button>
                <button 
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:block w-72 bg-white shadow-sm h-screen sticky top-0 border-r border-gray-200">
          <nav className="p-6 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => item.path ? navigate(item.path) : null}
                  className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl text-left transition-all ${
                    item.active
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 font-medium'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-base">{item.name}</span>
                  {item.id === 'connections' && pendingRequestsCount > 0 && (
                    <span className="ml-auto bg-red-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold">
                      {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)}></div>
            <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl border-r border-gray-200 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">P</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">Planner</span>
                </div>
                <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(false)}>
                  <XMarkIcon className="w-6 h-6 text-gray-700" />
                </button>
              </div>
              <nav className="space-y-1">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const handleClick = () => {
                    if (item.path) navigate(item.path);
                    setSidebarOpen(false);
                  };
                  return (
                    <button
                      key={item.id}
                      onClick={handleClick}
                      className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl text-left transition-all ${
                        item.active
                          ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50 font-medium'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-base">{item.name}</span>
                      {item.id === 'connections' && pendingRequestsCount > 0 && (
                        <span className="ml-auto bg-red-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold">
                          {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Page Header with Navigation */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Workspaces</h2>
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveView('my-workspaces')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'my-workspaces'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                My Workspaces
              </button>
              <button
                onClick={() => setActiveView('discover')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'discover'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Discover
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* My Workspaces View */}
          {activeView === 'my-workspaces' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-gray-600">
                  {myWorkspaces.length} workspace{myWorkspaces.length !== 1 ? 's' : ''}
                </p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>New Workspace</span>
                </button>
              </div>

              {myWorkspaces.length === 0 ? (
                <div className="text-center py-12">
                  <BriefcaseIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No workspaces yet</h3>
                  <p className="text-gray-600 mb-6">Create your first workspace to get started with organizing your projects.</p>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary flex items-center space-x-2 mx-auto"
                  >
                    <PlusIcon className="w-4 h-4" />
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
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <EllipsisVerticalIcon className="w-5 h-5" />
                        </button>

                        {dropdownOpen === workspace._id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(workspace);
                              }}
                              className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                            >
                              <PencilIcon className="w-4 h-4" />
                              <span>Edit Workspace</span>
                            </button>
                            {workspace.owner._id === user._id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteWorkspace(workspace._id);
                                }}
                                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                              >
                                <TrashIcon className="w-4 h-4" />
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
            <div>
              {/* Search Bar */}
              <div className="max-w-md mb-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Search public workspaces..."
                  />
                </div>
              </div>

              {filteredPublicWorkspaces.length === 0 ? (
                <div className="text-center py-12">
                  <GlobeAltIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ? 'No workspaces found' : 'No public workspaces available'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchQuery 
                      ? `No public workspaces match "${searchQuery}". Try a different search term.`
                      : 'There are currently no public workspaces that you can join. Check back later!'
                    }
                  </p>
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="btn-secondary"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Results Header */}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-600">
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
                        className="card hover:shadow-lg transition-shadow relative"
                      >
                        {/* Public Badge */}
                        <div className="absolute top-4 right-4">
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center space-x-1">
                            <GlobeAltIcon className="w-3 h-3" />
                            <span>Public</span>
                          </span>
                        </div>

                        <div className="flex items-start space-x-4">
                          <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: workspace.color }}
                          >
                            <BriefcaseIcon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0 pr-16">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {workspace.name}
                              </h3>
                            </div>
                            
                            {/* Owner Info */}
                            <div className="flex items-center space-x-1 mb-2">
                              <span className="text-xs text-gray-500">by</span>
                              <span className="text-xs font-medium text-gray-700">
                                {workspace.owner?.firstName || workspace.owner?.username || workspace.owner?.email || 'Unknown'}{workspace.owner?.lastName ? ` ${workspace.owner.lastName}` : ''}
                              </span>
                            </div>

                            {workspace.description && (
                              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                {workspace.description}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <div className="flex items-center space-x-1">
                                  <UserGroupIcon className="w-4 h-4" />
                                  <span>
                                    {(workspace.memberCount ?? workspace.members?.length ?? 1)} member
                                    {(workspace.memberCount ?? workspace.members?.length ?? 1) !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                {workspace.lastActivity && (
                                  <div className="flex items-center space-x-1">
                                    <ClockIcon className="w-4 h-4" />
                                    <span>{new Date(workspace.lastActivity).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Join Button */}
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <button
                                onClick={() => handleJoinWorkspace(workspace._id)}
                                disabled={joiningWorkspaceId === workspace._id}
                                className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
        </main>
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create Workspace</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workspace Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter workspace name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your workspace"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <div className="flex space-x-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${createForm.color === color.value ? 'border-gray-400' : 'border-gray-200'}`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setCreateForm({ ...createForm, color: color.value })}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={createForm.isPublic}
                      onChange={(e) => setCreateForm({ ...createForm, isPublic: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Make this workspace public</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Public workspaces can be discovered and joined by other users</p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                  disabled={createLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={createLoading || !createForm.name.trim()}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Workspace</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateWorkspace} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workspace Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter workspace name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your workspace"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <div className="flex space-x-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${editForm.color === color.value ? 'border-gray-400' : 'border-gray-200'}`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setEditForm({ ...editForm, color: color.value })}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editForm.isPublic}
                      onChange={(e) => setEditForm({ ...editForm, isPublic: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Make this workspace public</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Public workspaces can be discovered and joined by other users</p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!editForm.name.trim()}
                >
                  Update Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspaces;