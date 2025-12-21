import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Shield } from 'lucide-react';

const TotpVerification = ({ userId, onSuccess, onCancel }) => {
  const [token, setToken] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const handleTokenChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setToken(value);
    setError('');
  };

  const handleBackupCodeChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setBackupCode(value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let response;

      if (useBackupCode) {
        if (!backupCode) {
          setError('Please enter a backup code');
          setLoading(false);
          return;
        }
        response = await authService.verifyBackupCode(userId, backupCode);
      } else {
        if (token.length !== 6) {
          setError('Please enter a 6-digit code');
          setLoading(false);
          return;
        }
        response = await authService.verifyTOTP(userId, token);
      }

      if (response.success) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        if (onSuccess) {
          onSuccess(response.data);
        } else {
          navigate('/home');
        }
      } else {
        setError(response.message || 'Verification failed');
      }
    } catch (err) {
      console.error('TOTP verification error:', err);
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
          {/* Icon & Title */}
          <div className="flex flex-col items-center mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg mb-4 ${isDark ? 'bg-gradient-to-br from-amber-700 to-orange-800' : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className={`text-2xl font-bold ${textClass}`}>
              Two-Factor Authentication
            </h2>
            <p className={`mt-2 text-sm text-center ${textSecondaryClass}`}>
              {useBackupCode
                ? 'Enter one of your backup codes'
                : 'Enter the 6-digit code from your authenticator app'}
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className={`rounded-xl p-4 ${isDark ? 'bg-red-900/30 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-800'}`}>{error}</p>
              </div>
            )}

            <div>
              {useBackupCode ? (
                <input
                  id="backup-code"
                  name="backupCode"
                  type="text"
                  value={backupCode}
                  onChange={handleBackupCodeChange}
                  className={`w-full px-4 py-4 rounded-xl border backdrop-blur-md focus:outline-none focus:ring-2 transition-all text-center uppercase tracking-widest text-xl font-mono ${inputClass}`}
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  autoComplete="off"
                />
              ) : (
                <input
                  id="totp-code"
                  name="token"
                  type="text"
                  inputMode="numeric"
                  value={token}
                  onChange={handleTokenChange}
                  className={`w-full px-4 py-4 rounded-xl border backdrop-blur-md focus:outline-none focus:ring-2 transition-all text-center text-3xl tracking-[0.5em] font-mono ${inputClass}`}
                  placeholder="000000"
                  maxLength={6}
                  autoComplete="off"
                  autoFocus
                />
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setToken('');
                  setBackupCode('');
                  setError('');
                }}
                className={`text-sm font-medium transition-colors ${isDark ? 'text-amber-400 hover:text-amber-300' : 'text-blue-600 hover:text-blue-500'}`}
              >
                {useBackupCode ? 'Use authenticator code' : 'Use backup code'}
              </button>

              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className={`text-sm font-medium transition-colors ${textSecondaryClass} hover:${textClass}`}
                >
                  Cancel
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (!useBackupCode && token.length !== 6) || (useBackupCode && !backupCode)}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isDark
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-[0_8px_30px_rgba(245,158,11,0.3)]'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg'
                }`}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>

          {/* Info */}
          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${isDark ? 'border-white/10' : 'border-slate-300'}`} />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`px-3 ${isDark ? 'bg-slate-900/40 text-slate-400' : 'bg-white/60 text-slate-500'}`}>
                Code refreshes every 30 seconds
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TotpVerification;
