import React, { useState, useEffect } from 'react';
import authService from '../services/authService';

const TotpSetup = () => {
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [disableToken, setDisableToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    fetchTOTPStatus();
  }, []);

  const fetchTOTPStatus = async () => {
    try {
      const response = await authService.getTOTPStatus();
      if (response.success) {
        setTotpEnabled(response.data.totpEnabled);
      }
    } catch (err) {
      console.error('Error fetching TOTP status:', err);
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authService.setupTOTP();
      if (response.success) {
        setQrCode(response.data.qrCode);
        setSecret(response.data.secret);
        setSetupMode(true);
      } else {
        setError(response.message || 'Failed to setup TOTP');
      }
    } catch (err) {
      console.error('Setup error:', err);
      setError(err.response?.data?.message || 'Failed to setup TOTP');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (verificationToken.length !== 6) {
      setError('Please enter a 6-digit code');
      setLoading(false);
      return;
    }

    try {
      const response = await authService.enableTOTP(verificationToken);
      if (response.success) {
        setBackupCodes(response.data.backupCodes);
        setShowBackupCodes(true);
        setTotpEnabled(true);
        setSetupMode(false);
        setSuccess('Two-factor authentication enabled successfully!');
      } else {
        setError(response.message || 'Failed to enable TOTP');
      }
    } catch (err) {
      console.error('Enable error:', err);
      setError(err.response?.data?.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (disableToken.length !== 6) {
      setError('Please enter a 6-digit code');
      setLoading(false);
      return;
    }

    try {
      const response = await authService.disableTOTP(disableToken);
      if (response.success) {
        setTotpEnabled(false);
        setDisableToken('');
        setSuccess('Two-factor authentication disabled successfully');
      } else {
        setError(response.message || 'Failed to disable TOTP');
      }
    } catch (err) {
      console.error('Disable error:', err);
      setError(err.response?.data?.message || 'Failed to disable TOTP');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSetup = () => {
    setSetupMode(false);
    setQrCode('');
    setSecret('');
    setVerificationToken('');
    setError('');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  if (showBackupCodes) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Save Your Backup Codes
        </h2>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Save these backup codes in a safe place. Each code can only be used once.
                You can use them to access your account if you lose your authenticator device.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-md font-mono text-sm mb-6">
          <div className="grid grid-cols-2 gap-3">
            {backupCodes.map((code, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                <span>{code}</span>
                <button
                  onClick={() => copyToClipboard(code)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                  title="Copy to clipboard"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowBackupCodes(false)}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          I've Saved My Backup Codes
        </button>
      </div>
    );
  }

  if (setupMode) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Setup Two-Factor Authentication
        </h2>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div className="flex justify-center bg-gray-50 p-6 rounded-lg">
              <img src={qrCode} alt="QR Code" className="max-w-xs" />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">
              Or enter this code manually:
            </p>
            <div className="flex items-center space-x-2">
              <code className="flex-1 bg-gray-50 px-4 py-2 rounded font-mono text-sm break-all">
                {secret}
              </code>
              <button
                onClick={() => copyToClipboard(secret)}
                className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded text-sm"
                title="Copy to clipboard"
              >
                Copy
              </button>
            </div>
          </div>

          <form onSubmit={handleEnable}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter the 6-digit code from your app to verify:
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={verificationToken}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationToken(value);
                setError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
              placeholder="000000"
              maxLength={6}
              autoComplete="off"
            />

            <div className="mt-6 flex space-x-3">
              <button
                type="submit"
                disabled={loading || verificationToken.length !== 6}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Enable 2FA'}
              </button>
              <button
                type="button"
                onClick={handleCancelSetup}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Two-Factor Authentication
      </h2>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Status</h3>
            <p className="text-sm text-gray-600">
              Two-factor authentication is{' '}
              <span className={totpEnabled ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                {totpEnabled ? 'enabled' : 'disabled'}
              </span>
            </p>
          </div>
          <div>
            {totpEnabled ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Inactive
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-4">
          Two-factor authentication adds an extra layer of security to your account. 
          When enabled, you'll need to enter a code from your authenticator app every time you sign in.
        </p>
      </div>

      {!totpEnabled ? (
        <button
          onClick={handleSetup}
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
        </button>
      ) : (
        <form onSubmit={handleDisable}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter your current 6-digit code to disable:
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={disableToken}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setDisableToken(value);
              setError('');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-center text-2xl tracking-widest"
            placeholder="000000"
            maxLength={6}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading || disableToken.length !== 6}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Disabling...' : 'Disable Two-Factor Authentication'}
          </button>
        </form>
      )}
    </div>
  );
};

export default TotpSetup;
