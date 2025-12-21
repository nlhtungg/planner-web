import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  Sparkles,
  Home as HomeIcon,
  Briefcase,
  Calendar,
  Search,
  CheckCircle2,
  Circle,
  Send,
} from 'lucide-react';

const Home = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('home');
  const [chatMessage, setChatMessage] = useState('');

  // Mock data for My Tasks widget
  const myTasks = [
    { id: 1, title: 'Review Q4 Marketing Plan', completed: true, daysLeft: '2 days' },
    { id: 2, title: 'Update Client Presentation', completed: false, daysLeft: '5 days' },
    { id: 3, title: 'Team Performance Reviews', completed: true, daysLeft: '1 day' },
    { id: 4, title: 'Database Migration Testing', completed: false, daysLeft: '10 days' },
  ];

  // Mock data for Project Beta Overview (donut charts)
  const projectBetaData = [
    {
      name: 'Seat',
      data: [{ name: 'Used', value: 75, color: '#388E3C' }, { name: 'Available', value: 25, color: '#E0E0E0' }],
      metric: '75%',
    },
    {
      name: 'CRM',
      data: [{ name: 'Active', value: 60, color: '#FFA726' }, { name: 'Inactive', value: 40, color: '#E0E0E0' }],
      metric: '60%',
    },
    {
      name: 'Tasks',
      data: [{ name: 'Done', value: 85, color: '#D32F2F' }, { name: 'Pending', value: 15, color: '#E0E0E0' }],
      metric: '85%',
    },
  ];

  // Mock data for CRM Leads
  const crmLeads = [
    { id: 1, name: 'Acme Corporation', status: 'hot', contact: 'John Smith', value: '$45,000', color: '#D32F2F' },
    { id: 2, name: 'Tech Innovators Inc', status: 'warm', contact: 'Sarah Johnson', value: '$32,000', color: '#FFA726' },
    { id: 3, name: 'Global Solutions Ltd', status: 'cold', contact: 'Mike Brown', value: '$18,000', color: '#388E3C' },
    { id: 4, name: 'Digital Ventures', status: 'hot', contact: 'Emily Davis', value: '$52,000', color: '#D32F2F' },
  ];

  // Mock data for Team Chat
  const chatMessages = [
    { id: 1, sender: 'Alice', message: 'Great progress on the dashboard!', time: '10:30 AM', isOwn: false },
    { id: 2, sender: 'You', message: 'Thanks! The glassmorphism looks amazing', time: '10:32 AM', isOwn: true },
    { id: 3, sender: 'Bob', message: 'Ready for the client demo tomorrow?', time: '10:35 AM', isOwn: false },
    { id: 4, sender: 'You', message: 'Yes, all set! 🎉', time: '10:36 AM', isOwn: true },
  ];

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      // In real app, send message to backend
      setChatMessage('');
    }
  };

  return (
    <div className="min-h-screen h-screen overflow-hidden relative">
      {/* Festive Background - Blurred Christmas Bokeh */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-slate-900 via-red-950 to-green-950"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(220, 38, 38, 0.3) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(34, 197, 94, 0.3) 0%, transparent 50%),
                           radial-gradient(circle at 60% 80%, rgba(251, 191, 36, 0.2) 0%, transparent 50%)`,
          filter: 'blur(80px)',
        }}
      />
      
      {/* Main Container */}
      <div className="relative z-10 h-full flex flex-col p-4 md:p-6 max-w-7xl mx-auto">
        {/* Floating Pill Header */}
        <header className="glass-pill h-16 flex items-center px-6 justify-between mb-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-green-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="text-slate-800 font-bold text-xl hidden md:block">FestiveSuite</span>
          </div>

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setActiveNav('home')}
              className={`px-6 py-2 rounded-full transition-all text-sm font-medium ${
                activeNav === 'home'
                  ? 'bg-white/50 text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/20'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => { setActiveNav('projects'); navigate('/workspaces'); }}
              className={`px-6 py-2 rounded-full transition-all text-sm font-medium ${
                activeNav === 'projects'
                  ? 'bg-white/50 text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/20'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => { setActiveNav('calendar'); navigate('/calendar'); }}
              className={`px-6 py-2 rounded-full transition-all text-sm font-medium ${
                activeNav === 'calendar'
                  ? 'bg-white/50 text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white/20'
              }`}
            >
              Calendar
            </button>
          </nav>

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 hover:bg-white/20 rounded-full px-3 py-2 transition-all"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                {user?.avatar ? (
                  <img
                    src={`${user.avatar}?t=${Date.now()}`}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white text-xs font-semibold">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                )}
              </div>
              <span className="text-slate-800 text-sm font-medium hidden lg:block">
                {user?.firstName}
              </span>
            </button>
          </div>
        </header>

        {/* Search Bar - Right aligned */}
        <div className="flex justify-end mb-6">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects, tasks..."
              className="glass-input w-full pl-12 pr-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-sm"
            />
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-auto pb-4">
          {/* Card 1: My Tasks (Top Left) */}
          <div className="glass-card p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">My Tasks</h2>
              <Sparkles className="w-6 h-6 text-red-600" />
            </div>
            <div className="space-y-3 flex-1">
              {myTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-3 hover:bg-white/20 rounded-xl transition-all cursor-pointer"
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0">
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  {/* Task Name */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        task.completed
                          ? 'line-through text-slate-500'
                          : 'text-slate-800'
                      }`}
                    >
                      {task.title}
                    </p>
                  </div>
                  {/* Days Badge */}
                  <div className="flex-shrink-0">
                    <span className="bg-white/30 text-slate-600 text-xs px-2 py-1 rounded">
                      {task.daysLeft}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Project Beta Overview (Top Right) */}
          <div className="glass-card p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Project Beta Overview</h2>
              <span className="bg-red-600/80 text-white text-xs px-3 py-1 rounded-full font-medium">
                Happy Holidays
              </span>
            </div>
            <div className="flex items-center justify-around flex-1">
              {projectBetaData.map((project, index) => (
                <div key={index} className="flex flex-col items-center bg-white/30 rounded-xl p-4">
                  <ResponsiveContainer width={100} height={100}>
                    <PieChart>
                      <Pie
                        data={project.data}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={45}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                      >
                        {project.data.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <p className="text-xs font-medium text-slate-600 mt-2">{project.name}</p>
                  <p className="text-lg font-bold text-slate-800">{project.metric}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: CRM Leads (Bottom Left) */}
          <div className="glass-card p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">CRM Leads</h2>
              <button className="text-slate-600 hover:text-slate-800 text-sm font-medium">
                View All
              </button>
            </div>
            <div className="space-y-2 flex-1 overflow-auto">
              {crmLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center gap-4 p-3 hover:bg-white/20 rounded-xl transition-all cursor-pointer"
                >
                  {/* Status Icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: lead.color }}
                  >
                    <span className="text-white font-bold text-xs">
                      {lead.status.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* Lead Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {lead.name}
                    </p>
                    <p className="text-xs text-slate-500">{lead.contact}</p>
                  </div>
                  {/* Value */}
                  <div className="flex-shrink-0">
                    <p className="text-sm font-bold text-slate-800">{lead.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Team Chat (Bottom Right) */}
          <div className="glass-card p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Team Chat</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-500">4 online</span>
              </div>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 space-y-3 overflow-auto mb-4">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.isOwn ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2 ${
                      msg.isOwn
                        ? 'bg-slate-800/80 text-white rounded-2xl rounded-br-none'
                        : 'bg-white/70 text-slate-800 rounded-2xl rounded-bl-none'
                    }`}
                  >
                    {!msg.isOwn && (
                      <p className="text-xs font-semibold mb-1 text-slate-600">
                        {msg.sender}
                      </p>
                    )}
                    <p className="text-sm">{msg.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.isOwn ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Chat Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-white/50 rounded-full px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
              />
              <button
                onClick={handleSendMessage}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-all shadow-lg"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
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
  );
};

export default Home;