import React, { createContext, useContext, useState, useEffect } from 'react';
import socketService from '../services/socketService';
import connectionService from '../services/connectionService';
import { useAuth } from './AuthContext';

const ConnectionContext = createContext();

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within ConnectionProvider');
  }
  return context;
};

export const ConnectionProvider = ({ children }) => {
  const { user } = useAuth();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Fetch initial count
  useEffect(() => {
    const fetchCount = async () => {
      if (!user?._id) return;
      
      try {
        const requests = await connectionService.getPendingRequests();
        setPendingRequestsCount(requests.length);
      } catch (error) {
        console.error('Error fetching pending requests:', error);
      }
    };

    fetchCount();
  }, [user]);

  // Listen to socket events
  useEffect(() => {
    if (!user?._id) return;

    const socket = socketService.connect();

    const handleFriendRequestReceived = () => {
      setPendingRequestsCount(prev => prev + 1);
    };

    const handleRequestAccepted = () => {
      // If I sent the request and it was accepted
      // No change to pending count since it's received requests
    };

    const handleRequestRejected = () => {
      // If my sent request was rejected
      // No change to pending count
    };

    const handleRequestCancelled = () => {
      // Someone cancelled their request to me
      setPendingRequestsCount(prev => Math.max(0, prev - 1));
    };

    socket.on('friend-request-received', handleFriendRequestReceived);
    socket.on('friend-request-accepted', handleRequestAccepted);
    socket.on('friend-request-rejected', handleRequestRejected);
    socket.on('friend-request-cancelled', handleRequestCancelled);

    return () => {
      socket.off('friend-request-received', handleFriendRequestReceived);
      socket.off('friend-request-accepted', handleRequestAccepted);
      socket.off('friend-request-rejected', handleRequestRejected);
      socket.off('friend-request-cancelled', handleRequestCancelled);
    };
  }, [user]);

  const refreshCount = async () => {
    if (!user?._id) return;
    
    try {
      const requests = await connectionService.getPendingRequests();
      setPendingRequestsCount(requests.length);
    } catch (error) {
      console.error('Error refreshing pending requests:', error);
    }
  };

  const decrementCount = () => {
    setPendingRequestsCount(prev => Math.max(0, prev - 1));
  };

  const value = {
    pendingRequestsCount,
    refreshCount,
    decrementCount,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
};
