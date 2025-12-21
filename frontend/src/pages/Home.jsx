import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConnection } from '../context/ConnectionContext';
import { useNavigate, useLocation } from 'react-router-dom';
import workspaceService from '../services/workspaceService';
import WorkspaceListItem from '../components/WorkspaceListItem';
import ChatbotSection from '../components/ChatbotSection';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
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
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const Home = () => {
  const { user, logout } = useAuth();
  const { pendingRequestsCount } = useConnection();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check for section query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get('section');
    if (section) {
      setActiveSection(section);
    }
  }, [location]);

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
    { id: 'ai-assistant', name: 'AI Assistant', icon: SparklesIcon, active: false },
    { id: 'connections', name: 'Connections', icon: UserGroupIcon, active: false },
    { id: 'messages', name: 'Messages', icon: ChatBubbleLeftRightIcon, active: false },
    { id: 'calendar', name: 'Calendar', icon: CalendarDaysIcon, active: false },
  ];

  const [recentWorkspaces, setRecentWorkspaces] = useState([]);

  useEffect(() => {
    const loadRecent = async () => {
      try {
        const resp = await workspaceService.getMyWorkspaces(true);
        if (resp?.success && Array.isArray(resp.data)) {
          const all = resp.data;
          // Sort by updatedAt desc as a proxy for "recent"
          const sorted = [...all].sort((a,b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
          setRecentWorkspaces(sorted.slice(0, 6));
        }
      } catch (e) {
        console.error('Failed to load recent workspaces', e);
      }
    };
    loadRecent();
  }, []);

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

  const teamStatusData = [
    { name: 'Online', value: 8, color: '#10b981' },
    { name: 'Away', value: 3, color: '#f59e0b' },
    { name: 'Offline', value: 1, color: '#9ca3af' },
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
              const handleClick = () => {
                if (item.id === 'workspaces') navigate('/workspaces');
                else if (item.id === 'calendar') navigate('/calendar');
                else if (item.id === 'messages') navigate('/messages');
                else if (item.id === 'connections') navigate('/connections');
                else setActiveSection(item.id);
              };
              return (
                <button
                  key={item.id}
                  onClick={handleClick}
                  className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl text-left transition-all ${
                    activeSection === item.id
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
                    if (item.id === 'workspaces') navigate('/workspaces');
                    else if (item.id === 'calendar') navigate('/calendar');
                    else if (item.id === 'messages') navigate('/messages');
                    else if (item.id === 'connections') navigate('/connections');
                    else setActiveSection(item.id);
                    setSidebarOpen(false);
                  };
                  return (
                    <button
                      key={item.id}
                      onClick={handleClick}
                      className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl text-left transition-all ${
                        activeSection === item.id
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50">
          {/* AI Assistant Section */}
          {activeSection === 'ai-assistant' && <ChatbotSection />}

          {/* Home Dashboard */}
          {activeSection === 'home' && (
            <>
              {/* Welcome Section */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900">
                  Good {currentTime.getHours() < 12 ? 'morning' : currentTime.getHours() < 18 ? 'afternoon' : 'evening'}, {user?.firstName}! 👋
                </h2>
                <p className="text-gray-500 mt-2 text-base">
                  Here's what's happening with your projects today
                </p>
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
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold text-gray-900">Recent Workspaces</h3>
                  <button 
                    onClick={() => navigate('/workspaces')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-4">
                  {recentWorkspaces.map((workspace) => (
                    <WorkspaceListItem key={workspace._id || workspace.id} workspace={workspace} />
                  ))}
                </div>
              </div>

              {/* Messages Section */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold text-gray-900">Recent Messages</h3>
                  <button 
                    onClick={() => navigate('/messages')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-1">
                  {recentMessages.map((message, index) => (
                    <div key={message.id} className={`flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors ${
                      index < recentMessages.length - 1 ? 'border-b border-gray-100' : ''
                    }`}>
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-white">{message.avatar}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-gray-900">{message.sender}</p>
                          <p className="text-sm text-gray-400">{message.time}</p>
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
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold text-gray-900">Upcoming Events</h3>
                  <button 
                    onClick={() => navigate('/calendar')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                  >
                    View calendar
                  </button>
                </div>
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-start space-x-4 p-4 border-l-4 border-blue-500 bg-blue-50 rounded-r-xl hover:bg-blue-100 transition-colors cursor-pointer">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                          <CalendarDaysIcon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 mb-1">{event.title}</p>
                        <p className="text-sm text-gray-600">{event.date === 'Today' ? 'Today' : event.date === 'Tomorrow' ? 'Tomorrow' : event.date} · {event.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connections Section */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold text-gray-900">Team Status</h3>
                  <button 
                    onClick={() => navigate('/connections')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                  >
                    Manage
                  </button>
                </div>
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={teamStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {teamStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-full mt-4 space-y-2">
                    {teamStatusData.map((status, index) => (
                      <div key={index} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }}></div>
                          <span className="text-sm font-medium text-gray-700">{status.name}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{status.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">Total Team Members</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{teamStatusData.reduce((sum, s) => sum + s.value, 0)}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-5">Quick Actions</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => navigate('/workspaces')}
                    className="w-full flex items-center justify-center space-x-2 px-5 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-semibold"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span>Create New Project</span>
                  </button>
                  <button 
                    onClick={() => navigate('/connections')}
                    className="w-full flex items-center justify-center space-x-2 px-5 py-3.5 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors font-semibold"
                  >
                    <UserGroupIcon className="w-5 h-5" />
                    <span>Invite Team Member</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Home;