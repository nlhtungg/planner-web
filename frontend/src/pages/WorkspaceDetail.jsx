import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import workspaceService from '../services/workspaceService';
import { getTasksByWorkspace, createTask, assignTaskByIdentifier, assignTask, deleteTask } from '../services/taskService';
import { Link } from 'react-router-dom';
import { percentOf } from '../utils/taskUtils';
import AddMemberModal from '../components/AddMemberModal';
import RemoveMemberModal from '../components/RemoveMemberModal';
import UserFuzzySelect from '../components/UserFuzzySelect';
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  ClockIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserPlusIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import DocumentList from '../components/DocumentList';

const WorkspaceDetail = () => {
  const { workspaceId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);
  const [memberToChangeRole, setMemberToChangeRole] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [changingRoleLoading, setChangingRoleLoading] = useState(false);

  // Mock data for workspace content
  const recentActivity = [
    { id: 1, type: 'document', action: 'created', item: 'Project Requirements.docx', user: 'Alice Johnson', time: '2 hours ago', avatar: 'AJ' },
    { id: 2, type: 'task', action: 'completed', item: 'Review API documentation', user: 'Bob Smith', time: '4 hours ago', avatar: 'BS' },
    { id: 3, type: 'comment', action: 'commented on', item: 'Design System Updates', user: 'Carol Davis', time: '6 hours ago', avatar: 'CD' },
    { id: 4, type: 'member', action: 'joined', item: 'the workspace', user: 'David Wilson', time: '1 day ago', avatar: 'DW' },
  ];

  // Tasks state (real data)
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', priority: 'medium', assignees: [] });
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskFilters, setTaskFilters] = useState({ status: 'all', assignee: 'all' });
  const [quickAssign, setQuickAssign] = useState({}); // { [taskId]: identifier }

  const documents = [
    { id: 1, name: 'Project Requirements.docx', type: 'document', size: '2.4 MB', modified: '2 hours ago', author: 'Alice Johnson' },
    { id: 2, name: 'API Specifications.pdf', type: 'pdf', size: '1.8 MB', modified: '1 day ago', author: 'Bob Smith' },
    { id: 3, name: 'Design Assets.zip', type: 'archive', size: '15.2 MB', modified: '2 days ago', author: 'Carol Davis' },
    { id: 4, name: 'Meeting Notes.md', type: 'markdown', size: '45 KB', modified: '3 days ago', author: 'David Wilson' },
  ];

  useEffect(() => {
    fetchWorkspace();
  }, [workspaceId]);

  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTasks();
    }
  }, [activeTab, workspaceId]);
  const fetchTasks = async () => {
    setTasksLoading(true);
    setTasksError('');
    try {
      const res = await getTasksByWorkspace(workspaceId);
      // Backend returns array of task objects
      setTasks(res.data);
    } catch (err) {
      setTasksError(err.response?.data?.message || 'Failed to load tasks');
    } finally {
      setTasksLoading(false);
    }
  };

  const openTaskModal = () => {
    setNewTask({ title: '', description: '', dueDate: '', priority: 'medium', assignees: [] });
    setIsTaskModalOpen(true);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title) return;
    setCreatingTask(true);
    try {
      const payload = {
        title: newTask.title,
        description: newTask.description,
        dueDate: newTask.dueDate || undefined,
        priority: newTask.priority,
        workspace: workspaceId,
        assignees: (newTask.assignees || []).map(a => a?._id || a).filter(Boolean)
      };
      const res = await createTask(payload);
      setTasks(prev => [res.data, ...prev]);
      setIsTaskModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (taskFilters.status !== 'all' && t.status !== taskFilters.status) return false;
    if (taskFilters.assignee !== 'all' && !t.assignees?.some(a => (a._id || a) === taskFilters.assignee)) return false;
    return true;
  });

  const handleQuickAssign = async (taskId) => {
    const identifier = (quickAssign[taskId] || '').trim();
    if (!identifier) return;
    try {
      const res = await assignTaskByIdentifier(taskId, identifier);
      setTasks(prev => prev.map(t => t._id === taskId ? res.data : t));
      setQuickAssign(q => ({ ...q, [taskId]: '' }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign');
    }
  };

  const handleAssignToMe = async (taskId) => {
    try {
      const meId = user._id || user.id;
      const task = tasks.find(t => t._id === taskId);
      if (task && task.assignees?.some(a => (a._id || a) === meId)) {
        return; // already assigned; avoid duplicate UI action
      }
      const res = await assignTask(taskId, user._id || user.id);
      setTasks(prev => prev.map(t => t._id === taskId ? res.data : t));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign to me');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteTask(taskId);
      setTasks(prev => prev.filter(t => t._id !== taskId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleUpdateTask = (taskId) => {
    navigate(`/tasks/${taskId}`); // navigate to task detail/edit page if exists
  };

  const fetchWorkspace = async () => {
    try {
      const response = await workspaceService.getWorkspace(workspaceId);
      if (response.success) {
        setWorkspace(response.data);
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch workspace');
      console.error('Fetch workspace error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isOwnerOrAdmin = () => {
    if (!workspace) return false;
    const userRole = workspace.members.find(member =>
      member.user._id === user._id || member.user._id === user.id
    )?.role;
    return userRole === 'owner' || userRole === 'admin';
  };

  const isOwner = () => {
    if (!workspace) return false;
    return workspace.owner._id === user._id || workspace.owner._id === user.id;
  };

  const handleAddMember = async (memberData) => {
    setAddMemberLoading(true);
    try {
      const response = await workspaceService.addMember(workspaceId, memberData);
      if (response.success) {
        setWorkspace(response.data);
        setIsAddMemberModalOpen(false);
        // You could add a success toast here
      }
    } catch (error) {
      console.error('Add member error:', error);
      throw error; // Re-throw to let the modal handle the error
    } finally {
      setAddMemberLoading(false);
    }
  };

  const openRemoveMemberModal = (member) => {
    setMemberToRemove(member);
    setIsRemoveMemberModalOpen(true);
  };

  const handleRemoveMember = async (memberId, memberName) => {
    setRemovingMemberId(memberId);
    try {
      // Check if user is removing themselves
      const isCurrentUser = memberId === user.id || memberId === user._id?.toString();

      const response = isCurrentUser
        ? await workspaceService.leaveWorkspace(workspaceId)
        : await workspaceService.removeMember(workspaceId, memberId);

      if (response.success) {
        if (isCurrentUser) {
          // User left workspace, redirect to workspaces page
          navigate('/workspaces');
        } else {
          setWorkspace(response.data);
          setIsRemoveMemberModalOpen(false);
          setMemberToRemove(null);
        }
      }
    } catch (error) {
      console.error('Remove member error:', error);
      alert(error.response?.data?.message || 'Failed to remove member. Please try again.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const canRemoveMember = (member) => {
    // Can't remove the owner
    if (member.role === 'owner') return false;

    // User can remove themselves (leave workspace) - use email for reliable comparison
    const isCurrentUser = member.user.email === user.email;
    if (isCurrentUser) return true;

    // Only owners and admins can remove other members
    return isOwnerOrAdmin();
  };

  const canChangeRole = (member) => {
    // Can't change owner's role
    if (member.role === 'owner') return false;

    // Can't change own role
    const isCurrentUser = member.user.email === user.email;
    if (isCurrentUser) return false;

    // Only owners can change roles
    return isOwner();
  };

  const openChangeRoleModal = (member) => {
    setMemberToChangeRole(member);
    setSelectedRole(member.role);
    setIsChangeRoleModalOpen(true);
  };

  const handleChangeRole = async () => {
    if (!memberToChangeRole || !selectedRole) return;

    setChangingRoleLoading(true);
    try {
      const response = await workspaceService.updateMemberRole(
        workspaceId,
        memberToChangeRole.user._id || memberToChangeRole.user.id,
        selectedRole
      );

      if (response.success) {
        setWorkspace(response.data);
        setIsChangeRoleModalOpen(false);
        setMemberToChangeRole(null);
        setSelectedRole('');
      }
    } catch (error) {
      console.error('Change role error:', error);
      alert('Failed to change member role. Please try again.');
    } finally {
      setChangingRoleLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'todo': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'document': return DocumentTextIcon;
      case 'task': return CheckCircleIcon;
      case 'comment': return ChatBubbleLeftRightIcon;
      case 'member': return UserGroupIcon;
      default: return ExclamationCircleIcon;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationCircleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Workspace</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/workspaces')}
            className="btn-primary"
          >
            Back to Workspaces
          </button>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/workspaces')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: workspace.color }}
              >
                <BriefcaseIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{workspace.name}</h1>
                <p className="text-sm text-gray-500">{workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isOwnerOrAdmin() && (
              <button className="btn-secondary flex items-center space-x-2">
                <Cog6ToothIcon className="w-4 h-4" />
                <span>Settings</span>
              </button>
            )}
            {isOwnerOrAdmin() && (
              <button
                onClick={() => setIsAddMemberModalOpen(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <UserPlusIcon className="w-4 h-4" />
                <span>Invite</span>
              </button>
            )}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </button>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-t border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview', icon: BriefcaseIcon },
              { id: 'tasks', name: 'Tasks', icon: CheckCircleIcon },
              { id: 'documents', name: 'Documents', icon: DocumentTextIcon },
              { id: 'members', name: 'Members', icon: UserGroupIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Workspace Description */}
              {workspace.description && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">About</h3>
                  <p className="text-gray-700">{workspace.description}</p>
                </div>
              )}

              {/* Recent Activity */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View all
                  </button>
                </div>
                <div className="space-y-4">
                  {recentActivity.map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">{activity.user}</span>{' '}
                            {activity.action}{' '}
                            <span className="font-medium">{activity.item}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card text-center">
                  <div className="text-2xl font-bold text-blue-600">{tasks.length}</div>
                  <div className="text-sm text-gray-600">Total Tasks</div>
                </div>
                <div className="card text-center">
                  <div className="text-2xl font-bold text-green-600">{tasks.filter(t => t.status === 'done').length}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="card text-center">
                  <div className="text-2xl font-bold text-orange-600">{documents.length}</div>
                  <div className="text-sm text-gray-600">Documents</div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Workspace Info */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Workspace Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Owner:</span>
                    <span className="text-gray-900">{workspace.owner.firstName} {workspace.owner.lastName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="text-gray-900">{new Date(workspace.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Last Activity:</span>
                    <span className="text-gray-900">{new Date(workspace.lastActivity).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Visibility:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${workspace.settings?.isPublic
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                      }`}>
                      {workspace.settings?.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                    <PlusIcon className="w-4 h-4" />
                    <span>Create Task</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('documents');
                      setTimeout(() => {
                        document.getElementById('document-upload')?.click();
                      }, 100);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>Upload Document</span>
                  </button>
                  <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                    <CalendarDaysIcon className="w-4 h-4" />
                    <span>Schedule Meeting</span>
                  </button>
                  {isOwnerOrAdmin() && (
                    <button
                      onClick={() => setIsAddMemberModalOpen(true)}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      <UserPlusIcon className="w-4 h-4" />
                      <span>Invite Member</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
              <div className="flex items-center space-x-2">
                <select
                  value={taskFilters.status}
                  onChange={e => setTaskFilters(f => ({ ...f, status: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="todo">Todo</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <button onClick={openTaskModal} className="btn-primary flex items-center space-x-2">
                  <PlusIcon className="w-4 h-4" />
                  <span>New Task</span>
                </button>
              </div>
            </div>

            <div className="card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Task</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Priority</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Progress</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Assignee</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasksLoading && (
                      <tr><td colSpan="4" className="py-4 text-center text-sm text-gray-500">Loading tasks...</td></tr>
                    )}
                    {tasksError && !tasksLoading && (
                      <tr><td colSpan="4" className="py-4 text-center text-sm text-red-600">{tasksError}</td></tr>
                    )}
                    {!tasksLoading && !tasksError && filteredTasks.map((task) => (
                      <tr key={task._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">
                            <Link to={`/tasks/${task._id}`} className="text-blue-600 hover:underline">{task.title}</Link>
                          </div>
                          {task.description && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button className="btn-secondary text-xs" onClick={() => handleUpdateTask(task._id)}>Update</button>
                            <button className="btn-secondary text-xs" onClick={() => handleDeleteTask(task._id)}>Delete</button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status?.replace('-', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {(task.priority || 'medium').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-200 rounded h-2 overflow-hidden">
                                <div
                                  className="h-2 bg-blue-600"
                                  style={{ width: `${percentOf(task.loggedHours, task.estimatedHours)}%` }}
                                  title={`Time: ${task.loggedHours || 0}h / ${task.estimatedHours || 0}h`}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-600">{task.autoProgress || 0}%</span>
                            </div>
                            {typeof task.progress === 'number' && task.progress !== task.autoProgress && (
                              <div className="text-[10px] text-gray-400">Manual: {task.progress}%</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {task.assignees && task.assignees.length > 0 ? (
                            <div className="flex -space-x-2">
                              {task.assignees.slice(0, 3).map((a, idx) => (
                                <div key={`${a._id || a}-${idx}`} className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center border border-white" title={a.firstName ? `${a.firstName} ${a.lastName}` : ''}>
                                  {(a.firstName?.[0] || '?')}{(a.lastName?.[0] || '')}
                                </div>
                              ))}
                              {task.assignees.length > 3 && (
                                <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 text-[10px] flex items-center justify-center border border-white" title={`${task.assignees.length - 3} more`}>+{task.assignees.length - 3}</div>
                              )}
                            </div>
                          ) : <span className="text-xs text-gray-400">Unassigned</span>}
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="email or username"
                              value={quickAssign[task._id] || ''}
                              onChange={(e) => setQuickAssign(q => ({ ...q, [task._id]: e.target.value }))}
                              className="border rounded px-2 py-1 text-xs"
                              style={{ width: '180px' }}
                            />
                            <button
                              className="text-xs btn-secondary"
                              onClick={() => handleQuickAssign(task._id)}
                            >Assign</button>
                            <button
                              className="text-xs btn-secondary"
                              onClick={() => handleAssignToMe(task._id)}
                            >Assign to me</button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : <span className="text-xs text-gray-400">No due date</span>}
                        </td>
                      </tr>
                    ))}
                    {!tasksLoading && !tasksError && filteredTasks.length === 0 && (
                      <tr><td colSpan="4" className="py-4 text-center text-sm text-gray-500">No tasks match filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentList />
        )}

        {activeTab === 'files' && (
          <FileList />
        )}

        {activeTab === 'members' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Members</h2>
              {isOwnerOrAdmin() && (
                <button
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <UserPlusIcon className="w-4 h-4" />
                  <span>Invite Member</span>
                </button>
              )}
            </div>

            <div className="card">
              <div className="space-y-4">
                {workspace.members.map((member) => (
                  <div key={member._id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                    {member.user.avatar ? (
                      <img
                        src={member.user.avatar}
                        alt={`${member.user.firstName} ${member.user.lastName}`}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900">
                        {member.user.firstName} {member.user.lastName}
                      </h4>
                      <p className="text-sm text-gray-500">{member.user.email}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${member.role === 'owner'
                        ? 'bg-purple-100 text-purple-800'
                        : member.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}>
                        {member.role.toUpperCase()}
                      </span>
                      {canChangeRole(member) && (
                        <button
                          onClick={() => openChangeRoleModal(member)}
                          className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                        >
                          <PencilIcon className="w-3 h-3" />
                        </button>
                      )}
                      {canRemoveMember(member) && (
                        <button
                          onClick={() => openRemoveMemberModal(member)}
                          disabled={removingMemberId === (member.user._id || member.user.id)}
                          className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-200 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {removingMemberId === (member.user._id || member.user.id) ? (
                            <div className="flex items-center space-x-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-red-600"></div>
                              <span>Removing...</span>
                            </div>
                          ) : (
                            member.user.email === user.email ? 'Leave' : 'Remove'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onAddMember={handleAddMember}
        loading={addMemberLoading}
      />

      {/* Remove Member Modal */}
      <RemoveMemberModal
        isOpen={isRemoveMemberModalOpen}
        onClose={() => {
          setIsRemoveMemberModalOpen(false);
          setMemberToRemove(null);
        }}
        onConfirm={handleRemoveMember}
        member={memberToRemove}
        isCurrentUser={memberToRemove && memberToRemove.user.email === user.email}
        loading={removingMemberId === (memberToRemove?.user._id || memberToRemove?.user.id)}
      />

      {/* Change Role Modal */}
      {isChangeRoleModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Change Member Role</h2>
              <button
                onClick={() => {
                  setIsChangeRoleModalOpen(false);
                  setMemberToChangeRole(null);
                  setSelectedRole('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {memberToChangeRole && (
                <>
                  <div className="mb-4">
                    <p className="text-gray-700">
                      Change role for <span className="font-medium">
                        {memberToChangeRole.user.firstName} {memberToChangeRole.user.lastName}
                      </span>?
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {memberToChangeRole.user.email}
                    </p>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Role
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="admin"
                          checked={selectedRole === 'admin'}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Admin - Can manage members and settings</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="member"
                          checked={selectedRole === 'member'}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Member - Can view and contribute to workspace</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangeRoleModalOpen(false);
                    setMemberToChangeRole(null);
                    setSelectedRole('');
                  }}
                  className="btn-secondary"
                  disabled={changingRoleLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeRole}
                  className="btn-primary"
                  disabled={changingRoleLoading || !selectedRole || selectedRole === memberToChangeRole?.role}
                >
                  {changingRoleLoading ? 'Changing...' : 'Change Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Task Creation Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <form onSubmit={handleCreateTask}>
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">New Task</h2>
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >×</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    value={newTask.title}
                    onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Task title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={e => setNewTask(t => ({ ...t, description: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={e => setNewTask(t => ({ ...t, dueDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={e => setNewTask(t => ({ ...t, priority: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assignees</label>
                  <UserFuzzySelect
                    workspaceId={workspaceId}
                    onSelect={(u) => setNewTask(t => ({
                      ...t,
                      assignees: (t.assignees || []).some(x => (x._id || x) === u._id)
                        ? t.assignees
                        : [...(t.assignees || []), u]
                    }))}
                  />
                  {newTask.assignees && newTask.assignees.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newTask.assignees.map((a, idx) => (
                        <span key={`${a._id || a}-${idx}`} className="inline-flex items-center gap-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                          <span>{a.displayName || a.email || a}</span>
                          <button
                            type="button"
                            className="text-gray-500 hover:text-gray-700"
                            onClick={() => setNewTask(t => ({
                              ...t,
                              assignees: t.assignees.filter(x => (x._id || x) !== (a._id || a))
                            }))}
                          >×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="btn-secondary"
                  disabled={creatingTask}
                >Cancel</button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creatingTask || !newTask.title}
                >{creatingTask ? 'Creating...' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceDetail;