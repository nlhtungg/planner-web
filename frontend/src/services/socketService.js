import { io } from 'socket.io-client';

// Use relative path to work with Vite proxy and ngrok tunneling
// Empty string or '/' means: use current origin + default /socket.io path
// Vite proxy will forward /socket.io requests to localhost:3001
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/';
console.log('Socket URL:', SOCKET_URL);

class SocketService {
  constructor() {
    this.socket = null;
    this.currentWorkspaceId = null;
    this.currentUserId = null;
    this.registeredListeners = new Map(); // Track listeners to prevent leaks
  }

  /**
   * Initialize socket connection with JWT authentication
   * @param {string} userId - Current user's ID
   * @param {string} token - JWT access token
   */
  connect(userId, token) {
    // If already connected with same userId, just return
    if (this.socket && this.currentUserId === userId) {
      return this.socket;
    }

    // Disconnect old socket if exists
    if (this.socket) {
      this.disconnect();
    }

    if (!token) {
      console.error('❌ Cannot connect socket: token required');
      return null;
    }

    console.log('Initializing socket connection to:', SOCKET_URL);
    this.currentUserId = userId;

    this.socket = io(SOCKET_URL, {
      auth: { token }, // Send JWT in handshake
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log(`✅ Socket connected: ${this.socket.id} (userId: ${this.currentUserId})`);
      
      // Auto-rejoin rooms on reconnect
      if (this.currentWorkspaceId) {
        console.log('♻️ Rejoining workspace:', this.currentWorkspaceId);
        this.joinWorkspace(this.currentWorkspaceId);
      }
      
      // User room is auto-joined by server, just wait for ACK
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    // Listen for ACK events (debugging)
    this.socket.on('joined-workspace', ({ workspaceId, roomSize }) => {
      console.log(`✅ ACK: Joined workspace-${workspaceId} (${roomSize} clients)`);
    });

    this.socket.on('joined-chat', ({ userId, roomSize }) => {
      console.log(`✅ ACK: Joined user-${userId} chat room (${roomSize} clients)`);
    });

    this.socket.on('error', (error) => {
      console.error('⚠️ Socket error:', error.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      if (this.currentWorkspaceId) {
        this.leaveWorkspace(this.currentWorkspaceId);
      }
      this.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.currentUserId = null;
      this.currentWorkspaceId = null;
      console.log('🔌 Socket disconnected and cleaned up');
    }
  }

  /**
   * Register a listener with tracking to prevent duplicates
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  _registerListener(event, callback) {
    if (!this.socket) return;

    // Check if already registered
    const key = `${event}`;
    if (this.registeredListeners.has(key)) {
      console.warn(`⚠️ Listener for '${event}' already registered, skipping`);
      return;
    }

    this.socket.on(event, callback);
    this.registeredListeners.set(key, callback);
    console.log(`👂 Registered listener: ${event}`);
  }

  /**
   * Unregister a specific listener
   * @param {string} event - Event name
   */
  _unregisterListener(event) {
    const key = `${event}`;
    const callback = this.registeredListeners.get(key);
    
    if (callback && this.socket) {
      this.socket.off(event, callback);
      this.registeredListeners.delete(key);
      console.log(`🔇 Unregistered listener: ${event}`);
    }
  }

  joinWorkspace(workspaceId) {
    if (this.socket && workspaceId) {
      // Leave previous workspace if any
      if (this.currentWorkspaceId && this.currentWorkspaceId !== workspaceId) {
        this.leaveWorkspace(this.currentWorkspaceId);
      }
      
      this.socket.emit('join-workspace', workspaceId);
      this.currentWorkspaceId = workspaceId;
      console.log('Joined workspace:', workspaceId);
    }
  }

  leaveWorkspace(workspaceId) {
    if (this.socket && workspaceId) {
      this.socket.emit('leave-workspace', workspaceId);
      console.log('Left workspace:', workspaceId);
      if (this.currentWorkspaceId === workspaceId) {
        this.currentWorkspaceId = null;
      }
    }
  }

  // Post events - Fixed: store callback reference properly
  onNewPost(callback) {
    if (this.socket) {
      this._registerListener('new-post', callback);
    }
  }

  onUpdatePost(callback) {
    if (this.socket) {
      this._registerListener('update-post', callback);
    }
  }

  onDeletePost(callback) {
    if (this.socket) {
      this._registerListener('delete-post', callback);
    }
  }

  // Comment events
  onNewComment(callback) {
    if (this.socket) {
      this._registerListener('new-comment', callback);
    }
  }

  onUpdateComment(callback) {
    if (this.socket) {
      this._registerListener('update-comment', callback);
    }
  }

  onDeleteComment(callback) {
    if (this.socket) {
      this._registerListener('delete-comment', callback);
    }
  }

  // Chat methods - no longer needed as user room is auto-joined by server
  joinChat(userId) {
    // Kept for backward compatibility, but server auto-joins on connect
    if (this.socket && userId) {
      this.socket.emit('join-chat', userId);
      console.log('🔵 Socket: Manually joining chat room for user:', userId);
    }
  }

  leaveChat(userId) {
    if (this.socket && userId) {
      this.socket.emit('leave-chat', userId);
      console.log('🔴 Socket: Left chat room for user:', userId);
    }
  }

  // Remove listeners
  off(event) {
    this._unregisterListener(event);
  }

  removeAllListeners() {
    if (this.socket) {
      // Unregister all tracked listeners
      for (const [key, callback] of this.registeredListeners.entries()) {
        const event = key;
        this.socket.off(event, callback);
      }
      this.registeredListeners.clear();
      console.log('🧹 Removed all listeners');
    }
  }
}

// Export singleton instance
export default new SocketService();