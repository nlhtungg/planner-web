import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';
import TotpVerification from '../components/TotpVerification';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requiresTOTP, setRequiresTOTP] = useState(false);
  const [userId, setUserId] = useState(null);

  const { login, googleLogin, updateUser } = useAuth();
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

    const result = await login(formData);

    if (result.success) {
      if (result.requiresTOTP) {
        setRequiresTOTP(true);
        setUserId(result.userId);
      } else {
        navigate('/home');
      }
    } else if (result.requiresActivation) {
      navigate('/activate', {
        state: {
          userId: result.userId,
          email: result.email,
        },
      });
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  const handleGoogleSuccess = async (idToken) => {
    setLoading(true);
    setError('');

    try {
      const result = await googleLogin(idToken);

      if (result.success) {
        if (result.requiresTOTP) {
          setRequiresTOTP(true);
          setUserId(result.userId);
        } else if (result.requiresActivation) {
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
    } catch (error) {
      console.error('Google login error:', error);
      setError(error.response?.data?.message || 'Google Sign-In failed. Please try again.');
    }

    setLoading(false);
  };

  const handleGoogleError = (error) => {
    console.error('Google Sign-In Error:', error);
    setError('Google Sign-In failed. Please try again.');
  };

  const handleTOTPSuccess = (data) => {
    updateUser(data.user);
    navigate('/home');
  };

  const handleTOTPCancel = () => {
    setRequiresTOTP(false);
    setUserId(null);
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

  if (requiresTOTP && userId) {
    return (
      <TotpVerification
        userId={userId}
        onSuccess={handleTOTPSuccess}
        onCancel={handleTOTPCancel}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] h-[100dvh] overflow-hidden relative">
      {/* Gradient Background */}
      <div
        className={`absolute inset-0 ${bgClass}`}
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
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur-xl border transition-all ${isDark
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
          <div className="flex flex-col items-center mb-8">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg mb-4 ${isDark ? 'bg-gradient-to-br from-amber-700 to-orange-800' : 'bg-gradient-to-br from-red-600 to-green-600'}`}>
              <span className="text-white font-bold text-2xl">F</span>
            </div>
            <h2 className={`text-2xl font-bold ${textClass}`}>
              Welcome Back
            </h2>
            <p className={`mt-2 text-sm ${textSecondaryClass}`}>
              Sign in to your FestiveSuite account
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="identifier" className={`block text-sm font-medium mb-2 ${textSecondaryClass}`}>
                Email or Username
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                className={`w-full px-4 py-3 rounded-xl border backdrop-blur-md focus:outline-none focus:ring-2 transition-all ${inputClass}`}
                placeholder="Enter your email or username"
                value={formData.identifier}
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
                placeholder="Enter your password"
                value={formData.password}
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
              {loading ? 'Signing in...' : 'Sign in'}
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
            text="signin_with"
          />

          {/* Register Link */}
          <p className={`mt-6 text-center text-sm ${textSecondaryClass}`}>
            Don't have an account?{' '}
            <Link to="/register" className={`font-medium ${isDark ? 'text-amber-400 hover:text-amber-300' : 'text-blue-600 hover:text-blue-500'}`}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
