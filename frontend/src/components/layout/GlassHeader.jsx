import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useConnection } from '../../context/ConnectionContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  Moon, 
  Sun, 
  LogOut, 
  Clock, 
  Menu, 
  X 
} from 'lucide-react';

/**
 * GlassHeader - Floating pill header with navigation
 * Reusable across all app pages
 */
const GlassHeader = ({ activeNav = '', children }) => {
  const { user, logout } = useAuth();
  const { pendingRequestsCount } = useConnection();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Determine active nav from location if not provided
  const currentNav = activeNav || location.pathname.split('/')[1] || 'home';

  // Use theme-aware utility classes from index.css
  // OLD: manual ternary patterns - replaced with CSS utilities
  // const textClass = isDark ? 'text-white' : 'text-slate-800';
  // const textSecondaryClass = isDark ? 'text-slate-300/70' : 'text-slate-500';
  // const glassPillClass = isDark ? 'bg-slate-900/35' : 'bg-white/30';

  const navItems = [
    { id: 'home', label: 'Home', path: '/home' },
    { id: 'workspaces', label: 'Workspaces', path: '/workspaces' },
    { id: 'connections', label: 'Connections', path: '/connections' },
    { id: 'messages', label: 'Messages', path: '/messages' },
    { id: 'calendar', label: 'Calendar', path: '/calendar' },
  ];

  const NavButton = ({ item }) => {
    const isActive = currentNav === item.id;
    return (
      <button
        onClick={() => navigate(item.path)}
        className={`px-4 py-2 rounded-full transition-all text-sm font-medium ${
          isActive
            ? 'bg-white/50 dark:bg-white/10 text-slate-800 dark:text-white shadow-sm dark:shadow-[0_0_18px_rgba(255,255,255,0.10)]'
            : 'text-slate-500 dark:text-slate-300/70 hover:text-slate-800 dark:hover:text-white hover:bg-white/20 dark:hover:bg-white/5'
        }`}
      >
        {item.label}
      </button>
    );
  };

  return (
    <>
      <header className="glass-pill backdrop-blur-xl border min-h-[56px] sm:h-16 flex items-center px-3 sm:px-6 justify-between mb-4 sm:mb-8">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg transition-all hover:bg-white/10 dark:hover:bg-white/5"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-primary" />
            ) : (
              <Menu className="w-5 h-5 text-primary" />
            )}
          </button>

          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-lg ${isDark ? 'bg-gradient-to-br from-blue-600 to-purple-700' : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
            <span className="text-white font-bold text-xs sm:text-sm">FS</span>
          </div>
          <span className="text-primary font-bold text-lg sm:text-xl hidden sm:block">FestiveSuite</span>
        </div>

        {/* Center Navigation */}
        <nav className="hidden md:flex items-center gap-2 px-2 py-1 rounded-full border backdrop-blur-xl bg-white/30 dark:bg-white/5 border-white/20 dark:border-white/10">
          {navItems.map(item => (
            <NavButton key={item.id} item={item} />
          ))}
        </nav>

        {/* Right Side: Time, Dark Mode, Notifications, Logout, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Current Time */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-full border bg-white/30 dark:bg-white/5 border-white/20 dark:border-white/10">
            <Clock className="w-4 h-4 text-secondary" />
            <span className="text-xs font-medium text-primary">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-full transition-all hover:bg-white/20 dark:hover:bg-white/10 dark:hover:shadow-[0_0_14px_rgba(255,255,255,0.12)]"
            title={isDark ? 'Light Mode' : 'Dark Mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            ) : (
              <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            )}
          </button>

          {/* Logout Button - Hidden on mobile */}
          <button
            onClick={handleLogout}
            className="hidden sm:block p-2 rounded-full transition-all hover:bg-white/20 dark:hover:bg-white/10 dark:hover:shadow-[0_0_14px_rgba(255,255,255,0.12)]"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5 text-primary" />
          </button>

          {/* User Profile */}
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 rounded-full px-2 sm:px-3 py-1.5 sm:py-2 transition-all hover:bg-white/20 dark:hover:bg-white/10 dark:hover:shadow-[0_0_14px_rgba(255,255,255,0.12)]"
            aria-label="User profile"
          >
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-700/70 border border-white/10' : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white text-xs font-semibold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              )}
            </div>
            <span className="text-primary text-sm font-medium hidden xl:block">
              {user?.firstName}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mb-4 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-2xl p-3 space-y-1">
          {navItems.map(item => {
            const isActive = currentNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                className={`w-full px-4 py-3 rounded-xl transition-all text-left font-medium ${
                  isActive
                    ? 'bg-white/50 dark:bg-white/10 text-slate-800 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300/70 hover:bg-white/20 dark:hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <div className="border-t border-slate-300 dark:border-white/10 my-2"></div>
          <button
            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
            className="w-full px-4 py-3 rounded-xl transition-all text-left font-medium flex items-center gap-2 text-slate-600 dark:text-slate-300/70 hover:bg-white/20 dark:hover:bg-white/5"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      )}

      {children}
    </>
  );
};

export default GlassHeader;
