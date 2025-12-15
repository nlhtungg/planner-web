import { io } from 'socket.io-client';

// Remove /api suffix for Socket.io connection (Socket.io connects to root, not /api)
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace('/api', '');

console.log('Socket URL:', SOCKET_URL);

class SocketService {
  constructor() {
    this.socket = null;
    this.currentWorkspaceId = null;
  }

  connect() {
    if (!this.socket) {
      console.log('Initializing socket connection to:', SOCKET_URL);
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket connected:', this.socket.id);
        // Rejoin workspace if was previously in one
        if (this.currentWorkspaceId) {
          console.log('Rejoining workspace:', this.currentWorkspaceId);
          this.joinWorkspace(this.currentWorkspaceId);
        }
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      if (this.currentWorkspaceId) {
        this.leaveWorkspace(this.currentWorkspaceId);
      }
      this.socket.disconnect();
      this.socket = null;
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

  // Post events
  onNewPost(callback) {
    if (this.socket) {
      const wrappedCallback = (data) => {
        console.log('📬 Received new-post event:', data);
        callback(data);
      };
      this.socket.on('new-post', wrappedCallback);
      console.log('Listening for new-post events');
    }
  }

  onUpdatePost(callback) {
    if (this.socket) {
      const wrappedCallback = (data) => {
        console.log('📝 Received update-post event:', data);
        callback(data);
      };
      this.socket.on('update-post', wrappedCallback);
      console.log('Listening for update-post events');
    }
  }

  onDeletePost(callback) {
    if (this.socket) {
      const wrappedCallback = (data) => {
        console.log('🗑️ Received delete-post event:', data);
        callback(data);
      };
      this.socket.on('delete-post', wrappedCallback);
      console.log('Listening for delete-post events');
    }
  }

  // Comment events
  onNewComment(callback) {
    if (this.socket) {
      const wrappedCallback = (data) => {
        console.log('💬 Received new-comment event:', data);
        callback(data);
      };
      this.socket.on('new-comment', wrappedCallback);
      console.log('Listening for new-comment events');
    }
  }

  onUpdateComment(callback) {
    if (this.socket) {
      const wrappedCallback = (data) => {
        console.log('✏️ Received update-comment event:', data);
        callback(data);
      };
      this.socket.on('update-comment', wrappedCallback);
      console.log('Listening for update-comment events');
    }
  }

  onDeleteComment(callback) {
    if (this.socket) {
      const wrappedCallback = (data) => {
        console.log('🗑️ Received delete-comment event:', data);
        callback(data);
      };
      this.socket.on('delete-comment', wrappedCallback);
      console.log('Listening for delete-comment events');
    }
  }

  // Chat methods
  joinChat(userId) {
    if (this.socket && userId) {
      this.socket.emit('join-chat', userId);
      console.log('🔵 Socket: Joined chat room for user:', userId);
    }
  }

  leaveChat(userId) {
    if (this.socket && userId) {
      this.socket.emit('leave-chat', userId);
      console.log('🔴 Socket: Left chat room for user:', userId);
    }
  }

  // Remove listeners
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

// Export singleton instance
export default new SocketService();
