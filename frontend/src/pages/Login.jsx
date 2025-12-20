import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';
import TotpVerification from '../components/TotpVerification';

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
        // Show TOTP verification screen
        setRequiresTOTP(true);
        setUserId(result.userId);
      } else {
        navigate('/home');
      }
    } else if (result.requiresActivation) {
      // Redirect to activation page
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
          // Show TOTP verification screen
          setRequiresTOTP(true);
          setUserId(result.userId);
        } else if (result.requiresActivation) {
          // Navigate to activation page
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
          // Navigate to activation page for unactivated accounts
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
    // TOTP verification successful, update user state and navigate to home
    updateUser(data.user);
    navigate('/home');
  };

  const handleTOTPCancel = () => {
    // Cancel TOTP verification and go back to login
    setRequiresTOTP(false);
    setUserId(null);
  };

  // If TOTP is required, show the TOTP verification component
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
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
                Email or Username
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                className="input-field"
                placeholder="Enter your email or username"
                value={formData.identifier}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-field"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6">
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signin_with"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
