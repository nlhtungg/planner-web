import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import socketService from '../services/socketService';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socketReady, setSocketReady] = useState(false);

  useEffect(() => {
    // Connect socket when user logs in
    if (user && user._id) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        console.log('🔌 Initializing socket connection for user:', user._id);
        const socket = socketService.connect(user._id, token);
        
        if (socket) {
          // Wait for actual connection
          socket.once('connect', () => {
            setSocketReady(true);
            console.log('✅ Socket ready for use');
          });
        }
      } else {
        console.warn('⚠️ No access token found, cannot connect socket');
      }
    } else {
      // Disconnect when user logs out
      if (socketService.socket) {
        console.log('🔌 Disconnecting socket (user logged out)');
        socketService.disconnect();
        setSocketReady(false);
      }
    }

    // Cleanup on unmount
    return () => {
      // Keep socket alive for the session; only disconnect on logout
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socketService, socketReady }}>
      {children}
    </SocketContext.Provider>
  );
};
