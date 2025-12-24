# 📋 PLANNER WEB - TỔNG QUAN DỰ ÁN

## 🎯 GIỚI THIỆU HỆ THỐNG

**Planner Web** là hệ thống quản lý workspace và collaboration platform hiện đại, được xây dựng theo kiến trúc **Full-Stack JavaScript** với khả năng real-time communication, AI-powered chatbot, và cloud storage integration. Dự án cung cấp giải pháp toàn diện cho quản lý dự án nhóm, giao tiếp team, quản lý tài liệu và trợ lý AI thông minh.

---

## 🏗️ KIẾN TRÚC TỔNG QUAN

### Mô Hình Kiến Trúc

```
┌────────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  React 18 + Vite (SPA)                                       │  │
│  │  - Modern UI với Tailwind CSS + Glassmorphism Design        │  │
│  │  - Socket.IO Client (Real-time)                             │  │
│  │  - Axios với Request/Response Interceptors                  │  │
│  │  - React Router v6 (Client-side Routing)                    │  │
│  │  - Context API (State Management)                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                 ↕
                    HTTP/HTTPS + WebSocket (Socket.IO)
                                 ↕
┌────────────────────────────────────────────────────────────────────┐
│                      APPLICATION TIER                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Node.js 18+ + Express.js                                   │  │
│  │  - RESTful API Architecture                                 │  │
│  │  - Socket.IO Server (Bidirectional Communication)           │  │
│  │  - JWT Authentication + Google OAuth 2.0                    │  │
│  │  - Middleware Chain (Security, Auth, Validation)            │  │
│  │  - MVC + Repository Pattern                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                 ↕
┌────────────────────────────────────────────────────────────────────┐
│                    DATA & SERVICE TIER                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────┐ │
│  │  MongoDB 7  │  │  MinIO S3    │  │ ChromaDB   │  │ Gemini   │ │
│  │  (Primary   │  │  (Object     │  │ (Vector    │  │ AI API   │ │
│  │   Database) │  │   Storage)   │  │  Database) │  │ (External│ │
│  │             │  │              │  │            │  │  Service) │ │
│  │  • Users    │  │  • user-     │  │  • Doc     │  │          │ │
│  │  • Worksp   │  │    media     │  │    embeddi-│  │  • RAG   │ │
│  │  • Tasks    │  │  • workspace-│  │    ngs     │  │  • Chat  │ │
│  │  • Messages │  │    media     │  │  • Semantic│  │  • Text  │ │
│  │  • Connect  │  │  • message-  │  │    search  │  │    Gen   │ │
│  └─────────────┘  │    media     │  └────────────┘  └──────────┘ │
│                    │  • chatbot-  │                                │
│                    │    documents │                                │
│                    └──────────────┘                                │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ TECH STACK CHI TIẾT

### FRONTEND STACK

#### Core Technologies
- **React 18.2.0** - UI Library với Concurrent Features
- **Vite 5.0.7** - Build Tool (Fast HMR, ES Modules)
- **React Router DOM 6.20.0** - Client-side Routing
- **Tailwind CSS 3.3.6** - Utility-first CSS Framework
- **PostCSS + Autoprefixer** - CSS Processing

#### State Management
- **React Context API** - Global State
  - AuthContext - Authentication state
  - SocketContext - WebSocket connection
  - ThemeContext - Dark/Light mode
  - ConnectionContext - Friend connections
  - ToastContext - Notification system

#### UI Libraries & Components
- **Heroicons React 2.2.0** - Icon library
- **Lucide React 0.562.0** - Additional icons
- **Framer Motion 12.23.26** - Animation library
- **Recharts 3.6.0** - Data visualization charts
- **React Big Calendar 1.19.4** - Calendar component
- **React Markdown 10.1.0** - Markdown rendering
- **Remark GFM 4.0.1** - GitHub Flavored Markdown

#### Real-time & HTTP
- **Socket.IO Client 4.8.1** - WebSocket client
- **Axios 1.6.2** - HTTP client với interceptors

#### Document Processing
- **Mammoth 1.11.0** - .docx to HTML converter
- **JSZip 3.10.1** - ZIP file handling

#### Utilities
- **Moment.js 2.30.1** - Date/time manipulation
- **clsx 2.1.1** - Conditional className utility
- **tailwind-merge 3.4.0** - Tailwind class merging

#### Development Tools
- **Jest 30.2.0** - Testing framework
- **Testing Library (React, Jest-DOM, User-Event)** - Testing utilities
- **Babel (Presets: React, Env)** - JavaScript transpiler

---

### BACKEND STACK

#### Core Technologies
- **Node.js 18+** - JavaScript Runtime
- **Express.js 4.18.2** - Web Application Framework
- **Mongoose 7.6.3** - MongoDB ODM
- **Socket.IO 4.8.1** - Real-time bidirectional communication

#### Authentication & Security
- **jsonwebtoken 9.0.2** - JWT token generation/verification
- **bcryptjs 2.4.3** - Password hashing (bcrypt algorithm)
- **speakeasy 2.0.0** - TOTP 2FA implementation
- **qrcode 1.5.4** - QR code generation cho 2FA
- **googleapis 128.0.0** - Google OAuth 2.0 integration
- **helmet 7.1.0** - Security headers middleware
- **cors 2.8.5** - Cross-Origin Resource Sharing
- **express-rate-limit 7.1.5** - API rate limiting

#### File & Storage
- **multer 2.0.2** - Multipart file upload middleware
- **minio 8.0.6** - MinIO S3 client (object storage)
- **pdf-parse 1.1.1** - PDF text extraction

#### AI & Vector Database
- **@google/generative-ai 0.21.0** - Google Gemini AI SDK
- **chromadb 1.9.2** - Vector database client (embeddings)
- **cheerio 1.0.0** - HTML parsing cho web scraping

#### Validation & Utilities
- **joi 17.11.0** - Object schema validation
- **dotenv 16.3.1** - Environment variable management
- **nodemailer 6.9.7** - Email sending service
- **axios 1.13.1** - HTTP client

#### Markdown Rendering
- **react-markdown 10.1.0** - Markdown to React components
- **remark-gfm 4.0.1** - GitHub Flavored Markdown plugin

#### Development Tools
- **nodemon 3.0.1** - Auto-restart on file changes
- **jest 30.2.0** - Testing framework

---

### DATABASE & STORAGE

#### MongoDB 7
**Primary Database - Document-oriented NoSQL**

**Collections:**
- `users` - User accounts, profiles, authentication
- `workspaces` - Team workspaces với members & roles
- `tasks` - Tasks/Calendar events với time tracking
- `messages` - Direct messages 1-1
- `conversations` - Conversation metadata
- `groups` - Group chat rooms
- `groupmessages` - Group chat messages
- `documents` - Document metadata
- `connections` - Friend connections & requests
- `chathistories` - AI chatbot conversation history
- `knowledgebases` - Chatbot knowledge base references
- `posts` - Social posts
- `postcomments` - Post comments
- `postreactions` - Post reactions

**Indexing Strategy:**
- Compound indexes cho performance
- Single field indexes cho common queries
- Text indexes cho search functionality

**Connection:**
- URI: `mongodb://admin:admin123@mongodb:27017/`
- Docker network: `backend`
- Persistent volume: `./data/mongo_data`

---

#### MinIO (S3-Compatible Object Storage)
**File Storage Service**

**Buckets:**
- `user-media` - User avatars, profile images
- `workspace-media` - Workspace files, attachments
- `message-media` - Message attachments (images, files)
- `chatbot-documents` - Documents cho RAG knowledge base

**Configuration:**
- Admin credentials: `minioadmin / minioadmin`
- S3 API Port: 9000
- Console UI Port: 9001
- Access: Public read for all buckets
- Docker network: `backend`
- Persistent volume: `./data/minio_data`

**Features:**
- S3-compatible API
- Public URL generation
- Automatic bucket initialization (minio-init service)
- Metadata storage (content-type, filename)

---

#### ChromaDB (Vector Database)
**Semantic Search & Embeddings Storage**

**Purpose:**
- Store document embeddings for RAG
- Semantic search capabilities
- Vector similarity search

**Configuration:**
- Port: 8000
- Docker network: `backend`
- Persistent volume: `./data/chroma_data`

**Integration:**
- Google Gemini API for embedding generation
- Document chunking và vectorization
- Similarity search cho chatbot responses

---

#### Google Gemini AI (External Service)
**AI Service Provider**

**Models Used:**
- `gemini-1.5-flash` - Fast responses cho chatbot
- `gemini-1.5-pro` (optional) - Advanced reasoning

**Features:**
- Text generation
- Conversation memory
- RAG (Retrieval Augmented Generation)
- Document Q&A
- Context-aware responses

**API Key:** Configured via environment variables

---

## 🐳 DOCKER ARCHITECTURE

### Docker Compose Services

#### 1. MongoDB Service
```yaml
Image: mongo:7
Container: mongodb
Ports: 27017:27017
Volume: ./data/mongo_data:/data/db
Network: backend
Environment:
  - MONGO_INITDB_ROOT_USERNAME=admin
  - MONGO_INITDB_ROOT_PASSWORD=admin123
```
**Purpose:** Primary database cho application data

---

#### 2. Backend Service
```yaml
Build: ./backend/Dockerfile
Container: backend
Ports: 3001:3001
Volumes:
  - ./backend/src:/app/src (Hot reload)
  - ./backend/.env:/app/.env
Network: backend
Depends on: mongodb, minio
```
**Purpose:** Node.js Express API server với Socket.IO

**Dockerfile:**
- Base: `node:18-alpine`
- Working dir: `/app`
- Copy: package.json, package-lock.json
- Install: `npm ci --only=production`
- Copy: Source code
- Expose: Port 3001
- CMD: `node src/index.js`

---

#### 3. MinIO Service
```yaml
Image: minio/minio:latest
Container: minio
Ports:
  - 9000:9000 (S3 API)
  - 9001:9001 (Console)
Volume: ./data/minio_data:/data
Network: backend
Command: server /data --console-address ":9001"
Environment:
  - MINIO_ROOT_USER=minioadmin
  - MINIO_ROOT_PASSWORD=minioadmin
```
**Purpose:** Object storage cho files & media

---

#### 4. MinIO Init Service
```yaml
Image: minio/mc:latest
Container: minio-init
Depends on: minio
Network: backend
```
**Purpose:** Initialize MinIO buckets on startup
- Create buckets: user-media, workspace-media, message-media, chatbot-documents
- Set public read access
- One-time setup container (exits after completion)

---

#### 5. ChromaDB Service
```yaml
Image: chromadb/chroma:latest
Container: chromadb
Ports: 8000:8000
Volume: ./data/chroma_data:/chroma/chroma
Network: backend
```
**Purpose:** Vector database cho AI embeddings

---

### Docker Network

**Network Name:** `backend`
**Driver:** bridge
**Purpose:** Isolated network cho inter-container communication

**Container Communication:**
- Backend → MongoDB: `mongodb://admin:admin123@mongodb:27017/`
- Backend → MinIO: `http://minio:9000`
- Backend → ChromaDB: `http://chromadb:8000`

**DNS Resolution:** Docker tự động resolve container names

---

### Volume Persistence

**Local Volumes (Bind Mounts):**
```
./data/
├── mongo_data/      # MongoDB data files
├── minio_data/      # MinIO object storage
└── chroma_data/     # ChromaDB vector data
```

**Hot Reload Volumes:**
```
./backend/src → /app/src (Development mode)
```

---

## 📊 DATABASE MODELS CHI TIẾT

### User Model
**Collection:** `users`

**Schema:**
- `firstName`, `lastName`: String
- `email`: String (unique, indexed)
- `password`: String (hashed với bcrypt)
- `avatar`: String (MinIO URL)
- `googleId`: String (OAuth)
- `isEmailVerified`: Boolean
- `activationToken`: String
- `twoFactorSecret`: String (TOTP)
- `twoFactorEnabled`: Boolean
- `refreshToken`: String
- Timestamps: createdAt, updatedAt

**Indexes:**
- `email` (unique)
- `googleId`

---

### Workspace Model
**Collection:** `workspaces`

**Schema:**
- `name`: String (required, max 100)
- `description`: String (max 500)
- `owner`: ObjectId → User
- `members`: Array of:
  - `user`: ObjectId → User
  - `role`: Enum ['owner', 'admin', 'member']
  - `joinedAt`: Date
- `color`: String (hex color)
- `isActive`: Boolean (soft delete)
- `settings`:
  - `isPublic`: Boolean
  - `allowMemberInvites`: Boolean
  - `defaultRole`: String
- `lastActivity`: Date
- Timestamps

**Indexes:**
- `owner`
- `members.user`
- `name, owner` (compound)
- `isActive`

**Virtual:** `memberCount`

**Pre-save Hook:** Auto-add owner to members

---

### Task Model
**Collection:** `tasks`

**Schema:**
- `title`: String (required)
- `description`: String
- `assignees`: Array of ObjectId → User
- `dueDate`: Date (for calendar)
- `priority`: Enum ['low', 'medium', 'high']
- `status`: Enum ['todo', 'in-progress', 'done']
- `progress`: Number (0-100)
- `estimatedHours`: Number
- `loggedHours`: Number
- `timeEntries`: Array of:
  - `user`: ObjectId
  - `hours`: Number
  - `description`: String
  - `loggedAt`: Date
- `workspace`: ObjectId → Workspace (optional)
- `createdBy`: ObjectId → User
- `isPersonal`: Boolean
- Timestamps

**Indexes:**
- `workspace`
- `createdBy`
- `status`
- `assignees`

**Virtual:** `autoProgress` (computed từ logged/estimated hours)

---

### Message Model
**Collection:** `messages`

**Schema:**
- `sender`: ObjectId → User
- `receiver`: ObjectId → User
- `content`: String (required)
- `attachments`: Array of:
  - `url`: String (MinIO URL)
  - `filename`: String
  - `mimetype`: String
  - `size`: Number
- `readAt`: Date
- `readBy`: Array of user + readAt
- `deletedBy`: Array of ObjectId (soft delete)
- `conversationId`: String (generated)
- `reactions`: Array of:
  - `user`: ObjectId
  - `emoji`: String
  - `createdAt`: Date
- `isPinned`: Boolean
- `isSystemMessage`: Boolean
- `systemMessageType`: Enum
- `relatedMessage`: ObjectId
- Timestamps

**Indexes:**
- `conversationId, createdAt` (compound)
- `sender, receiver` (compound)

**Static Method:** `generateConversationId(userId1, userId2)`

---

### Conversation Model
**Collection:** `conversations`

**Schema:**
- `participants`: Array of 2 ObjectIds
- `conversationId`: String (unique)
- `lastMessage`: String
- `lastMessageSender`: ObjectId
- `lastMessageAt`: Date
- `unreadCount`: Map (userId → count)
- `nicknames`: Map (userId → nickname)
- `themeColor`: String (hex)
- Timestamps

**Indexes:**
- `participants, lastMessageAt` (compound)
- `conversationId` (unique)

---

### Connection Model
**Collection:** `connections`

**Schema:**
- `requester`: ObjectId → User
- `recipient`: ObjectId → User
- `status`: Enum ['pending', 'accepted', 'rejected', 'blocked']
- `blockedBy`: ObjectId (optional)
- Timestamps

**Indexes:**
- `requester, recipient` (compound, unique)
- `requester, status` (compound)
- `recipient, status` (compound)

**Pre-save Hook:** Prevent self-connection

---

### Group Model
**Collection:** `groups`

**Schema:**
- `name`: String (required)
- `description`: String
- `avatar`: String (MinIO URL)
- `workspace`: ObjectId → Workspace
- `members`: Array of:
  - `user`: ObjectId
  - `role`: Enum ['admin', 'member']
  - `joinedAt`: Date
- `createdBy`: ObjectId → User
- `isActive`: Boolean
- Timestamps

**Indexes:**
- `workspace`
- `members.user`

---

### GroupMessage Model
**Collection:** `groupmessages`

**Schema:**
- `group`: ObjectId → Group
- `sender`: ObjectId → User
- `content`: String
- `attachments`: Array
- `readBy`: Array of user + readAt
- `reactions`: Array
- `isPinned`: Boolean
- Timestamps

**Indexes:**
- `group, createdAt` (compound)

---

### Document Model
**Collection:** `documents`

**Schema:**
- `name`: String
- `fileUrl`: String (MinIO URL)
- `fileType`: String (mimetype)
- `fileSize`: Number
- `workspace`: ObjectId → Workspace
- `uploadedBy`: ObjectId → User
- `version`: Number
- `isPublic`: Boolean
- `tags`: Array of String
- Timestamps

**Indexes:**
- `workspace`
- `uploadedBy`

---

### KnowledgeBase Model
**Collection:** `knowledgebases`

**Schema:**
- `documentName`: String
- `fileUrl`: String (MinIO URL)
- `fileType`: String
- `uploadedBy`: ObjectId → User
- `chromaCollectionId`: String (reference tới ChromaDB)
- `chunkCount`: Number
- `status`: Enum ['processing', 'ready', 'failed']
- Timestamps

**Indexes:**
- `uploadedBy`
- `status`

---

### ChatHistory Model
**Collection:** `chathistories`

**Schema:**
- `user`: ObjectId → User
- `sessionId`: String
- `messages`: Array of:
  - `role`: Enum ['user', 'assistant']
  - `content`: String
  - `timestamp`: Date
- `knowledgeBaseUsed`: Array of ObjectId → KnowledgeBase
- Timestamps

**Indexes:**
- `user, sessionId` (compound)

---

### Post Model
**Collection:** `posts`

**Schema:**
- `content`: String
- `attachments`: Array
- `workspace`: ObjectId → Workspace
- `author`: ObjectId → User
- `likes`: Array of ObjectId
- `commentCount`: Number
- Timestamps

**Indexes:**
- `workspace`
- `author`

---

### PostComment Model
**Collection:** `postcomments`

**Schema:**
- `post`: ObjectId → Post
- `author`: ObjectId → User
- `content`: String
- `likes`: Array of ObjectId
- Timestamps

**Indexes:**
- `post`

---

### PostReaction Model
**Collection:** `postreactions`

**Schema:**
- `post`: ObjectId → Post
- `user`: ObjectId → User
- `reactionType`: String (emoji)
- Timestamps

**Indexes:**
- `post, user` (compound, unique)

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### JWT Token Flow

**1. Login/Register:**
```
User credentials → Backend
  ↓
Validate user
  ↓
Generate JWT tokens:
  - accessToken (15m expiry)
  - refreshToken (7d expiry, stored in DB)
  ↓
Response: {user, accessToken, refreshToken}
  ↓
Frontend stores in Context + localStorage
```

**2. API Request:**
```
Request + Authorization: Bearer <accessToken>
  ↓
authenticateToken Middleware
  ↓
Verify JWT signature & expiry
  ↓
Attach req.user = decoded payload
  ↓
Route handler có access tới req.user._id
```

**3. Token Refresh:**
```
accessToken expired → 401 response
  ↓
Frontend intercepts 401
  ↓
Call /api/auth/refresh với refreshToken
  ↓
Backend validates refreshToken
  ↓
Generate new accessToken
  ↓
Retry original request với new token
```

---

### Google OAuth 2.0 Flow

**Configuration:**
- Client ID & Secret từ Google Cloud Console
- Redirect URI: `http://localhost:5173/login`
- Scopes: profile, email

**Flow:**
```
User clicks "Login with Google"
  ↓
Redirect to Google OAuth consent screen
  ↓
User authorizes
  ↓
Google redirects với authorization code
  ↓
Frontend sends code to backend /api/auth/google
  ↓
Backend exchanges code for Google tokens
  ↓
Fetch user profile từ Google
  ↓
Create/Update user trong MongoDB
  ↓
Generate JWT tokens
  ↓
Response: {user, accessToken, refreshToken}
```

---

### Two-Factor Authentication (2FA)

**Setup Flow:**
```
User enables 2FA
  ↓
Backend generates TOTP secret (speakeasy)
  ↓
Generate QR code (qrcode library)
  ↓
User scans QR với authenticator app
  ↓
User enters verification code
  ↓
Backend validates code
  ↓
Save twoFactorSecret, set twoFactorEnabled=true
```

**Login với 2FA:**
```
Username + Password → First factor verified
  ↓
Check twoFactorEnabled=true
  ↓
Require TOTP code
  ↓
Validate code với speakeasy
  ↓
Generate JWT tokens
```

---

### Role-Based Access Control (RBAC)

**Workspace Roles:**
- **Owner:** Full control, can delete workspace
- **Admin:** Manage members, update settings
- **Member:** View/contribute, limited permissions

**Permission Checks:**
```javascript
// Controller Level
const workspace = await workspaceRepository.getById(id);
if (!workspace.canManage(req.user._id)) {
  return res.status(403).json({error: 'Forbidden'});
}
```

**Model Methods:**
- `workspace.isMember(userId)` - Check membership
- `workspace.canManage(userId)` - Check admin/owner
- `workspace.canInvite(userId)` - Check invite permissions

---

## 🌐 API ENDPOINTS

### Base URL
- **Development:** `http://localhost:3001/api`
- **Production:** Configure via environment variables

### Authentication Routes (`/api/auth`)
```
POST   /register              - User registration
POST   /login                 - Email/password login
POST   /google                - Google OAuth login
POST   /logout                - Logout (invalidate tokens)
POST   /refresh               - Refresh access token
GET    /verify-email/:token   - Email verification
POST   /forgot-password       - Request password reset
POST   /reset-password        - Reset password với token
POST   /setup-2fa             - Setup 2FA
POST   /verify-2fa            - Verify 2FA code
POST   /disable-2fa           - Disable 2FA
GET    /me                    - Get current user
```

### User Routes (`/api/users`)
```
GET    /                      - Get all users (admin)
GET    /search                - Search users by name/email
GET    /:id                   - Get user by ID
PUT    /:id                   - Update user profile
PUT    /:id/avatar            - Upload avatar
DELETE /:id                   - Delete user (soft delete)
```

### Workspace Routes (`/api/workspaces`)
```
POST   /                      - Create workspace
GET    /                      - Get user's workspaces
GET    /:id                   - Get workspace by ID
PUT    /:id                   - Update workspace
DELETE /:id                   - Delete workspace (soft)
POST   /:id/members           - Add member
DELETE /:id/members/:memberId - Remove member
PUT    /:id/members/:memberId/role - Update member role
POST   /:id/join              - Join public workspace
POST   /:id/leave             - Leave workspace
GET    /:id/members/search    - Search members
GET    /:id/stats             - Get workspace statistics
```

### Task Routes (`/api/tasks`)
```
POST   /                      - Create task
GET    /                      - Get user's tasks
GET    /:id                   - Get task by ID
PUT    /:id                   - Update task
DELETE /:id                   - Delete task
POST   /:id/time-entry        - Log time
GET    /workspace/:workspaceId - Get workspace tasks
```

### Message Routes (`/api/messages`)
```
GET    /conversations         - Get all conversations
GET    /users/search          - Search users for chat
GET    /unread-count          - Get unread message count
GET    /:otherUserId          - Get messages với user
POST   /send                  - Send message (với files)
PATCH  /:otherUserId/read     - Mark conversation as read
PATCH  /message/:id/read      - Mark message as read
DELETE /:id                   - Delete message
POST   /message/:id/reaction  - Add reaction
DELETE /message/:id/reaction  - Remove reaction
PATCH  /message/:id/pin       - Toggle pin
PATCH  /:otherUserId/settings - Update conversation settings
GET    /:otherUserId/search   - Search messages
```

### Group Routes (`/api/groups`)
```
POST   /                      - Create group
GET    /workspace/:workspaceId - Get workspace groups
GET    /:id                   - Get group by ID
PUT    /:id                   - Update group
DELETE /:id                   - Delete group
POST   /:id/members           - Add member
DELETE /:id/members/:memberId - Remove member
GET    /:id/messages          - Get group messages
POST   /:id/messages          - Send group message
```

### Connection Routes (`/api/connections`)
```
POST   /send                  - Send friend request
POST   /accept/:id            - Accept request
POST   /reject/:id            - Reject request
DELETE /cancel/:id            - Cancel request
GET    /friends               - Get friends list
DELETE /unfriend/:id          - Unfriend
POST   /block/:id             - Block user
DELETE /unblock/:id           - Unblock user
GET    /requests              - Get pending requests
GET    /sent                  - Get sent requests
GET    /blocked               - Get blocked users
GET    /suggestions           - Get friend suggestions
GET    /status/:id            - Get connection status
```

### Calendar Routes (`/api/calendar`)
```
GET    /events                - Get calendar events
POST   /events                - Create event
PATCH  /events/:id            - Update event
DELETE /events/:id            - Delete event
POST   /events/:id/move       - Move event (drag & drop)
GET    /stats                 - Get calendar statistics
```

### Document Routes (`/api/documents`)
```
POST   /upload                - Upload document
GET    /workspace/:id         - Get workspace documents
GET    /:id                   - Get document by ID
DELETE /:id                   - Delete document
GET    /:id/download          - Download document
POST   /:id/share             - Share document
```

### Chatbot Routes (`/api/chatbot`)
```
POST   /chat                  - Send message to AI
GET    /history               - Get chat history
POST   /upload-knowledge      - Upload document for RAG
GET    /knowledge-bases       - Get knowledge base documents
DELETE /knowledge-base/:id    - Delete knowledge base document
POST   /search                - Semantic search
```

---

## 🔌 WEBSOCKET EVENTS (Socket.IO)

### Connection Flow
```
Client connects → Socket.IO handshake với JWT token
  ↓
socketAuth Middleware validates token
  ↓
Attach socket.userId = decoded._id
  ↓
Auto-join personal room: user-${userId}
  ↓
Connection established
```

---

### Room Patterns

**Personal Room:**
- Format: `user-${userId}`
- Purpose: User-specific notifications
- Auto-join on connection

**Workspace Room:**
- Format: `workspace-${workspaceId}`
- Join: Client emits `join-workspace` event
- Leave: Client emits `leave-workspace` event
- Purpose: Workspace-wide updates

**Chat Room:**
- Format: `chat-${conversationId}`
- Purpose: Message delivery (optional)

---

### Client → Server Events

```javascript
// Join workspace room
socket.emit('join-workspace', workspaceId);

// Leave workspace room
socket.emit('leave-workspace', workspaceId);

// Join chat room
socket.emit('join-chat', otherUserId);

// Typing indicator
socket.emit('typing', {conversationId, isTyping: true});

// Custom events (extensible)
```

---

### Server → Client Events

**Authentication Events:**
```javascript
// Token invalid
socket.emit('unauthorized', {message: 'Invalid token'});
```

**Message Events:**
```javascript
// New message received
socket.emit('new-message', messageObject);

// Message read
socket.emit('message-read', {messageId, readBy});

// Conversation read
socket.emit('conversation-read', {conversationId});

// Message deleted
socket.emit('message-deleted', {messageId});

// Reaction added
socket.emit('message-reaction-added', {messageId, reaction});

// Message pinned
socket.emit('message-pinned', {messageId});
```

**Connection Events:**
```javascript
// Friend request received
socket.emit('friend-request-received', {request, from});

// Friend request accepted
socket.emit('friend-request-accepted', {acceptedBy, friend});

// Friend request rejected
socket.emit('friend-request-rejected', {requestId});

// User blocked
socket.emit('user-blocked', {userId});
```

**Workspace Events:**
```javascript
// Member added
socket.emit('member-added', {workspace, member});

// Member removed
socket.emit('member-removed', {workspaceId, memberId});

// Workspace updated
socket.emit('workspace-updated', workspaceObject);

// Task created
socket.emit('task-created', taskObject);

// Task updated
socket.emit('task-updated', taskObject);
```

**Group Events:**
```javascript
// New group message
socket.emit('new-group-message', messageObject);

// Member joined group
socket.emit('group-member-joined', {groupId, member});
```

**Typing Events:**
```javascript
// User typing
socket.emit('user-typing', {userId, conversationId});

// User stopped typing
socket.emit('user-stopped-typing', {userId, conversationId});
```

---

### Event Flow Example

**Send Message Flow:**
```
User A sends message
  ↓
POST /api/messages/send
  ↓
Controller creates message trong DB
  ↓
Emit to recipient: io.to(`user-${receiverId}`).emit('new-message', msg)
  ↓
Emit to sender: io.to(`user-${senderId}`).emit('new-message', msg)
  ↓
Both clients receive event và update UI
```

---

## 🚀 DEPLOYMENT & DEVELOPMENT

### Development Setup

**Prerequisites:**
- Node.js 18+
- Docker & Docker Compose
- Git

**Steps:**
```bash
# 1. Clone repository
git clone <repository-url>
cd planner-web

# 2. Setup Backend
cd backend
npm install
cp .env.example .env
# Edit .env với credentials

# 3. Setup Frontend
cd ../frontend
npm install

# 4. Start Docker services
cd ..
docker-compose up -d

# 5. Initialize MinIO buckets (auto với minio-init)

# 6. Start Backend (development)
cd backend
npm run dev  # Nodemon với hot reload

# 7. Start Frontend (development)
cd frontend
npm run dev  # Vite dev server với HMR
```

**Access Points:**
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001/api`
- MinIO Console: `http://localhost:9001`
- MongoDB: `mongodb://localhost:27017`

---

### Environment Variables

**Backend (.env):**
```bash
# Server
NODE_ENV=development
PORT=3001

# MongoDB
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/planner?authSource=admin

# JWT
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
GOOGLE_REDIRECT_URI=http://localhost:5173/login

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false

# ChromaDB
CHROMA_URL=http://chromadb:8000

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Frontend (.env):**
```bash
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

---

### Docker Commands

**Start all services:**
```bash
docker-compose up -d
```

**Stop all services:**
```bash
docker-compose down
```

**View logs:**
```bash
docker-compose logs -f backend
docker-compose logs -f mongodb
```

**Rebuild backend:**
```bash
docker-compose up -d --build backend
```

**Reset data (careful!):**
```bash
docker-compose down -v
rm -rf data/
docker-compose up -d
```

---

### Production Build

**Frontend:**
```bash
cd frontend
npm run build
# Output: dist/ folder
```

**Backend:**
```bash
cd backend
npm run start
# Production mode với node
```

**Docker Production:**
```yaml
# Use production Dockerfile
# Separate docker-compose.prod.yml
# Configure reverse proxy (Nginx)
# Setup SSL certificates
# Configure production environment variables
```

---

## 📈 PERFORMANCE & OPTIMIZATION

### Database Optimization
- **Indexes:** Compound indexes trên query patterns
- **Population:** Select only needed fields
- **Aggregation:** Pipeline optimization
- **Connection Pooling:** MongoDB connection pool
- **Soft Delete:** Preserve data integrity

### Backend Optimization
- **Middleware Order:** Security → Auth → Routes
- **Rate Limiting:** Prevent abuse
- **Request Timeout:** 30s default
- **Compression:** Gzip responses (optional)
- **Caching:** Redis recommended for future

### Frontend Optimization
- **Code Splitting:** React lazy loading
- **Vite Build:** Tree shaking, minification
- **Image Optimization:** Lazy load, WebP format
- **Bundle Analysis:** Optimize imports
- **Service Worker:** PWA capabilities (future)

### WebSocket Optimization
- **Room-based Targeting:** Không broadcast global
- **Selective Emission:** Chỉ emit tới relevant users
- **Heartbeat:** Keep-alive mechanism
- **Reconnection Logic:** Exponential backoff

---

## 🔒 SECURITY MEASURES

### Backend Security
- **Helmet.js:** Security headers (CSP, XSS Protection)
- **CORS:** Configured origins only
- **Rate Limiting:** Express rate limit
- **Input Validation:** Joi schemas
- **SQL Injection:** N/A (NoSQL, but check injection)
- **XSS Prevention:** HTML sanitization
- **Password Hashing:** bcrypt (10 rounds)
- **JWT Secret:** Strong random key
- **Environment Variables:** Sensitive data

### Authentication Security
- **JWT Short-lived:** 15m access token
- **Refresh Token Rotation:** Generate new on refresh
- **2FA Support:** TOTP với authenticator apps
- **OAuth:** Google OAuth 2.0
- **Session Management:** Invalidate on logout
- **Password Policy:** Min length, complexity (recommended)

### File Upload Security
- **Size Limits:** 10MB per file
- **File Type Validation:** Mimetype checking
- **Malware Scanning:** Recommended for production
- **Storage Isolation:** MinIO buckets per type
- **Access Control:** JWT required for uploads

### API Security
- **HTTPS Only:** Production requirement
- **API Versioning:** /api/v1 pattern (future)
- **Request Validation:** Middleware chain
- **Error Handling:** No stack traces in production
- **Logging:** Audit trail (recommended)

---

## 🧪 TESTING STRATEGY

### Backend Tests
**Framework:** Jest 30.2.0

**Test Types:**
- Unit Tests: Controllers, Services, Repositories
- Integration Tests: API endpoints
- Socket Tests: WebSocket events

**Run Tests:**
```bash
cd backend
npm test
```

### Frontend Tests
**Framework:** Jest + React Testing Library

**Test Types:**
- Component Tests: UI components
- Integration Tests: Page flows
- Hook Tests: Custom hooks
- Context Tests: State management

**Run Tests:**
```bash
cd frontend
npm test
```

---

## 📚 DOCUMENTATION

**Available Documentation:**
- [PROJECT_OVERVIEW.md](./docs/PROJECT_OVERVIEW.md) - This file
- [CONNECTION_FLOW.md](./docs/CONNECTION_FLOW.md) - Friend connection system
- [MESSAGE_FLOW.md](./docs/MESSAGE_FLOW.md) - Messaging system
- [WORKSPACE_FLOW.md](./docs/WORKSPACE_FLOW.md) - Workspace management
- [CALENDAR_FLOW.md](./docs/CALENDAR_FLOW.md) - Calendar & tasks
- [AI_CHATBOT_RAG_OVERVIEW.md](./docs/AI_CHATBOT_RAG_OVERVIEW.md) - AI chatbot

---

## 🛣️ ROADMAP & FUTURE ENHANCEMENTS

### Phase 1 (Current)
- ✅ Core authentication (JWT, OAuth, 2FA)
- ✅ Workspace management (RBAC)
- ✅ Real-time messaging (1-1, groups)
- ✅ Task management với calendar
- ✅ File storage (MinIO)
- ✅ AI Chatbot với RAG

### Phase 2 (Planned)
- 🔲 Video/Voice calling (WebRTC)
- 🔲 Screen sharing
- 🔲 Kanban board view cho tasks
- 🔲 Gantt chart timeline
- 🔲 Email notifications
- 🔲 Mobile app (React Native)

### Phase 3 (Future)
- 🔲 Advanced analytics & reporting
- 🔲 Custom workflows (automation)
- 🔲 Third-party integrations (Slack, Trello)
- 🔲 Multi-language support (i18n)
- 🔲 Dark mode enhancements
- 🔲 Offline support (PWA)

---

## 👥 CONTRIBUTING

### Development Guidelines
- Follow existing code structure
- Write meaningful commit messages
- Add tests for new features
- Update documentation
- Code review before merge

### Code Style
- **Backend:** ESLint + Prettier (recommended)
- **Frontend:** ESLint + Prettier
- **Naming:** camelCase for variables, PascalCase for components
- **Comments:** JSDoc style cho functions

---

## 📝 LICENSE

This project is proprietary and confidential.

---

## 📞 SUPPORT

For issues and questions:
- Create GitHub issue
- Contact development team
- Check documentation first

---

**Last Updated:** December 24, 2025
**Version:** 1.0.0
**Maintained by:** Development Team
