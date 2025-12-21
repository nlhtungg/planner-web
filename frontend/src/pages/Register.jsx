import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, googleLogin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const { confirmPassword, ...userData } = formData;
    const result = await register(userData);

    if (result.success) {
      if (result.requiresActivation) {
        navigate('/activate', {
          state: {
            userId: result.userId,
            email: result.email,
          },
        });
      } else {
        navigate('/home');
      }
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  const handleGoogleSuccess = async (idToken) => {
    setLoading(true);
    setError('');

    const result = await googleLogin(idToken);

    if (result.success) {
      if (result.requiresActivation) {
        navigate('/activate', {
          state: {
            userId: result.userId,
            email: result.email,
          },
        });
      } else {
        navigate('/home');
      }
    } else {
      if (result.requiresActivation) {
        navigate('/activate', {
          state: {
            userId: result.userId,
            email: result.email,
          },
        });
      } else {
        setError(result.message);
      }
    }

    setLoading(false);
  };

  const handleGoogleError = (error) => {
    console.error('Google Sign-In Error:', error);
    setError('Google Sign-In failed. Please try again.');
  };

  // GlassUI theme classes
  const bgClass = isDark
    ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
    : 'bg-gradient-to-br from-slate-50 via-rose-50 to-emerald-50';
  const glassCardClass = isDark
    ? 'bg-slate-900/40 border-white/10 shadow-[0_18px_55px_rgba(0,0,0,0.55)]'
    : 'bg-white/60 border-white/40 shadow-xl';
  const textClass = isDark ? 'text-white' : 'text-slate-800';
  const textSecondaryClass = isDark ? 'text-slate-300' : 'text-slate-600';
  const inputClass = isDark
    ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500'
    : 'bg-white/50 border-white/30 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500';

  return (
    <div className="min-h-[100dvh] overflow-auto relative">
      {/* Gradient Background */}
      <div
        className={`fixed inset-0 ${bgClass}`}
        style={
          isDark
            ? undefined
            : {
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(220, 38, 38, 0.3) 0%, transparent 50%),
               radial-gradient(circle at 80% 20%, rgba(34, 197, 94, 0.3) 0%, transparent 50%),
               radial-gradient(circle at 60% 80%, rgba(251, 191, 36, 0.2) 0%, transparent 50%)`,
              filter: 'blur(80px)',
            }
        }
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`fixed top-4 right-4 p-2 rounded-full backdrop-blur-xl border transition-all z-20 ${isDark
              ? 'bg-slate-900/40 border-white/10 hover:bg-white/10'
              : 'bg-white/60 border-white/40 hover:bg-white/80'
            }`}
          title={isDark ? 'Light Mode' : 'Dark Mode'}
        >
          {isDark ? (
            <Sun className={`w-5 h-5 ${textClass}`} />
          ) : (
            <Moon className={`w-5 h-5 ${textClass}`} />
          )}
        </button>

        {/* Glass Card */}
        <div className={`w-full max-w-md backdrop-blur-xl border rounded-3xl p-8 ${glassCardClass}`}>
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg mb-4 ${isDark ? 'bg-gradient-to-br from-amber-700 to-orange-800' : 'bg-gradient-to-br from-red-600 to-green-600'}`}>
              <span className="text-white font-bold text-2xl">F</span>
            </div>
            <h2 className={`text-2xl font-bold ${textClass}`}>
              Create Account
            </h2>
            <p className={`mt-2 text-sm ${textSecondaryClass}`}>
              Join FestiveSuite today
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className={`block text-sm font-medium mb-2 ${textSecondaryClass}`}>
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className={`w-full px-4 py-3 rounded-xl border backdrop-blur-md focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="lastName" className={`block text-sm font-medium mb-2 ${textSecondaryClass}`}>
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className={`w-full px-4 py-3 rounded-xl border backdrop-blur-md focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className={`block text-sm font-medium mb-2 ${textSecondaryClass}`}>
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className={`w-full px-4 py-3 rounded-xl border backdrop-blur-md focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                placeholder="johndoe"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email" className={`block text-sm font-medium mb-2 ${textSecondaryClass}`}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={`w-full px-4 py-3 rounded-xl border backdrop-blur-md focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className={`block text-sm font-medium mb-2 ${textSecondaryClass}`}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={`w-full px-4 py-3 rounded-xl border backdrop-blur-md focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                placeholder="Min 6 chars, uppercase, lowercase, number"
                value={formData.password}
                onChange={handleChange}
              />
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Must contain uppercase, lowercase, and number
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className={`block text-sm font-medium mb-2 ${textSecondaryClass}`}>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className={`w-full px-4 py-3 rounded-xl border backdrop-blur-md focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>

            {error && (
              <div className={`rounded-xl p-4 ${isDark ? 'bg-red-900/30 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-800'}`}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isDark
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-[0_8px_30px_rgba(245,158,11,0.3)]'
                  : 'bg-gradient-to-r from-red-600 to-green-600 hover:from-red-500 hover:to-green-500 text-white shadow-lg'
                }`}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${isDark ? 'border-white/10' : 'border-slate-300'}`} />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`px-3 ${isDark ? 'bg-slate-900/40 text-slate-400' : 'bg-white/60 text-slate-500'}`}>
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Sign In */}
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text="signup_with"
          />

          {/* Login Link */}
          <p className={`mt-6 text-center text-sm ${textSecondaryClass}`}>
            Already have an account?{' '}
            <Link to="/login" className={`font-medium ${isDark ? 'text-amber-400 hover:text-amber-300' : 'text-blue-600 hover:text-blue-500'}`}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
