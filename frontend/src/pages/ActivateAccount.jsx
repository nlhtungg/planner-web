import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Mail } from 'lucide-react';

const ActivateAccount = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(1800);

  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  const { userId, email } = location.state || {};

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [userId, navigate]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();

    if (/^\d{6}$/.test(pastedData)) {
      const newCode = pastedData.split('');
      setCode(newCode);
      setError('');

      const lastInput = document.getElementById('code-5');
      if (lastInput) lastInput.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const activationCode = code.join('');

    if (activationCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      setLoading(false);
      return;
    }

    try {
      const result = await authService.activateAccount(userId, activationCode);

      if (result.success) {
        localStorage.setItem('accessToken', result.data.accessToken);
        localStorage.setItem('refreshToken', result.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        navigate('/home', { replace: true });
      } else {
        setError(result.message || 'Activation failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Activation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await authService.resendActivationCode(userId);

      if (result.success) {
        setSuccessMessage('A new activation code has been sent to your email');
        setTimeRemaining(1800);
        setCode(['', '', '', '', '', '']);

        const firstInput = document.getElementById('code-0');
        if (firstInput) firstInput.focus();
      } else {
        setError(result.message || 'Failed to resend code');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
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
    ? 'bg-slate-800/50 border-white/10 text-white focus:border-blue-500'
    : 'bg-white/50 border-white/30 text-slate-800 focus:border-blue-500';

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
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className={`text-2xl font-bold ${textClass}`}>
              Activate Your Account
            </h2>
            <p className={`mt-2 text-sm text-center ${textSecondaryClass}`}>
              We've sent a 6-digit code to{' '}
              <span className={`font-semibold ${textClass}`}>{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-3 text-center ${textSecondaryClass}`}>
                Enter Activation Code
              </label>
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${inputClass}`}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className={`rounded-xl p-4 flex items-center gap-3 ${isDark ? 'bg-red-900/30 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
                <svg className={`h-5 w-5 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-500'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
              </div>
            )}

            {successMessage && (
              <div className={`rounded-xl p-4 flex items-center gap-3 ${isDark ? 'bg-green-900/30 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
                <svg className={`h-5 w-5 flex-shrink-0 ${isDark ? 'text-green-400' : 'text-green-500'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className={`text-sm ${isDark ? 'text-green-300' : 'text-green-700'}`}>{successMessage}</p>
              </div>
            )}

            {/* Timer */}
            <div className={`text-center text-sm ${textSecondaryClass}`}>
              {timeRemaining > 0 ? (
                <p>
                  Code expires in{' '}
                  <span className={`font-semibold ${isDark ? 'text-amber-400' : 'text-blue-600'}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </p>
              ) : (
                <p className="text-red-500 font-semibold">Code expired</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || code.join('').length !== 6}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center ${isDark
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-[0_8px_30px_rgba(245,158,11,0.3)]'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg'
                }`}
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                'Activate Account'
              )}
            </button>

            {/* Resend Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                className={`text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'text-amber-400 hover:text-amber-300' : 'text-blue-600 hover:text-blue-500'}`}
              >
                {resending ? 'Sending...' : "Didn't receive the code? Resend"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ActivateAccount;
