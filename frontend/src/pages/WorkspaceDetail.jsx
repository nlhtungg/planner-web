import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import workspaceService from '../services/workspaceService';
import AddMemberModal from '../components/AddMemberModal';
import RemoveMemberModal from '../components/RemoveMemberModal';
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

  // Mock data for workspace content
  const recentActivity = [
    { id: 1, type: 'document', action: 'created', item: 'Project Requirements.docx', user: 'Alice Johnson', time: '2 hours ago', avatar: 'AJ' },
    { id: 2, type: 'task', action: 'completed', item: 'Review API documentation', user: 'Bob Smith', time: '4 hours ago', avatar: 'BS' },
    { id: 3, type: 'comment', action: 'commented on', item: 'Design System Updates', user: 'Carol Davis', time: '6 hours ago', avatar: 'CD' },
    { id: 4, type: 'member', action: 'joined', item: 'the workspace', user: 'David Wilson', time: '1 day ago', avatar: 'DW' },
  ];

  const tasks = [
    { id: 1, title: 'Update user interface mockups', status: 'in-progress', assignee: 'Alice Johnson', dueDate: '2025-11-25' },
    { id: 2, title: 'Implement authentication system', status: 'completed', assignee: 'Bob Smith', dueDate: '2025-11-20' },
    { id: 3, title: 'Write API documentation', status: 'pending', assignee: 'Carol Davis', dueDate: '2025-11-28' },
    { id: 4, title: 'Set up CI/CD pipeline', status: 'in-progress', assignee: 'David Wilson', dueDate: '2025-11-30' },
  ];

  const documents = [
    { id: 1, name: 'Project Requirements.docx', type: 'document', size: '2.4 MB', modified: '2 hours ago', author: 'Alice Johnson' },
    { id: 2, name: 'API Specifications.pdf', type: 'pdf', size: '1.8 MB', modified: '1 day ago', author: 'Bob Smith' },
    { id: 3, name: 'Design Assets.zip', type: 'archive', size: '15.2 MB', modified: '2 days ago', author: 'Carol Davis' },
    { id: 4, name: 'Meeting Notes.md', type: 'markdown', size: '45 KB', modified: '3 days ago', author: 'David Wilson' },
  ];

  useEffect(() => {
    fetchWorkspace();
  }, [workspaceId]);

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
      const response = await workspaceService.removeMember(workspaceId, memberId);
      if (response.success) {
        setWorkspace(response.data);
        setIsRemoveMemberModalOpen(false);
        setMemberToRemove(null);
        // You could add a success toast here
      }
    } catch (error) {
      console.error('Remove member error:', error);
      alert('Failed to remove member. Please try again.');
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
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
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
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
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
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
                  <div className="text-2xl font-bold text-green-600">{tasks.filter(t => t.status === 'completed').length}</div>
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
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      workspace.settings?.isPublic 
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
                  <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
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
              <button className="btn-primary flex items-center space-x-2">
                <PlusIcon className="w-4 h-4" />
                <span>New Task</span>
              </button>
            </div>
            
            <div className="card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Task</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Assignee</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{task.title}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status.replace('-', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{task.assignee}</td>
                        <td className="py-3 px-4 text-gray-700">{new Date(task.dueDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
              <button className="btn-primary flex items-center space-x-2">
                <PlusIcon className="w-4 h-4" />
                <span>Upload Document</span>
              </button>
            </div>
            
            <div className="card">
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900">{doc.name}</h4>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>{doc.size}</span>
                        <span>•</span>
                        <span>Modified {doc.modified}</span>
                        <span>•</span>
                        <span>by {doc.author}</span>
                      </div>
                    </div>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <EllipsisVerticalIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900">
                        {member.user.firstName} {member.user.lastName}
                      </h4>
                      <p className="text-sm text-gray-500">{member.user.email}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        member.role === 'owner' 
                          ? 'bg-purple-100 text-purple-800'
                          : member.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.role.toUpperCase()}
                      </span>
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
    </div>
  );
};

export default WorkspaceDetail;