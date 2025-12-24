# 🔌 SOCKET.IO - REAL-TIME COMMUNICATION SYSTEM

## 📖 MỤC LỤC

1. [Socket.IO Là Gì?](#socketio-là-gì)
2. [Kiến Trúc Socket.IO Trong Dự Án](#kiến-trúc-socketio-trong-dự-án)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Room System](#room-system)
6. [Authentication & Security](#authentication--security)
7. [Event Reference](#event-reference)
8. [Data Flow Patterns](#data-flow-patterns)
9. [Error Handling](#error-handling)
10. [Performance & Optimization](#performance--optimization)
11. [Testing & Debugging](#testing--debugging)

---

## SOCKET.IO LÀ GÌ?

### Định Nghĩa

**Socket.IO** là một JavaScript library cho phép **real-time, bidirectional, event-based communication** giữa client và server. Nó được xây dựng trên **WebSocket protocol** nhưng cung cấp fallback options và nhiều tính năng nâng cao.

### Tại Sao Dùng Socket.IO?

**So với HTTP Request-Response truyền thống:**

| HTTP (Traditional) | Socket.IO (Real-time) |
|-------------------|----------------------|
| Request → Response | Bidirectional |
| Client-initiated only | Server có thể push data |
| Polling required cho updates | Event-driven, instant updates |
| Overhead cao cho real-time | Persistent connection |
| RESTful paradigm | Event-based paradigm |

**Ưu điểm Socket.IO:**
- ✅ **Real-time Updates:** Instant data synchronization
- ✅ **Bidirectional:** Client ⇄ Server communication
- ✅ **Event-based:** Flexible event system
- ✅ **Rooms & Namespaces:** Logical grouping
- ✅ **Auto-reconnection:** Built-in reconnection logic
- ✅ **Fallback Support:** WebSocket → Polling nếu cần
- ✅ **Binary Support:** Send files, images, etc.

**Use Cases trong Dự Án:**
- 💬 Real-time messaging (chat)
- 👥 Friend request notifications
- 📝 Collaborative document editing
- 🔔 System notifications
- 📊 Live workspace updates
- 🔄 Task synchronization

---

### WebSocket vs Socket.IO

**WebSocket Protocol:**
- Low-level protocol (RFC 6455)
- Persistent TCP connection
- Raw message passing
- No built-in features

**Socket.IO:**
- High-level library built on WebSocket
- Auto-reconnection
- Room & namespace support
- Event emitters
- Acknowledgments (callbacks)
- Binary streaming
- Fallback to HTTP long-polling

---

## KIẾN TRÚC SOCKET.IO TRONG DỰ ÁN

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                            │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  SocketProvider (Context)                                  │ │
│  │  - Lifecycle: Connect on login, disconnect on logout      │ │
│  │  - State: socketReady boolean                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            ↓                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  socketService.js (Singleton)                             │ │
│  │  - Socket.IO Client Instance                              │ │
│  │  - Connection Management                                  │ │
│  │  - Room Management                                        │ │
│  │  - Event Listener Registry                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            ↓                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Consuming Components                                      │ │
│  │  - ConnectionContext (friend events)                      │ │
│  │  - Messages.jsx (chat events)                             │ │
│  │  - WorkspaceDetail.jsx (workspace events)                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                ↕
                    WebSocket Connection (wss://)
                    + HTTP Long-polling (fallback)
                                ↕
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js)                           │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  server.js - Socket.IO Server Initialization              │ │
│  │  - io = require('socket.io')(httpServer)                  │ │
│  │  - CORS configuration                                     │ │
│  │  - Middleware chain                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            ↓                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  socketAuth Middleware                                     │ │
│  │  - JWT token verification                                 │ │
│  │  - Attach userId to socket object                         │ │
│  │  - Reject invalid connections                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            ↓                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Connection Event Handlers                                 │ │
│  │  - Auto-join personal room                                │ │
│  │  - Handle join-workspace, leave-workspace                 │ │
│  │  - Handle chat events                                     │ │
│  │  - Handle typing indicators                               │ │
│  │  - Handle document collaboration                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            ↓                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  global.io Instance                                        │ │
│  │  - Available in all controllers                           │ │
│  │  - Used to emit events from business logic                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            ↓                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Controllers (Event Emitters)                              │ │
│  │  - messageController → new-message events                 │ │
│  │  - connectionController → friend-request events           │ │
│  │  - workspaceController → workspace-update events          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## BACKEND IMPLEMENTATION

### 1. Server Initialization

**File:** `backend/src/server.js`

**Socket.IO Setup:**

```javascript
// Import Socket.IO
const io = require('socket.io')(server, {
  cors: {
    origin: config.cors.origin,        // Frontend URL
    methods: ["GET", "POST"],          // Allowed methods
    credentials: true                  // Allow cookies/auth headers
  }
});
```

**Configuration Options:**

| Option | Value | Purpose |
|--------|-------|---------|
| `cors.origin` | `http://localhost:5173` | Allowed origin for CORS |
| `cors.methods` | `["GET", "POST"]` | HTTP methods cho handshake |
| `cors.credentials` | `true` | Allow authentication headers |
| `transports` | `['websocket', 'polling']` | Connection methods |
| `reconnection` | `true` (default) | Auto-reconnect |
| `pingTimeout` | `60000` (default) | Timeout cho ping |

**Why CORS?**
- Frontend chạy trên port 5173 (Vite)
- Backend chạy trên port 3001 (Express)
- Cross-origin requests require CORS configuration

---

### 2. Authentication Middleware

**File:** `backend/src/middlewares/socketAuth.js`

**Purpose:** Verify JWT token trước khi allow socket connection.

**Flow:**

```
Client initiates connection với auth: {token}
    ↓
socketAuth middleware intercepts
    ↓
Extract token từ socket.handshake.auth.token
    ↓
Verify JWT token với authService.verifyAccessToken()
    ↓
Decode token → {id: userId, email, ...}
    ↓
Query database: userRepository.getUserById(decoded.id)
    ↓
Check user.isActive === true
    ↓
Attach to socket:
  - socket.userId = user._id.toString()
  - socket.userEmail = user.email
    ↓
Call next() → Connection allowed
    ↓
OR
Call next(new Error(...)) → Connection rejected
```

**Implementation Details:**

```javascript
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    // Validation checks
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    
    // Verify JWT
    const decoded = authService.verifyAccessToken(token);
    
    // Get user từ DB
    const user = await userRepository.getUserById(decoded.id);
    
    // Validate user
    if (!user) {
      return next(new Error('User not found'));
    }
    
    if (!user.isActive) {
      return next(new Error('Account is deactivated'));
    }
    
    // Attach user info to socket
    socket.userId = user._id.toString();
    socket.userEmail = user.email;
    
    console.log(`🔐 Socket authenticated: ${user.email}`);
    next(); // Allow connection
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }
    console.error('Socket auth error:', error.message);
    return next(new Error('Invalid token'));
  }
};
```

**Security Features:**
- ✅ JWT verification với secret key
- ✅ Token expiration check
- ✅ User existence validation
- ✅ Active account check
- ✅ Error handling cho invalid tokens

---

### 3. Connection Event Handlers

**File:** `backend/src/server.js`

**Main Connection Handler:**

```javascript
io.on('connection', (socket) => {
  console.log(`👤 User connected: ${socket.id} (userId: ${socket.userId})`);
  
  // Auto-join personal room
  const userRoom = `user-${socket.userId}`;
  socket.join(userRoom);
  console.log(`💬 Auto-joined chat room: ${userRoom}`);
  
  // Event listeners...
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
```

**Available socket properties:**
- `socket.id` - Unique socket ID (changes on reconnect)
- `socket.userId` - User's database ID (from auth middleware)
- `socket.userEmail` - User's email (from auth middleware)
- `socket.rooms` - Set of rooms socket has joined

---

### 4. Room Management Events

#### Join Workspace

**Event:** `join-workspace`

**Purpose:** User joins workspace room để nhận real-time updates.

**Handler:**
```javascript
socket.on('join-workspace', (workspaceId) => {
  socket.join(`workspace-${workspaceId}`);
  console.log(`✅ User ${socket.id} joined workspace-${workspaceId}`);
  
  // Get room size
  const room = io.sockets.adapter.rooms.get(`workspace-${workspaceId}`);
  console.log(`   Total clients: ${room ? room.size : 0}`);
  
  // Send acknowledgment
  socket.emit('joined-workspace', { 
    workspaceId, 
    roomSize: room ? room.size : 0 
  });
});
```

**Use Case:**
- User opens workspace detail page
- Frontend emits `join-workspace` event
- Backend adds socket to workspace room
- Subsequent workspace events broadcast to room

---

#### Leave Workspace

**Event:** `leave-workspace`

**Handler:**
```javascript
socket.on('leave-workspace', (workspaceId) => {
  socket.leave(`workspace-${workspaceId}`);
  console.log(`❌ User ${socket.id} left workspace-${workspaceId}`);
});
```

**Use Case:**
- User navigates away from workspace
- Component cleanup
- Prevent receiving irrelevant updates

---

#### Join Chat

**Event:** `join-chat`

**Security:** Validates user can only join own chat room.

**Handler:**
```javascript
socket.on('join-chat', (userId) => {
  // Security check
  if (userId !== socket.userId) {
    console.warn(`⚠️ User ${socket.userId} attempted to join chat for ${userId}`);
    socket.emit('error', { message: 'Cannot join another user\'s chat room' });
    return;
  }
  
  const chatRoom = `user-${userId}`;
  socket.join(chatRoom);
  console.log(`💬 User ${socket.id} joined chat room ${chatRoom}`);
  
  // ACK
  const room = io.sockets.adapter.rooms.get(chatRoom);
  socket.emit('joined-chat', { userId, roomSize: room ? room.size : 0 });
});
```

**Note:** Personal chat room (`user-${userId}`) already auto-joined on connection.

---

#### Typing Indicators

**Events:** `typing`, `stop-typing`

**Purpose:** Show "User is typing..." trong chat.

**Handlers:**
```javascript
socket.on('typing', ({ senderId, receiverId }) => {
  socket.to(`user-${receiverId}`).emit('user-typing', { userId: senderId });
});

socket.on('stop-typing', ({ senderId, receiverId }) => {
  socket.to(`user-${receiverId}`).emit('user-stop-typing', { userId: senderId });
});
```

**Flow:**
```
User A starts typing
  ↓
Frontend emits 'typing' với {senderId: A, receiverId: B}
  ↓
Backend forwards to user-B room
  ↓
User B receives 'user-typing' event
  ↓
UI shows "User A is typing..."
```

---

### 5. Document Collaboration Events

**Events:**
- `join-document` - Join document editing session
- `leave-document` - Leave session
- `send-changes` - Broadcast text changes (delta)
- `new-comment` - Broadcast new comment
- `new-version` - Broadcast new version

**Handlers:**
```javascript
socket.on('join-document', (documentId) => {
  socket.join(documentId);
  console.log(`User ${socket.id} joined document ${documentId}`);
});

socket.on('send-changes', (delta, documentId) => {
  // Broadcast to all OTHER users in document room
  socket.broadcast.to(documentId).emit('receive-changes', delta);
});

socket.on('new-comment', (comment, documentId) => {
  socket.broadcast.to(documentId).emit('comment-added', comment);
});
```

**Use Case:**
- Real-time collaborative editing (Google Docs-like)
- Operational Transformation (OT) or CRDT
- Comment threads
- Version control

---

### 6. Global IO Instance

**Purpose:** Allow controllers to emit events.

**Setup:**
```javascript
// server.js
global.io = io;
```

**Usage trong Controllers:**

```javascript
// messageController.js
async sendMessage(req, res) {
  // ... create message logic ...
  
  // Emit to recipient
  if (global.io) {
    global.io.to(`user-${receiverId}`).emit('new-message', message);
    global.io.to(`user-${senderId}`).emit('new-message', message);
  }
  
  res.status(201).json({ success: true, data: message });
}
```

**Pattern:**
- Controller xử lý business logic
- Save data to database
- Emit socket event for real-time sync
- Return HTTP response

---

## FRONTEND IMPLEMENTATION

### 1. SocketService Class (Singleton)

**File:** `frontend/src/services/socketService.js`

**Purpose:** Centralized socket management với singleton pattern.

**Class Structure:**

```javascript
class SocketService {
  constructor() {
    this.socket = null;                           // Socket.IO client instance
    this.currentWorkspaceId = null;               // Active workspace
    this.currentUserId = null;                    // Current user
    this.registeredListeners = new Map();         // Track listeners
  }
  
  // Methods:
  connect(userId, token)                          // Initialize connection
  disconnect()                                    // Cleanup và disconnect
  joinWorkspace(workspaceId)                      // Join workspace room
  leaveWorkspace(workspaceId)                     // Leave workspace room
  _registerListener(event, callback)              // Track listeners
  _unregisterListener(event)                      // Remove listener
  removeAllListeners()                            // Cleanup all
}
```

---

### 2. Connection Method

**Method:** `connect(userId, token)`

**Purpose:** Khởi tạo Socket.IO client connection với authentication.

**Implementation:**

```javascript
connect(userId, token) {
  // Prevent duplicate connections
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
  
  this.currentUserId = userId;
  
  // Initialize Socket.IO client
  this.socket = io(SOCKET_URL, {
    auth: { token },                              // JWT token
    transports: ['websocket', 'polling'],         // Connection methods
    reconnection: true,                           // Auto-reconnect
    reconnectionDelay: 1000,                      // 1s delay
    reconnectionAttempts: 5                       // Max 5 attempts
  });
  
  // Connection lifecycle handlers
  this.socket.on('connect', () => {
    console.log(`✅ Socket connected: ${this.socket.id}`);
    
    // Rejoin rooms on reconnect
    if (this.currentWorkspaceId) {
      this.joinWorkspace(this.currentWorkspaceId);
    }
  });
  
  this.socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });
  
  this.socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });
  
  return this.socket;
}
```

**Configuration Options:**

| Option | Value | Purpose |
|--------|-------|---------|
| `auth.token` | JWT string | Authentication |
| `transports` | `['websocket', 'polling']` | Try WebSocket first, fallback to polling |
| `reconnection` | `true` | Auto-reconnect on disconnect |
| `reconnectionDelay` | `1000` ms | Wait 1s trước khi reconnect |
| `reconnectionAttempts` | `5` | Try max 5 times |

---

### 3. Listener Management

**Problem:** Memory leaks từ duplicate listeners.

**Solution:** Track listeners trong Map và prevent duplicates.

**Register Listener:**
```javascript
_registerListener(event, callback) {
  if (!this.socket) return;
  
  const key = `${event}`;
  
  // Check if already registered
  if (this.registeredListeners.has(key)) {
    console.warn(`⚠️ Listener for '${event}' already registered`);
    return;
  }
  
  this.socket.on(event, callback);
  this.registeredListeners.set(key, callback);
  console.log(`👂 Registered listener: ${event}`);
}
```

**Unregister Listener:**
```javascript
_unregisterListener(event) {
  const key = `${event}`;
  const callback = this.registeredListeners.get(key);
  
  if (callback && this.socket) {
    this.socket.off(event, callback);
    this.registeredListeners.delete(key);
    console.log(`🔇 Unregistered listener: ${event}`);
  }
}
```

**Remove All:**
```javascript
removeAllListeners() {
  if (this.socket) {
    for (const [event, callback] of this.registeredListeners.entries()) {
      this.socket.off(event, callback);
    }
    this.registeredListeners.clear();
    console.log('🧹 Removed all listeners');
  }
}
```

---

### 4. SocketContext Provider

**File:** `frontend/src/context/SocketContext.jsx`

**Purpose:** Provide socket instance và status tới all components.

**Implementation:**

```javascript
export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socketReady, setSocketReady] = useState(false);
  
  useEffect(() => {
    // Connect when user logs in
    if (user && user._id) {
      const token = localStorage.getItem('accessToken');
      
      if (token) {
        console.log('🔌 Initializing socket for user:', user._id);
        const socket = socketService.connect(user._id, token);
        
        if (socket) {
          socket.once('connect', () => {
            setSocketReady(true);
            console.log('✅ Socket ready');
          });
        }
      }
    } else {
      // Disconnect when user logs out
      if (socketService.socket) {
        console.log('🔌 Disconnecting socket (logout)');
        socketService.disconnect();
        setSocketReady(false);
      }
    }
  }, [user]);
  
  return (
    <SocketContext.Provider value={{ socketService, socketReady }}>
      {children}
    </SocketContext.Provider>
  );
};
```

**Context Value:**
- `socketService` - SocketService instance
- `socketReady` - Boolean flag (true after connection established)

**Usage trong Components:**
```javascript
const { socketService, socketReady } = useSocket();

useEffect(() => {
  if (!socketReady) return;
  
  const socket = socketService.socket;
  
  socket.on('new-message', (message) => {
    // Handle new message
  });
  
  return () => {
    socket.off('new-message');
  };
}, [socketReady]);
```

---

### 5. ConnectionContext Example

**File:** `frontend/src/context/ConnectionContext.jsx`

**Purpose:** Listen to friend connection events và update state.

**Implementation:**

```javascript
export const ConnectionProvider = ({ children }) => {
  const { user } = useAuth();
  const { socketReady } = useSocket();
  const [connections, setConnections] = useState([]);
  
  useEffect(() => {
    if (!user?._id || !socketReady) return;
    
    const socket = socketService.socket;
    if (!socket) return;
    
    // Event handlers
    const handleFriendRequestReceived = (data) => {
      console.log('📩 Friend request received:', data);
      // Update state, show notification
    };
    
    const handleRequestAccepted = (data) => {
      console.log('✅ Friend request accepted:', data);
      // Update friends list
    };
    
    // Register listeners
    socket.on('friend-request-received', handleFriendRequestReceived);
    socket.on('friend-request-accepted', handleRequestAccepted);
    socket.on('friend-request-rejected', handleRequestRejected);
    socket.on('friend-request-cancelled', handleRequestCancelled);
    
    console.log('✅ Connection listeners registered');
    
    // Cleanup
    return () => {
      socket.off('friend-request-received', handleFriendRequestReceived);
      socket.off('friend-request-accepted', handleRequestAccepted);
      // ... other off() calls
    };
  }, [user, socketReady]);
  
  return (
    <ConnectionContext.Provider value={{ connections }}>
      {children}
    </ConnectionContext.Provider>
  );
};
```

---

## ROOM SYSTEM

### Room Concept

**Room** là một logical grouping của sockets. Server có thể emit events tới tất cả sockets trong một room.

**Benefits:**
- Target specific users
- Broadcast to groups
- Namespace separation
- Efficient event routing

---

### Room Patterns trong Dự Án

#### 1. Personal Room

**Format:** `user-${userId}`

**Purpose:** User-specific notifications

**Lifecycle:**
- **Join:** Auto-join on connection (server-side)
- **Leave:** Auto-leave on disconnect

**Usage:**
```javascript
// Emit to specific user
io.to(`user-${userId}`).emit('friend-request-received', data);
```

**Examples:**
- Friend requests
- Private messages
- Personal notifications

---

#### 2. Workspace Room

**Format:** `workspace-${workspaceId}`

**Purpose:** Workspace-wide updates

**Lifecycle:**
- **Join:** Manual - when user opens workspace
- **Leave:** Manual - when user leaves workspace

**Usage:**
```javascript
// User joins workspace page
socket.emit('join-workspace', workspaceId);

// Server broadcasts to workspace
io.to(`workspace-${workspaceId}`).emit('task-created', task);
```

**Examples:**
- New tasks created
- Member added/removed
- Workspace settings updated
- Post activities

---

#### 3. Document Room

**Format:** `${documentId}` (plain document ID)

**Purpose:** Real-time collaborative editing

**Lifecycle:**
- **Join:** When user opens document
- **Leave:** When user closes document

**Usage:**
```javascript
// Collaborative editing
socket.on('send-changes', (delta, documentId) => {
  socket.broadcast.to(documentId).emit('receive-changes', delta);
});
```

**Examples:**
- Text changes (OT/CRDT)
- Comments
- Cursors
- Presence (who's editing)

---

### Room Management API

**Server-side:**

```javascript
// Join room
socket.join(roomName);

// Leave room
socket.leave(roomName);

// Emit to room (including sender)
io.to(roomName).emit('event', data);

// Emit to room (excluding sender)
socket.to(roomName).emit('event', data);

// Broadcast to all rooms except sender's rooms
socket.broadcast.emit('event', data);

// Broadcast to specific room excluding sender
socket.broadcast.to(roomName).emit('event', data);

// Get room info
const room = io.sockets.adapter.rooms.get(roomName);
const roomSize = room ? room.size : 0;
```

---

### Targeting Strategies

#### 1. Single User

```javascript
io.to(`user-${userId}`).emit('notification', data);
```

**Use Case:** Personal notifications

---

#### 2. Multiple Users (Same Room)

```javascript
io.to(`workspace-${workspaceId}`).emit('task-updated', task);
```

**Use Case:** Workspace members

---

#### 3. Exclude Sender

```javascript
socket.broadcast.to(roomName).emit('event', data);
```

**Use Case:** Collaborative editing (sender already has data)

---

#### 4. Multiple Rooms

```javascript
io.to('room1').to('room2').emit('event', data);
```

**Use Case:** Cross-workspace notifications

---

## AUTHENTICATION & SECURITY

### Authentication Flow

```
1. User logs in → Backend returns JWT access token
      ↓
2. Frontend stores token trong localStorage
      ↓
3. Frontend initializes socket connection:
   io(url, { auth: { token: jwt } })
      ↓
4. Socket.IO handshake → Backend socketAuth middleware
      ↓
5. Middleware verifies JWT → Attach userId to socket
      ↓
6. Connection established → socket.userId available
      ↓
7. Subsequent events have access to socket.userId
```

---

### Security Measures

#### 1. JWT Verification

**Middleware:** `socketAuth.js`

**Checks:**
- ✅ Token exists
- ✅ Token valid (signature)
- ✅ Token not expired
- ✅ User exists trong database
- ✅ User account active

**Rejection:**
```javascript
next(new Error('Invalid token')); // Connection refused
```

---

#### 2. Authorization Checks

**Per-event validation:**

```javascript
socket.on('join-chat', (userId) => {
  // Security: only join own room
  if (userId !== socket.userId) {
    socket.emit('error', { message: 'Unauthorized' });
    return;
  }
  socket.join(`user-${userId}`);
});
```

**Controller-level:**
```javascript
// Before emitting event, check permissions
if (!workspace.isMember(socket.userId)) {
  return; // Don't emit
}
io.to(`workspace-${workspaceId}`).emit('event', data);
```

---

#### 3. Rate Limiting

**Recommendation:** Add rate limiting per socket.

```javascript
// Pseudo-code
const rateLimit = new Map(); // socketId → counter

socket.on('message', (data) => {
  const count = rateLimit.get(socket.id) || 0;
  
  if (count > 100) { // 100 messages per interval
    socket.emit('error', { message: 'Rate limit exceeded' });
    return;
  }
  
  rateLimit.set(socket.id, count + 1);
  // Process message
});

// Reset counters periodically
setInterval(() => rateLimit.clear(), 60000); // Every minute
```

---

#### 4. Input Validation

**Validate event data:**

```javascript
socket.on('send-message', (data) => {
  // Joi validation
  const { error, value } = messageSchema.validate(data);
  
  if (error) {
    socket.emit('error', { message: 'Invalid data' });
    return;
  }
  
  // Process validated data
});
```

---

#### 5. CORS Configuration

**Restrict origins:**

```javascript
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS.split(','),
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

**Production:**
- Whitelist specific domains
- No wildcard `*` origins
- HTTPS only

---

## EVENT REFERENCE

### Connection Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `connection` | Server | `socket` | New socket connected |
| `disconnect` | Server | `reason` | Socket disconnected |
| `connect` | Client | - | Connection established |
| `connect_error` | Client | `error` | Connection failed |

---

### Authentication Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `error` | Server → Client | `{message}` | Auth/validation error |
| `unauthorized` | Server → Client | `{message}` | Auth failed |

---

### Room Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `join-workspace` | Client → Server | `workspaceId` | Join workspace room |
| `leave-workspace` | Client → Server | `workspaceId` | Leave workspace room |
| `joined-workspace` | Server → Client | `{workspaceId, roomSize}` | ACK joined |
| `join-chat` | Client → Server | `userId` | Join chat room |
| `joined-chat` | Server → Client | `{userId, roomSize}` | ACK joined |

---

### Message Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `new-message` | Server → Client | `messageObject` | New message received |
| `message-read` | Server → Client | `{messageId, readBy}` | Message marked read |
| `conversation-read` | Server → Client | `{conversationId}` | All messages read |
| `message-deleted` | Server → Client | `{messageId}` | Message deleted |
| `message-reaction-added` | Server → Client | `{messageId, reaction}` | Reaction added |
| `message-reaction-removed` | Server → Client | `{messageId, userId}` | Reaction removed |
| `message-pinned` | Server → Client | `{messageId}` | Message pinned |
| `message-unpinned` | Server → Client | `{messageId}` | Message unpinned |
| `conversation-settings-updated` | Server → Client | `{conversationId, settings}` | Settings changed |

---

### Typing Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `typing` | Client → Server | `{senderId, receiverId}` | User started typing |
| `stop-typing` | Client → Server | `{senderId, receiverId}` | User stopped typing |
| `user-typing` | Server → Client | `{userId}` | Someone is typing |
| `user-stop-typing` | Server → Client | `{userId}` | Someone stopped |

---

### Friend Connection Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `friend-request-received` | Server → Client | `{request, from}` | New friend request |
| `friend-request-sent` | Server → Client | `{request, recipientId}` | Request sent (to sender) |
| `friend-request-accepted` | Server → Client | `{acceptedBy, friend}` | Request accepted |
| `friend-request-rejected` | Server → Client | `{requestId, rejectedBy}` | Request rejected |
| `friend-request-cancelled` | Server → Client | `{requestId, cancelledBy}` | Request cancelled |
| `friend-removed` | Server → Client | `{friendId, removedBy}` | Friend removed |
| `user-blocked` | Server → Client | `{userId, blockedUser}` | User blocked |
| `user-blocked-by` | Server → Client | `{blockerId}` | Blocked by someone |
| `user-unblocked` | Server → Client | `{userId, unblockedUser}` | User unblocked |
| `user-unblocked-by` | Server → Client | `{unblockerId}` | Unblocked by someone |

---

### Workspace Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `task-created` | Server → Client | `taskObject` | New task added |
| `task-updated` | Server → Client | `taskObject` | Task modified |
| `task-deleted` | Server → Client | `{taskId}` | Task removed |
| `member-added` | Server → Client | `{workspace, member}` | Member joined |
| `member-removed` | Server → Client | `{workspaceId, memberId}` | Member left |
| `workspace-updated` | Server → Client | `workspaceObject` | Settings changed |

---

### Group Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `new-group-message` | Server → Client | `messageObject` | New group message |
| `group-member-joined` | Server → Client | `{groupId, member}` | Member joined group |
| `group-member-left` | Server → Client | `{groupId, memberId}` | Member left group |

---

### Document Collaboration Events

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `join-document` | Client → Server | `documentId` | Join editing session |
| `leave-document` | Client → Server | `documentId` | Leave session |
| `send-changes` | Client → Server | `{delta, documentId}` | Text changes |
| `receive-changes` | Server → Client | `delta` | Apply changes |
| `new-comment` | Client → Server | `{comment, documentId}` | Add comment |
| `comment-added` | Server → Client | `comment` | Comment added |
| `new-version` | Client → Server | `{version, documentId}` | New version |
| `version-added` | Server → Client | `version` | Version created |

---

## DATA FLOW PATTERNS

### Pattern 1: User-to-User Message

**Scenario:** User A sends message to User B

```
┌────────────────┐                                      ┌────────────────┐
│   User A       │                                      │    User B      │
│   (Frontend)   │                                      │   (Frontend)   │
└────────────────┘                                      └────────────────┘
        │                                                        │
        │ 1. POST /api/messages/send                            │
        │    {receiverId: B, content: "Hello"}                  │
        │                                                        │
        ├──────────────────────────▶┌─────────────────┐        │
        │                            │   Backend       │        │
        │                            │   (Express)     │        │
        │                            └─────────────────┘        │
        │                                     │                 │
        │                            2. messageController       │
        │                               .sendMessage()          │
        │                                     │                 │
        │                            3. Save to MongoDB         │
        │                               messageRepository       │
        │                                     │                 │
        │                            4. Emit Socket Events:     │
        │                               io.to('user-B')         │
        │                               io.to('user-A')         │
        │                                     │                 │
        │ 5. HTTP Response 201 ◀──────────────┤                 │
        │    {message}                        │                 │
        │                                     │                 │
        │ 6. socket.on('new-message')         │                 │
        │    → Update UI                      │                 │
        │                                     │                 │
        │                                     └─────────────────▶│
        │                                        7. socket.on   │
        │                                           ('new-msg') │
        │                                        → Update UI    │
        │                                                        │
```

**Key Points:**
- HTTP request saves data
- Socket events for real-time sync
- Both sender và receiver receive events
- Dual update: HTTP response + Socket event

---

### Pattern 2: Workspace Task Update

**Scenario:** Admin creates task trong workspace

```
┌────────────────┐                                  ┌────────────────┐
│   Admin        │                                  │  Members in    │
│   (Frontend)   │                                  │  Workspace     │
└────────────────┘                                  └────────────────┘
        │                                                    │
        │ 1. Joined workspace room                          │
        │    socket.emit('join-workspace', wsId)            │
        │                                                    │
        │ 2. POST /api/tasks                                │
        │    {title, workspace, ...}                        │
        │                                                    │
        ├──────────────────▶┌─────────────────┐            │
        │                    │   Backend       │            │
        │                    └─────────────────┘            │
        │                             │                     │
        │                    3. taskController               │
        │                       .createTask()                │
        │                             │                     │
        │                    4. Save Task                   │
        │                       Check permissions           │
        │                             │                     │
        │                    5. Broadcast to workspace:     │
        │                       io.to('workspace-123')      │
        │                         .emit('task-created')     │
        │                             │                     │
        │ 6. HTTP Response ◀──────────┤                     │
        │    201 {task}               │                     │
        │                             │                     │
        │ 7. socket.on('task-created')                      │
        │    → Update task list       │                     │
        │                             └────────────────────▶│
        │                                8. socket.on       │
        │                                   ('task-created')│
        │                                → Update UI        │
        │                                                    │
```

**Key Points:**
- Members must join workspace room first
- Broadcast to all workspace members
- Admin also receives event (UI consistency)
- Workspace-scoped events

---

### Pattern 3: Friend Request Flow

**Scenario:** User A sends friend request to User B

```
┌────────────────┐                                  ┌────────────────┐
│   User A       │                                  │    User B      │
└────────────────┘                                  └────────────────┘
        │                                                    │
        │ 1. POST /api/connections/send                     │
        │    {recipientId: B}                               │
        │                                                    │
        ├──────────────────▶┌─────────────────┐            │
        │                    │   Backend       │            │
        │                    └─────────────────┘            │
        │                             │                     │
        │                    2. connectionController         │
        │                       .sendRequest()               │
        │                             │                     │
        │                    3. Create Connection           │
        │                       status='pending'            │
        │                             │                     │
        │                    4. Emit Events:                │
        │                       io.to('user-B')             │
        │                         .emit('request-received') │
        │                       io.to('user-A')             │
        │                         .emit('request-sent')     │
        │                             │                     │
        │ 5. HTTP Response ◀──────────┤                     │
        │    {connection}             │                     │
        │                             │                     │
        │ 6. socket.on                │                     │
        │    ('friend-request-sent')  │                     │
        │    → Show in "Sent" list    └────────────────────▶│
        │                                7. socket.on       │
        │                                   ('...received') │
        │                                → Notification     │
        │                                → "Requests" list  │
        │                                                    │
```

**Key Points:**
- Different events for sender vs receiver
- Sender: Confirmation feedback
- Receiver: Notification + action required
- Personal room targeting

---

### Pattern 4: Typing Indicator

**Scenario:** User A types message to User B

```
┌────────────────┐                                  ┌────────────────┐
│   User A       │                                  │    User B      │
│   (typing...)  │                                  │   (seeing...)  │
└────────────────┘                                  └────────────────┘
        │                                                    │
        │ 1. onKeyPress event                               │
        │    Detect typing started                          │
        │                                                    │
        │ 2. socket.emit('typing',                          │
        │       {senderId: A, receiverId: B})               │
        │                                                    │
        ├──────────────────▶┌─────────────────┐            │
        │                    │   Backend       │            │
        │                    │   (Socket.IO)   │            │
        │                    └─────────────────┘            │
        │                             │                     │
        │                    3. Forward to user-B:          │
        │                       socket.to('user-B')         │
        │                         .emit('user-typing')      │
        │                             │                     │
        │                             └────────────────────▶│
        │                                4. socket.on       │
        │                                   ('user-typing') │
        │                                → Show "A typing..."│
        │                                                    │
        │ 5. After 3s no typing:                            │
        │    socket.emit('stop-typing')                     │
        │                                                    │
        ├──────────────────▶┌─────────────────┐            │
        │                    │   Backend       │            │
        │                    └─────────────────┘            │
        │                             │                     │
        │                    6. Forward to user-B:          │
        │                       socket.to('user-B')         │
        │                         .emit('user-stop-typing') │
        │                             │                     │
        │                             └────────────────────▶│
        │                                7. socket.on       │
        │                                   ('...stop...')  │
        │                                → Hide indicator   │
        │                                                    │
```

**Key Points:**
- No database save (ephemeral)
- Debounced events (avoid spam)
- Timeout-based "stop typing"
- Direct socket forwarding

---

## ERROR HANDLING

### Connection Errors

**1. Authentication Failure**

```javascript
// Backend
socketAuth middleware returns error:
next(new Error('Invalid token'));

// Frontend
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  
  if (error.message === 'Invalid token' || error.message === 'Token expired') {
    // Refresh token and retry
    refreshAccessToken().then((newToken) => {
      socket.auth.token = newToken;
      socket.connect();
    });
  }
});
```

---

**2. Network Disconnection**

```javascript
// Frontend
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  
  if (reason === 'io server disconnect') {
    // Server kicked us, try reconnect
    socket.connect();
  }
  // else: auto-reconnect enabled by default
});

// Show UI indicator
setConnectionStatus('disconnected');
```

---

**3. Reconnection Logic**

```javascript
// Frontend
socket.on('reconnect', (attemptNumber) => {
  console.log(`Reconnected after ${attemptNumber} attempts`);
  
  // Rejoin rooms
  if (currentWorkspaceId) {
    socket.emit('join-workspace', currentWorkspaceId);
  }
  
  // Sync state (fetch missed updates)
  syncMissedData();
});

socket.on('reconnect_failed', () => {
  console.error('Failed to reconnect after max attempts');
  // Show error message to user
  showError('Cannot connect to server. Please refresh.');
});
```

---

### Event Errors

**1. Invalid Event Data**

```javascript
// Backend
socket.on('join-workspace', (workspaceId) => {
  if (!workspaceId || typeof workspaceId !== 'string') {
    socket.emit('error', { message: 'Invalid workspace ID' });
    return;
  }
  
  // Process event
});
```

---

**2. Authorization Errors**

```javascript
// Backend
socket.on('delete-message', async (messageId) => {
  try {
    const message = await Message.findById(messageId);
    
    if (!message) {
      socket.emit('error', { message: 'Message not found' });
      return;
    }
    
    if (message.sender.toString() !== socket.userId) {
      socket.emit('error', { message: 'Not authorized' });
      return;
    }
    
    // Delete message
  } catch (error) {
    socket.emit('error', { message: 'Internal error' });
  }
});
```

---

**3. Error Event Listener**

```javascript
// Frontend
socket.on('error', (errorData) => {
  console.error('Socket error:', errorData.message);
  showToast(errorData.message, 'error');
});
```

---

### Graceful Degradation

**Strategy:** Fallback to HTTP when socket fails.

```javascript
// Frontend utility
async function sendMessage(content, receiverId) {
  try {
    // Try HTTP API
    const response = await api.post('/messages/send', { content, receiverId });
    
    // Socket will handle real-time sync if connected
    // If socket disconnected, UI updates from HTTP response
    
    return response.data;
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
}
```

**Principle:**
- HTTP API is source of truth
- Socket events are optimizations
- System works without sockets (slower updates)

---

## PERFORMANCE & OPTIMIZATION

### 1. Connection Pooling

**Backend:**
- Single Socket.IO server instance
- Shared across all routes via `global.io`
- Persistent connections (no per-request overhead)

---

### 2. Room Targeting

**Avoid:**
```javascript
// BAD: Broadcast to all connected sockets
io.emit('task-created', task); // ❌
```

**Prefer:**
```javascript
// GOOD: Target specific room
io.to(`workspace-${workspaceId}`).emit('task-created', task); // ✅
```

**Why:**
- Reduce unnecessary data transfer
- Lower client CPU usage
- Better scalability

---

### 3. Event Batching

**Scenario:** Multiple rapid updates

**Avoid:**
```javascript
// BAD: Emit for every keystroke
socket.on('document-change', (char) => {
  socket.broadcast.emit('receive-change', char); // ❌ High frequency
});
```

**Prefer:**
```javascript
// GOOD: Debounce and batch
let changeBuffer = [];

socket.on('document-change', (change) => {
  changeBuffer.push(change);
});

setInterval(() => {
  if (changeBuffer.length > 0) {
    socket.broadcast.emit('receive-changes', changeBuffer);
    changeBuffer = [];
  }
}, 100); // Batch every 100ms
```

---

### 4. Payload Optimization

**Minimize data:**
```javascript
// BAD: Send entire object
io.emit('user-updated', entireUserObject); // ❌ Large payload

// GOOD: Send only changes
io.emit('user-updated', { 
  userId, 
  changes: { avatar: newAvatarUrl } 
}); // ✅ Small payload
```

---

### 5. Listener Cleanup

**Frontend:**
```javascript
useEffect(() => {
  if (!socket) return;
  
  const handleMessage = (msg) => {
    // Handle message
  };
  
  socket.on('new-message', handleMessage);
  
  // ✅ IMPORTANT: Cleanup
  return () => {
    socket.off('new-message', handleMessage);
  };
}, [socket]);
```

**Why:**
- Prevent memory leaks
- Avoid duplicate handlers
- Clean unmount

---

### 6. Lazy Room Joining

**Don't join all rooms on connect:**
```javascript
// BAD: Join all possible rooms
socket.on('connection', (socket) => {
  const userWorkspaces = await getUserWorkspaces(socket.userId);
  userWorkspaces.forEach(ws => {
    socket.join(`workspace-${ws._id}`); // ❌ Unnecessary
  });
});
```

**Better: Join on demand:**
```javascript
// GOOD: Join when user navigates to workspace
socket.on('join-workspace', (workspaceId) => {
  socket.join(`workspace-${workspaceId}`); // ✅ On-demand
});
```

---

### 7. Compression

**Enable compression:**
```javascript
const io = require('socket.io')(server, {
  cors: { /* ... */ },
  perMessageDeflate: {
    threshold: 1024 // Compress messages > 1KB
  }
});
```

---

### 8. Ping/Pong Tuning

**Adjust heartbeat:**
```javascript
const io = require('socket.io')(server, {
  pingInterval: 10000,  // Default: 25s
  pingTimeout: 5000     // Default: 5s
});
```

**Balance:**
- Lower interval = faster disconnect detection
- Higher interval = less overhead

---

## TESTING & DEBUGGING

### Backend Testing

**1. Manual Testing với Socket.IO Client:**

```javascript
// test-socket.js
const io = require('socket.io-client');

const socket = io('http://localhost:3001', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  
  // Test events
  socket.emit('join-workspace', 'workspace123');
  
  socket.on('task-created', (task) => {
    console.log('Received task:', task);
  });
});

socket.on('error', (error) => {
  console.error('Error:', error);
});
```

---

**2. Unit Testing với Mock:**

```javascript
// jest test
const { Server } = require('socket.io');
const { createServer } = require('http');
const Client = require('socket.io-client');

describe('Socket.IO Events', () => {
  let io, serverSocket, clientSocket;
  
  beforeAll((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      clientSocket.on('connect', done);
    });
  });
  
  afterAll(() => {
    io.close();
    clientSocket.close();
  });
  
  test('should emit new-message event', (done) => {
    clientSocket.on('new-message', (msg) => {
      expect(msg.content).toBe('Hello');
      done();
    });
    
    serverSocket.emit('new-message', { content: 'Hello' });
  });
});
```

---

### Frontend Testing

**1. Mock socketService:**

```javascript
// __mocks__/socketService.js
export default {
  socket: {
    on: jest.fn(),
    emit: jest.fn(),
    off: jest.fn()
  },
  connect: jest.fn(),
  disconnect: jest.fn(),
  joinWorkspace: jest.fn()
};
```

**2. Component Test:**

```javascript
import { render, waitFor } from '@testing-library/react';
import Messages from './Messages';
import socketService from '../services/socketService';

jest.mock('../services/socketService');

test('handles new message event', async () => {
  const { getByText } = render(<Messages />);
  
  // Simulate socket event
  const messageHandler = socketService.socket.on.mock.calls
    .find(call => call[0] === 'new-message')[1];
  
  messageHandler({ content: 'Test message' });
  
  await waitFor(() => {
    expect(getByText('Test message')).toBeInTheDocument();
  });
});
```

---

### Debugging Tools

**1. Chrome DevTools:**
- Network tab → WS filter
- View WebSocket frames
- Inspect messages

**2. Socket.IO Admin UI:**

```bash
npm install @socket.io/admin-ui
```

```javascript
const { instrument } = require('@socket.io/admin-ui');

instrument(io, {
  auth: {
    type: 'basic',
    username: 'admin',
    password: 'admin'
  }
});
```

Access: `http://localhost:3001/admin`

**3. Logging:**

```javascript
// Backend
socket.onAny((eventName, ...args) => {
  console.log(`[Socket Event] ${eventName}:`, args);
});

// Frontend
socket.onAny((eventName, ...args) => {
  console.log(`[Received] ${eventName}:`, args);
});
```

**4. Room Inspection:**

```javascript
// Backend
const rooms = io.sockets.adapter.rooms;
console.log('All rooms:', Array.from(rooms.keys()));

const workspaceRoom = rooms.get('workspace-123');
console.log('Clients in workspace-123:', workspaceRoom.size);
```

---

## BEST PRACTICES

### ✅ DO:

1. **Always cleanup listeners**
   ```javascript
   useEffect(() => {
     socket.on('event', handler);
     return () => socket.off('event', handler);
   }, []);
   ```

2. **Use rooms for targeting**
   ```javascript
   io.to(`user-${userId}`).emit('notification', data);
   ```

3. **Validate event data**
   ```javascript
   socket.on('event', (data) => {
     if (!validate(data)) return;
     // Process
   });
   ```

4. **Handle reconnection**
   ```javascript
   socket.on('reconnect', () => {
     // Rejoin rooms
     // Sync state
   });
   ```

5. **Authenticate sockets**
   ```javascript
   io.use(socketAuthMiddleware);
   ```

---

### ❌ DON'T:

1. **Don't broadcast to all**
   ```javascript
   io.emit('event', data); // ❌ Sends to everyone
   ```

2. **Don't forget cleanup**
   ```javascript
   socket.on('event', handler); // ❌ Memory leak
   ```

3. **Don't send large payloads**
   ```javascript
   socket.emit('data', hugeObject); // ❌ Bandwidth waste
   ```

4. **Don't trust client data**
   ```javascript
   socket.on('delete', (id) => {
     db.delete(id); // ❌ No validation
   });
   ```

5. **Don't create multiple connections**
   ```javascript
   useEffect(() => {
     const socket = io(); // ❌ New connection every render
   });
   ```

---

## TROUBLESHOOTING

### Problem: Socket not connecting

**Symptoms:** `connect_error` events, no connection

**Solutions:**
1. Check backend is running
2. Verify CORS configuration matches frontend URL
3. Check JWT token is valid
4. Inspect browser console for errors
5. Test with Socket.IO client directly

---

### Problem: Events not received

**Symptoms:** Emit works but listener doesn't fire

**Solutions:**
1. Verify listener is registered before event emitted
2. Check event name spelling (case-sensitive)
3. Ensure socket is in correct room
4. Check `socket.userId` matches expected user
5. Verify no errors in backend logs

---

### Problem: Memory leaks

**Symptoms:** Slow performance over time, high memory usage

**Solutions:**
1. Add cleanup in `useEffect` return
2. Use `socketService._registerListener` to track
3. Call `removeAllListeners()` on unmount
4. Check for duplicate listener registration

---

### Problem: Multiple event handlers firing

**Symptoms:** Handler called multiple times per event

**Solutions:**
1. Remove old listener before adding new one
2. Use listener tracking (Map)
3. Check for duplicate `useEffect` calls
4. Verify cleanup function runs

---

### Problem: Rooms not working

**Symptoms:** Events sent to room not received

**Solutions:**
1. Verify `socket.join(roomName)` called
2. Check room name matches exactly
3. Use `io.sockets.adapter.rooms` to inspect
4. Ensure socket still connected (not disconnected)
5. Check for typos in room name

---

## CONCLUSION

Socket.IO trong dự án **Planner Web** cung cấp:

- ✅ **Real-time bidirectional communication**
- ✅ **Secure authentication với JWT**
- ✅ **Room-based event targeting**
- ✅ **Auto-reconnection và error handling**
- ✅ **Scalable architecture**
- ✅ **Easy integration với Express và React**

**Key Takeaways:**
1. Socket.IO là layer trên WebSocket với nhiều features
2. Authentication bắt buộc qua JWT trong handshake
3. Room system cho efficient event targeting
4. Always cleanup listeners để avoid memory leaks
5. Graceful degradation: Socket là optimization, HTTP là fallback

**Next Steps:**
- Implement Redis adapter cho horizontal scaling
- Add rate limiting per socket
- Enhance error handling và retry logic
- Monitor socket metrics (connections, events/sec)
- Add end-to-end encryption cho sensitive data

---

**Version:** 1.0.0  
**Last Updated:** December 24, 2025  
**Maintained by:** Development Team
