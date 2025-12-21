import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConnection } from '../context/ConnectionContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import workspaceService from '../services/workspaceService';
import WorkspaceListItem from '../components/WorkspaceListItem';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  Sparkles,
  Search,
  CheckCircle2,
  Circle,
  Send,
  Moon,
  Sun,
  Bell,
  LogOut,
  Clock,
  Menu,
  X,
} from 'lucide-react';

import SnowOverlay from '../components/effects/SnowOverlay';
import PixelAnimalPopup from '../components/effects/PixelAnimalPopup';
import ReindeerRunner from '../components/effects/ReindeerRunner';

const Home = () => {
  const { user, logout } = useAuth();
  const { pendingRequestsCount } = useConnection();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('home');
  const [chatMessage, setChatMessage] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const darkMode = isDark;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [recentWorkspaces, setRecentWorkspaces] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchAreaRef = useRef(null);
  const searchBoxRef = useRef(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load recent workspaces
  useEffect(() => {
    const loadRecent = async () => {
      try {
        const resp = await workspaceService.getMyWorkspaces(true);
        if (resp?.success && Array.isArray(resp.data)) {
          const all = resp.data;
          const sorted = [...all].sort((a,b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
          setRecentWorkspaces(sorted.slice(0, 3));
        }
      } catch (e) {
        console.error('Failed to load recent workspaces', e);
      }
    };
    loadRecent();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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

  const bgClass = darkMode
    ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
    : 'bg-gradient-to-br from-slate-50 via-rose-50 to-emerald-50';

  const textClass = darkMode ? 'text-white' : 'text-slate-800';
  const textSecondaryClass = darkMode ? 'text-slate-300/70' : 'text-slate-500';

  const glassCardClass = darkMode
    ? 'bg-slate-900/40'
    : 'bg-white/60';
  const glassPillClass = darkMode
    ? 'bg-slate-900/35'
    : 'bg-white/30';

  return (
    <div className="min-h-[100dvh] h-[100dvh] overflow-hidden relative">
      {/* Festive Background - Blurred Christmas Bokeh */}
      <div
        className={`absolute inset-0 ${bgClass}`}
        style={
          darkMode
            ? undefined
            : {
                backgroundImage: `radial-gradient(circle at 20% 50%, rgba(220, 38, 38, 0.3) 0%, transparent 50%),
               radial-gradient(circle at 80% 20%, rgba(34, 197, 94, 0.3) 0%, transparent 50%),
               radial-gradient(circle at 60% 80%, rgba(251, 191, 36, 0.2) 0%, transparent 50%)`,
                filter: 'blur(80px)',
              }
        }
      />

      {/* Home-only ambient effects */}
      <SnowOverlay enabled intensity={1} darkMode={darkMode} />
      <PixelAnimalPopup enabled darkMode={darkMode} />
      
      {/* Main Container */}
      <div className="relative z-10 h-full flex flex-col p-2 sm:p-4 md:p-6 max-w-7xl mx-auto">
        {/* Floating Pill Header */}
        <header className={`${glassPillClass} backdrop-blur-xl border ${darkMode ? 'border-white/10' : 'border-white/20'} min-h-[56px] sm:h-16 flex items-center px-3 sm:px-6 justify-between mb-4 sm:mb-8 rounded-full ${darkMode ? 'shadow-[0_18px_55px_rgba(0,0,0,0.55)]' : ''}`}>
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-1.5 rounded-lg transition-all ${darkMode ? 'hover:bg-white/10' : 'hover:bg-white/20'}`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className={`w-5 h-5 ${textClass}`} />
              ) : (
                <Menu className={`w-5 h-5 ${textClass}`} />
              )}
            </button>
            
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-lg ${darkMode ? 'bg-gradient-to-br from-amber-700 to-orange-800' : 'bg-gradient-to-br from-red-600 to-green-600'}`}>
              <span className="text-white font-bold text-base sm:text-lg">F</span>
            </div>
            <span className={`${textClass} font-bold text-lg sm:text-xl hidden sm:block`}>FestiveSuite</span>
          </div>

          {/* Center Navigation */}
          <nav className={`hidden md:flex items-center gap-2 px-2 py-1 rounded-full border backdrop-blur-xl ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white/30 border-white/20'}`}>
            <button
              onClick={() => { setActiveNav('home'); navigate('/home'); }}
              className={`px-4 py-2 rounded-full transition-all text-sm font-medium ${
                activeNav === 'home'
                  ? (darkMode
                      ? 'bg-white/10 text-white shadow-[0_0_18px_rgba(255,255,255,0.10)]'
                      : 'bg-white/50 text-slate-800 shadow-sm')
                  : (darkMode
                      ? 'text-slate-300/70 hover:text-white hover:bg-white/5'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/20')
              }`}
            >
              Home
            </button>
            <button
              onClick={() => { setActiveNav('workspaces'); navigate('/workspaces'); }}
              className={`px-4 py-2 rounded-full transition-all text-sm font-medium ${
                activeNav === 'workspaces'
                  ? (darkMode
                      ? 'bg-white/10 text-white shadow-[0_0_18px_rgba(255,255,255,0.10)]'
                      : 'bg-white/50 text-slate-800 shadow-sm')
                  : (darkMode
                      ? 'text-slate-300/70 hover:text-white hover:bg-white/5'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/20')
              }`}
            >
              Workspaces
            </button>
            <button
              onClick={() => { setActiveNav('connections'); navigate('/connections'); }}
              className={`px-4 py-2 rounded-full transition-all text-sm font-medium ${
                activeNav === 'connections'
                  ? (darkMode
                      ? 'bg-white/10 text-white shadow-[0_0_18px_rgba(255,255,255,0.10)]'
                      : 'bg-white/50 text-slate-800 shadow-sm')
                  : (darkMode
                      ? 'text-slate-300/70 hover:text-white hover:bg-white/5'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/20')
              }`}
            >
              Connections
            </button>
            <button
              onClick={() => { setActiveNav('messages'); navigate('/messages'); }}
              className={`px-4 py-2 rounded-full transition-all text-sm font-medium ${
                activeNav === 'messages'
                  ? (darkMode
                      ? 'bg-white/10 text-white shadow-[0_0_18px_rgba(255,255,255,0.10)]'
                      : 'bg-white/50 text-slate-800 shadow-sm')
                  : (darkMode
                      ? 'text-slate-300/70 hover:text-white hover:bg-white/5'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/20')
              }`}
            >
              Messages
            </button>
            <button
              onClick={() => { setActiveNav('calendar'); navigate('/calendar'); }}
              className={`px-4 py-2 rounded-full transition-all text-sm font-medium ${
                activeNav === 'calendar'
                  ? (darkMode
                      ? 'bg-white/10 text-white shadow-[0_0_18px_rgba(255,255,255,0.10)]'
                      : 'bg-white/50 text-slate-800 shadow-sm')
                  : (darkMode
                      ? 'text-slate-300/70 hover:text-white hover:bg-white/5'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/20')
              }`}
            >
              Calendar
            </button>
          </nav>

          {/* Right Side: Time, Dark Mode, Notifications, Logout, Profile */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Current Time */}
            <div className={`hidden lg:flex items-center gap-2 px-3 py-2 rounded-full border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white/30 border-white/20'}`}>
              <Clock className={`w-4 h-4 ${textSecondaryClass}`} />
              <span className={`text-xs font-medium ${textClass}`}>
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-1.5 sm:p-2 rounded-full transition-all ${darkMode ? 'hover:bg-white/10 hover:shadow-[0_0_14px_rgba(255,255,255,0.12)]' : 'hover:bg-white/20'}`}
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <Sun className={`w-4 h-4 sm:w-5 sm:h-5 ${textClass}`} />
              ) : (
                <Moon className={`w-4 h-4 sm:w-5 sm:h-5 ${textClass}`} />
              )}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-1.5 sm:p-2 rounded-full transition-all relative ${darkMode ? 'hover:bg-white/10 hover:shadow-[0_0_14px_rgba(255,255,255,0.12)]' : 'hover:bg-white/20'}`}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className={`w-4 h-4 sm:w-5 sm:h-5 ${textClass}`} />
                {pendingRequestsCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-2 h-2 bg-red-600 rounded-full"></span>
                )}
              </button>
            </div>

            {/* Logout Button - Hidden on mobile */}
            <button
              onClick={handleLogout}
              className={`hidden sm:block p-2 rounded-full transition-all ${darkMode ? 'hover:bg-white/10 hover:shadow-[0_0_14px_rgba(255,255,255,0.12)]' : 'hover:bg-white/20'}`}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className={`w-5 h-5 ${textClass}`} />
            </button>

            {/* User Profile */}
            <button
              onClick={() => navigate('/profile')}
              className={`flex items-center gap-2 rounded-full px-2 sm:px-3 py-1.5 sm:py-2 transition-all ${darkMode ? 'hover:bg-white/10 hover:shadow-[0_0_14px_rgba(255,255,255,0.12)]' : 'hover:bg-white/20'}`}
              aria-label="User profile"
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-700/70 border border-white/10' : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
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
              <span className={`${textClass} text-sm font-medium hidden xl:block`}>
                {user?.firstName}
              </span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden mb-4 ${glassCardClass} backdrop-blur-xl border ${darkMode ? 'border-white/10' : 'border-white/40'} rounded-2xl p-3 space-y-1`}>
            <button
              onClick={() => { setActiveNav('home'); navigate('/home'); setMobileMenuOpen(false); }}
              className={`w-full px-4 py-3 rounded-xl transition-all text-left font-medium ${
                activeNav === 'home'
                  ? (darkMode
                      ? 'bg-white/10 text-white'
                      : 'bg-white/50 text-slate-800')
                  : (darkMode
                      ? 'text-slate-300/70 hover:bg-white/5'
                      : 'text-slate-600 hover:bg-white/20')
              }`}
            >
              Home
            </button>
            <button
              onClick={() => { setActiveNav('workspaces'); navigate('/workspaces'); setMobileMenuOpen(false); }}
              className={`w-full px-4 py-3 rounded-xl transition-all text-left font-medium ${
                activeNav === 'workspaces'
                  ? (darkMode
                      ? 'bg-white/10 text-white'
                      : 'bg-white/50 text-slate-800')
                  : (darkMode
                      ? 'text-slate-300/70 hover:bg-white/5'
                      : 'text-slate-600 hover:bg-white/20')
              }`}
            >
              Workspaces
            </button>
            <button
              onClick={() => { setActiveNav('connections'); navigate('/connections'); setMobileMenuOpen(false); }}
              className={`w-full px-4 py-3 rounded-xl transition-all text-left font-medium ${
                activeNav === 'connections'
                  ? (darkMode
                      ? 'bg-white/10 text-white'
                      : 'bg-white/50 text-slate-800')
                  : (darkMode
                      ? 'text-slate-300/70 hover:bg-white/5'
                      : 'text-slate-600 hover:bg-white/20')
              }`}
            >
              Connections
            </button>
            <button
              onClick={() => { setActiveNav('messages'); navigate('/messages'); setMobileMenuOpen(false); }}
              className={`w-full px-4 py-3 rounded-xl transition-all text-left font-medium ${
                activeNav === 'messages'
                  ? (darkMode
                      ? 'bg-white/10 text-white'
                      : 'bg-white/50 text-slate-800')
                  : (darkMode
                      ? 'text-slate-300/70 hover:bg-white/5'
                      : 'text-slate-600 hover:bg-white/20')
              }`}
            >
              Messages
            </button>
            <button
              onClick={() => { setActiveNav('calendar'); navigate('/calendar'); setMobileMenuOpen(false); }}
              className={`w-full px-4 py-3 rounded-xl transition-all text-left font-medium ${
                activeNav === 'calendar'
                  ? (darkMode
                      ? 'bg-white/10 text-white'
                      : 'bg-white/50 text-slate-800')
                  : (darkMode
                      ? 'text-slate-300/70 hover:bg-white/5'
                      : 'text-slate-600 hover:bg-white/20')
              }`}
            >
              Calendar
            </button>
            <div className={`border-t ${darkMode ? 'border-white/10' : 'border-slate-300'} my-2`}></div>
            <button
              onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
              className={`w-full px-4 py-3 rounded-xl transition-all text-left font-medium flex items-center gap-2 ${darkMode ? 'text-slate-300/70 hover:bg-white/5' : 'text-slate-600 hover:bg-white/20'}`}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}

        {/* Search Bar - Right aligned */}
        <div ref={searchAreaRef} className="relative flex justify-end mb-4 sm:mb-6">
          {/* 8-bit reindeer: run once, then idle until reload - Hidden on mobile */}
          <div className="hidden md:block">
            <ReindeerRunner enabled darkMode={darkMode} containerRef={searchAreaRef} avoidRef={searchBoxRef} />
          </div>

          <div ref={searchBoxRef} className="relative w-full sm:w-80 md:w-96">
            <Search className={`w-4 h-4 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 ${textSecondaryClass}`} />
            <input
              type="text"
              placeholder="Search projects, tasks..."
              aria-label="Search projects and tasks"
              className={`backdrop-blur-xl border rounded-full w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm transition-all focus:outline-none ${
                darkMode
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-white/20 focus:shadow-[0_0_18px_rgba(255,255,255,0.08)]'
                  : 'bg-white/40 border-white/30 text-slate-800 placeholder:text-slate-500 focus:ring-2 focus:ring-white/50'
              }`}
            />
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="dashboard-scroll grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 flex-1 overflow-auto pb-4">
          {/* Card 1: My Tasks (Top Left) */}
          <div className={`${glassCardClass} backdrop-blur-xl border ${darkMode ? 'border-white/10' : 'border-white/40'} ${darkMode ? 'shadow-[0_18px_55px_rgba(0,0,0,0.55)]' : 'shadow-xl'} rounded-3xl p-6 flex flex-col`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${textClass}`}>My Tasks</h2>
              <Sparkles className="w-6 h-6 text-red-600" />
            </div>
            <div className="space-y-3 flex-1">
              {myTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer border ${
                    darkMode
                      ? (task.completed
                          ? 'bg-emerald-500/10 border-emerald-500/15 hover:bg-emerald-500/15'
                          : 'bg-white/5 border-white/10 hover:bg-white/8')
                      : 'hover:bg-white/20 border-transparent'
                  }`}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0">
                    {task.completed ? (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${darkMode ? 'bg-emerald-400/25' : 'bg-green-100'}`}>
                        <CheckCircle2 className={`w-4 h-4 ${darkMode ? 'text-emerald-300' : 'text-green-600'}`} />
                      </div>
                    ) : (
                      <Circle className={`w-5 h-5 ${textSecondaryClass}`} />
                    )}
                  </div>
                  {/* Task Name */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        task.completed
                          ? `line-through ${textSecondaryClass}`
                          : textClass
                      }`}
                    >
                      {task.title}
                    </p>
                  </div>
                  {/* Days Badge */}
                  <div className="flex-shrink-0">
                    <span className={`${darkMode ? 'bg-white/6 border border-white/10' : 'bg-white/30'} ${textSecondaryClass} text-xs px-2 py-1 rounded-full`}>
                      {task.daysLeft}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Project Beta Overview (Top Right) */}
          <div className={`${glassCardClass} backdrop-blur-xl border ${darkMode ? 'border-white/10' : 'border-white/40'} ${darkMode ? 'shadow-[0_18px_55px_rgba(0,0,0,0.55)]' : 'shadow-xl'} rounded-3xl p-6 flex flex-col`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${textClass}`}>Project Beta Overview</h2>
              <span className="bg-red-600/80 text-white text-xs px-3 py-1 rounded-full font-medium">
                Happy Holidays
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 flex-1">
              {projectBetaData.map((project, index) => {
                const bottomGlow =
                  index === 0
                    ? 'from-emerald-400/40'
                    : index === 1
                      ? 'from-amber-400/40'
                      : 'from-red-400/40';
                const ringShadow =
                  index === 0
                    ? 'drop-shadow-[0_0_14px_rgba(52,211,153,0.25)]'
                    : index === 1
                      ? 'drop-shadow-[0_0_14px_rgba(251,191,36,0.22)]'
                      : 'drop-shadow-[0_0_14px_rgba(248,113,113,0.22)]';
                return (
                <div
                  key={index}
                  className={`relative overflow-hidden flex flex-col items-center justify-between ${darkMode ? 'bg-white/5 border border-white/10' : 'bg-white/30'} rounded-2xl px-4 py-5 w-[120px] sm:w-[140px]`}
                >
                  {darkMode && (
                    <div className={`absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t ${bottomGlow} to-transparent`} />
                  )}

                  <div className={`relative z-10 ${ringShadow}`}>
                    <ResponsiveContainer width={96} height={96}>
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
                  </div>
                  <div className="relative z-10 text-center">
                    <p className={`text-xs font-medium ${textSecondaryClass} mt-2`}>{project.name}</p>
                    <p className={`text-lg font-bold ${textClass}`}>{project.metric}</p>
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Recent Workspaces (Bottom Left) */}
          <div className={`${glassCardClass} backdrop-blur-xl border ${darkMode ? 'border-white/10' : 'border-white/40'} ${darkMode ? 'shadow-[0_18px_55px_rgba(0,0,0,0.55)]' : 'shadow-xl'} rounded-3xl p-6 flex flex-col`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${textClass}`}>Recent Workspaces</h2>
              <button 
                onClick={() => navigate('/workspaces')}
                className={`text-sm font-medium ${darkMode ? 'text-slate-300/70 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
              >
                View All
              </button>
            </div>
            <div className="dashboard-scroll space-y-2 flex-1 overflow-auto">
              {recentWorkspaces.length > 0 ? (
                recentWorkspaces.map((workspace) => (
                  <WorkspaceListItem key={workspace._id || workspace.id} workspace={workspace} />
                ))
              ) : (
                crmLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer border ${
                      darkMode
                        ? 'bg-white/5 border-white/10 hover:bg-white/8'
                        : 'hover:bg-white/20 border-transparent'
                    }`}
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
                      <p className={`text-sm font-semibold ${textClass} truncate`}>
                        {lead.name}
                      </p>
                      <p className={`text-xs ${textSecondaryClass}`}>{lead.contact}</p>
                    </div>
                    {/* Value */}
                    <div className="flex-shrink-0">
                      <p className={`text-sm font-bold ${textClass}`}>{lead.value}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 4: Team Chat (Bottom Right) */}
          <div className={`${glassCardClass} backdrop-blur-xl border ${darkMode ? 'border-white/10' : 'border-white/40'} ${darkMode ? 'shadow-[0_18px_55px_rgba(0,0,0,0.55)]' : 'shadow-xl'} rounded-3xl p-6 flex flex-col`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${textClass}`}>Team Chat</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className={`text-xs ${textSecondaryClass}`}>4 online</span>
              </div>
            </div>
            
            {/* Chat Messages */}
            <div className="dashboard-scroll flex-1 space-y-3 overflow-auto mb-4">
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
                        ? darkMode
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-none shadow-[0_0_22px_rgba(59,130,246,0.35)]'
                          : 'bg-slate-800/80 text-white rounded-2xl rounded-br-none'
                        : `${darkMode ? 'bg-white/5 border border-white/10 text-white' : `bg-white/70 ${textClass}`} rounded-2xl rounded-bl-none`
                    }`}
                  >
                    {!msg.isOwn && (
                      <p className={`text-xs font-semibold mb-1 ${textSecondaryClass}`}>
                        {msg.sender}
                      </p>
                    )}
                    <p className="text-sm">{msg.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.isOwn ? 'text-slate-300' : textSecondaryClass
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
                className={`flex-1 backdrop-blur-xl rounded-full px-4 py-2 text-sm transition-all focus:outline-none border ${
                  darkMode
                    ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-white/20 focus:shadow-[0_0_14px_rgba(255,255,255,0.08)]'
                    : 'bg-white/50 border-white/30 text-slate-800 placeholder:text-slate-500 focus:ring-2 focus:ring-white/50'
                }`}
              />
              <button
                onClick={handleSendMessage}
                className={`w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-all ${darkMode ? 'shadow-[0_0_22px_rgba(59,130,246,0.35)] hover:shadow-[0_0_30px_rgba(59,130,246,0.45)]' : 'shadow-lg'}`}
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
