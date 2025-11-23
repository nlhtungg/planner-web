import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const Home = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSection, setActiveSection] = useState('workspaces');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarItems = [
    { id: 'home', name: 'Home', icon: HomeIcon, active: true },
    { id: 'workspaces', name: 'Workspaces', icon: BriefcaseIcon, active: false },
    { id: 'connections', name: 'Connections', icon: UserGroupIcon, active: false },
    { id: 'messages', name: 'Messages', icon: ChatBubbleLeftRightIcon, active: false },
    { id: 'calendar', name: 'Calendar', icon: CalendarDaysIcon, active: false },
  ];

  const recentWorkspaces = [
    { id: 1, name: 'Project Alpha', description: 'Main development project', lastActivity: '2 hours ago', members: 5, color: 'bg-blue-500' },
    { id: 2, name: 'Marketing Campaign', description: 'Q4 marketing initiatives', lastActivity: '5 hours ago', members: 8, color: 'bg-green-500' },
    { id: 3, name: 'Product Design', description: 'UI/UX design workflows', lastActivity: '1 day ago', members: 3, color: 'bg-purple-500' },
  ];

  const upcomingEvents = [
    { id: 1, title: 'Team Standup', time: '9:00 AM', date: 'Today', type: 'meeting' },
    { id: 2, title: 'Project Review', time: '2:00 PM', date: 'Today', type: 'review' },
    { id: 3, title: 'Client Presentation', time: '10:00 AM', date: 'Tomorrow', type: 'presentation' },
  ];

  const recentMessages = [
    { id: 1, sender: 'Alice Johnson', message: 'The new designs are ready for review', time: '5 min ago', avatar: 'AJ' },
    { id: 2, sender: 'Bob Smith', message: 'Meeting moved to 3 PM today', time: '12 min ago', avatar: 'BS' },
    { id: 3, sender: 'Carol Davis', message: 'Great work on the presentation!', time: '25 min ago', avatar: 'CD' },
  ];

  const quickStats = [
    { label: 'Active Projects', value: '8', change: '+2', positive: true },
    { label: 'Tasks Completed', value: '24', change: '+6', positive: true },
    { label: 'Team Members', value: '12', change: '+1', positive: true },
    { label: 'Pending Reviews', value: '3', change: '-1', positive: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo and Search */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Planner</h1>
            </div>
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search workspaces, people, or content..."
                className="pl-10 pr-4 py-2 w-96 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <BellIcon className="w-5 h-5" />
            </button>
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
                <p className="text-xs text-gray-500">{user?.email}</p>
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

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm h-screen sticky top-0 border-r border-gray-200">
          <nav className="p-4 space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => item.id === 'workspaces' ? navigate('/workspaces') : setActiveSection(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeSection === item.id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Actions */}
          <div className="p-4 border-t border-gray-200 mt-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={() => navigate('/workspaces')}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <PlusIcon className="w-4 h-4" />
                <span>New Workspace</span>
              </button>
              <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                <UserGroupIcon className="w-4 h-4" />
                <span>Invite Members</span>
              </button>
              <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                <Cog6ToothIcon className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Good {currentTime.getHours() < 12 ? 'morning' : currentTime.getHours() < 18 ? 'afternoon' : 'evening'}, {user?.firstName}! 👋
                </h2>
                <p className="text-gray-600 mt-1">
                  {currentTime.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {currentTime.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
                <p className="text-sm text-gray-500">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {quickStats.map((stat, index) => (
              <div key={index} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`text-sm font-medium ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Workspaces Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Workspaces</h3>
                  <button 
                    onClick={() => navigate('/workspaces')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-4">
                  {recentWorkspaces.map((workspace) => (
                    <div key={workspace.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className={`w-10 h-10 ${workspace.color} rounded-lg flex items-center justify-center`}>
                        <BriefcaseIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{workspace.name}</h4>
                        <p className="text-sm text-gray-600">{workspace.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <ClockIcon className="w-3 h-3" />
                            <span>{workspace.lastActivity}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <UserGroupIcon className="w-3 h-3" />
                            <span>{workspace.members} members</span>
                          </span>
                        </div>
                      </div>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <EllipsisVerticalIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Messages Section */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Workspaces</h3>
                  <button 
                    onClick={() => navigate('/workspaces')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-3">
                  {recentMessages.map((message) => (
                    <div key={message.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-700">{message.avatar}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{message.sender}</p>
                          <p className="text-xs text-gray-500">{message.time}</p>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{message.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Calendar Section */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View calendar
                  </button>
                </div>
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center space-x-3 p-3 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg">
                      <div className="flex-shrink-0">
                        <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{event.title}</p>
                        <p className="text-xs text-gray-600">{event.date} at {event.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connections Section */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Team Connections</h3>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Manage
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                      <span className="text-sm text-gray-700">Online Team Members</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">8</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                      <span className="text-sm text-gray-700">Away</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                      <span className="text-sm text-gray-700">Offline</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">1</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => navigate('/workspaces')}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Create New Project</span>
                  </button>
                  <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <UserGroupIcon className="w-4 h-4" />
                    <span>Invite Team Member</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;