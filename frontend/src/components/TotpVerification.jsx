import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const TotpVerification = ({ userId, onSuccess, onCancel }) => {
  const [token, setToken] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
        // Store tokens
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Call success callback if provided
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

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Two-Factor Authentication
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {useBackupCode
              ? 'Enter one of your backup codes'
              : 'Enter the 6-digit code from your authenticator app'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            {useBackupCode ? (
              <div>
                <label htmlFor="backup-code" className="sr-only">
                  Backup Code
                </label>
                <input
                  id="backup-code"
                  name="backupCode"
                  type="text"
                  value={backupCode}
                  onChange={handleBackupCodeChange}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center uppercase tracking-wider"
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  autoComplete="off"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="totp-code" className="sr-only">
                  Authentication Code
                </label>
                <input
                  id="totp-code"
                  name="token"
                  type="text"
                  inputMode="numeric"
                  value={token}
                  onChange={handleTokenChange}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  autoComplete="off"
                  autoFocus
                />
              </div>
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
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              {useBackupCode ? 'Use authenticator code' : 'Use backup code'}
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-sm font-medium text-gray-600 hover:text-gray-500"
              >
                Cancel
              </button>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || (!useBackupCode && token.length !== 6) || (useBackupCode && !backupCode)}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Your code refreshes every 30 seconds
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TotpVerification;
