import React, { useEffect, useRef } from 'react';

const GoogleSignInButton = ({ onSuccess, onError, text = 'signin_with' }) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    // Check if Google Sign-In library is loaded
    if (window.google) {
      initializeGoogleSignIn();
    } else {
      // Wait for the library to load
      window.addEventListener('load', initializeGoogleSignIn);
      return () => window.removeEventListener('load', initializeGoogleSignIn);
    }
  }, []);

  const initializeGoogleSignIn = () => {
    if (!window.google || !buttonRef.current) return;

    // Get Google Client ID from environment or use a placeholder
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';

    // Initialize Google Sign-In
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
    });

    // Render the button
    window.google.accounts.id.renderButton(
      buttonRef.current,
      {
        theme: 'outline',
        size: 'large',
        text: text, // 'signin_with', 'signup_with', or 'continue_with'
        width: buttonRef.current.offsetWidth,
        logo_alignment: 'left',
      }
    );
  };

  const handleCredentialResponse = (response) => {
    if (response.credential) {
      // Successfully got the ID token
      onSuccess(response.credential);
    } else {
      onError(new Error('Failed to get credential from Google'));
    }
  };

  return (
    <div>
      <div ref={buttonRef} className="w-full"></div>
      {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
        <p className="text-xs text-amber-600 mt-2">
          ⚠️ Google Client ID not configured. Add VITE_GOOGLE_CLIENT_ID to .env file.
        </p>
      )}
    </div>
  );
};

export default GoogleSignInButton;
