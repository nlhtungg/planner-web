# 📋 Planner Web - Collaborative Workspace Management System

## 🌟 Tổng Quan Dự Án

**Planner Web** là một hệ thống quản lý workspace và cộng tác đa chức năng, được xây dựng với kiến trúc Full-Stack hiện đại. Dự án cung cấp giải pháp toàn diện cho quản lý dự án, giao tiếp nhóm, quản lý tài liệu và trợ lý AI thông minh.

### 🎯 Mục Đích

- **Quản lý Workspace**: Tạo và quản lý không gian làm việc chung cho nhóm
- **Collaboration**: Công cụ cộng tác real-time với chat, video call, document sharing
- **Project Management**: Quản lý tasks, calendar, timeline cho dự án
- **AI Assistant**: Chatbot thông minh với RAG (Retrieval Augmented Generation) hỗ trợ truy vấn tài liệu
- **Document Management**: Lưu trữ và quản lý tài liệu trên cloud (MinIO S3)

---

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   React Frontend (Vite + TailwindCSS)                │   │
│  │   - Single Page Application (SPA)                    │   │
│  │   - Real-time WebSocket Connection                   │   │
│  │   - Responsive Design (Mobile-first)                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   Node.js + Express Backend                          │   │
│  │   - RESTful API                                      │   │
│  │   - Socket.io (Real-time)                            │   │
│  │   - JWT Authentication                               │   │
│  │   - Google OAuth 2.0                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      DATA/SERVICE LAYER                      │
│  ┌───────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │   MongoDB     │  │   MinIO     │  │   ChromaDB       │  │
│  │   (Database)  │  │   (Storage) │  │   (Vector Store) │  │
│  └───────────────┘  └─────────────┘  └──────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Google Gemini AI (External API)                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Cấu Trúc Thư Mục

```
planner-web/
│
├── backend/                          # Node.js Backend Server
│   ├── src/
│   │   ├── config/                   # Cấu hình ứng dụng
│   │   │   ├── app.config.js         # Config chính (port, CORS, body parser)
│   │   │   ├── auth.config.js        # JWT, OAuth, session config
│   │   │   └── database.config.js    # MongoDB connection config
│   │   │
│   │   ├── controllers/              # Business Logic Controllers
│   │   │   ├── authController.js     # Xử lý đăng ký, đăng nhập, OAuth
│   │   │   ├── userController.js     # Quản lý user profile
│   │   │   ├── workspaceController.js # CRUD workspace
│   │   │   ├── documentController.js  # Upload/download tài liệu
│   │   │   ├── messageController.js   # Chat 1-1 messaging
│   │   │   ├── groupController.js     # Group chat messaging
│   │   │   ├── chatbotController.js   # AI Chatbot với RAG
│   │   │   ├── calendarController.js  # Lịch và sự kiện
│   │   │   └── connectionController.js # Kết nối và friend requests
│   │   │
│   │   ├── models/                   # MongoDB Schema Models
│   │   │   ├── User.js               # User schema với Google OAuth
│   │   │   ├── Workspace.js          # Workspace với members & roles
│   │   │   ├── Document.js           # Tài liệu với version control
│   │   │   ├── Message.js            # Direct messages
│   │   │   ├── Group.js              # Group chat schema
│   │   │   ├── GroupMessage.js       # Group messages
│   │   │   ├── ChatbotDocument.js    # Tài liệu cho knowledge base
│   │   │   ├── ChatSession.js        # Lịch sử chat với AI
│   │   │   ├── Calendar.js           # Calendar events
│   │   │   └── Connection.js         # User connections (friends)
│   │   │
│   │   ├── repositories/             # Data Access Layer (DAL)
│   │   │   ├── userRepository.js     # User DB operations
│   │   │   ├── workspaceRepository.js # Workspace DB operations
│   │   │   ├── documentRepository.js  # Document DB operations
│   │   │   ├── messageRepository.js   # Message DB operations
│   │   │   └── groupRepository.js     # Group DB operations
│   │   │
│   │   ├── services/                 # External Service Integrations
│   │   │   ├── minioService.js       # MinIO S3 storage service
│   │   │   ├── chromaService.js      # ChromaDB vector database
│   │   │   ├── geminiService.js      # Google Gemini AI API
│   │   │   ├── emailService.js       # Email sending (Nodemailer)
│   │   │   └── authService.js        # OAuth và JWT logic
│   │   │
│   │   ├── middlewares/              # Express Middlewares
│   │   │   ├── auth.js               # JWT token verification
│   │   │   ├── socketAuth.js         # Socket.io authentication
│   │   │   ├── security.js           # Helmet, CORS, Rate limiting
│   │   │   ├── errorHandler.js       # Global error handler
│   │   │   ├── requestTimeout.js     # Timeout cho requests
│   │   │   └── validator.js          # Input validation (Joi)
│   │   │
│   │   ├── routes/                   # API Route Definitions
│   │   │   ├── index.js              # Route aggregator
│   │   │   ├── authRoutes.js         # /api/auth/*
│   │   │   ├── userRoutes.js         # /api/users/*
│   │   │   ├── workspaceRoutes.js    # /api/workspaces/*
│   │   │   ├── documentRoutes.js     # /api/documents/*
│   │   │   ├── messageRoutes.js      # /api/messages/*
│   │   │   ├── groupRoutes.js        # /api/groups/*
│   │   │   ├── chatbotRoutes.js      # /api/chatbot/*
│   │   │   ├── calendarRoutes.js     # /api/calendar/*
│   │   │   └── connectionRoutes.js   # /api/connections/*
│   │   │
│   │   ├── utils/                    # Utility Functions
│   │   │   ├── database.js           # MongoDB connection helper
│   │   │   ├── jwt.js                # JWT token generation/verify
│   │   │   ├── validation.js         # Common validators
│   │   │   └── logger.js             # Logging utilities
│   │   │
│   │   ├── scripts/                  # Maintenance Scripts
│   │   │   └── setupMinio.js         # MinIO bucket initialization
│   │   │
│   │   ├── __tests__/                # Unit & Integration Tests
│   │   │
│   │   ├── app.js                    # Express app configuration
│   │   ├── server.js                 # Server startup + Socket.io
│   │   └── index.js                  # Entry point
│   │
│   ├── Dockerfile                    # Backend container image
│   ├── package.json                  # Node dependencies
│   ├── .env                          # Environment variables
│   └── jest.config.js                # Jest test configuration
│
├── frontend/                         # React Frontend Application
│   ├── src/
│   │   ├── components/               # Reusable React Components
│   │   │   ├── layout/               # Layout components
│   │   │   │   ├── GlassPageContainer.jsx  # Glassmorphism container
│   │   │   │   ├── GlassHeader.jsx         # Navigation header
│   │   │   │   ├── GlassCard.jsx           # Card component
│   │   │   │   └── Navbar.jsx              # Main navigation
│   │   │   │
│   │   │   ├── ChatbotModal.jsx      # AI Chatbot modal interface
│   │   │   ├── ChatbotSection.jsx    # Chatbot knowledge base section
│   │   │   ├── DocumentViewer.jsx    # PDF/Word document viewer
│   │   │   ├── ToastContainer.jsx    # Toast notifications
│   │   │   └── ProtectedRoute.jsx    # Authentication guard
│   │   │
│   │   ├── pages/                    # Main Application Pages
│   │   │   ├── Login.jsx             # Login page với Google OAuth
│   │   │   ├── Register.jsx          # User registration
│   │   │   ├── Dashboard.jsx         # Main dashboard
│   │   │   ├── WorkspaceList.jsx     # Danh sách workspaces
│   │   │   ├── WorkspaceDetail.jsx   # Chi tiết workspace
│   │   │   ├── Messages.jsx          # Direct & Group messaging
│   │   │   ├── Calendar.jsx          # Calendar view
│   │   │   ├── Profile.jsx           # User profile settings
│   │   │   └── Connections.jsx       # Friend connections
│   │   │
│   │   ├── context/                  # React Context Providers
│   │   │   ├── AuthContext.jsx       # Authentication state
│   │   │   ├── ThemeContext.jsx      # Dark/Light mode
│   │   │   └── ConnectionContext.jsx # Real-time connections
│   │   │
│   │   ├── services/                 # API Service Layer
│   │   │   ├── authService.js        # Auth API calls
│   │   │   ├── workspaceService.js   # Workspace API calls
│   │   │   ├── documentService.js    # Document API calls
│   │   │   ├── messageService.js     # Message API calls
│   │   │   ├── groupService.js       # Group API calls
│   │   │   ├── chatbotService.js     # Chatbot API calls
│   │   │   ├── calendarService.js    # Calendar API calls
│   │   │   ├── socketService.js      # Socket.io client
│   │   │   └── api.js                # Axios instance + interceptors
│   │   │
│   │   ├── utils/                    # Frontend Utilities
│   │   │   ├── useToast.js           # Custom toast hook
│   │   │   └── formatters.js         # Date/time formatters
│   │   │
│   │   ├── __tests__/                # Frontend Tests
│   │   │
│   │   ├── App.jsx                   # Root component
│   │   ├── main.jsx                  # ReactDOM entry point
│   │   └── index.css                 # Global styles (Tailwind)
│   │
│   ├── index.html                    # HTML template
│   ├── vite.config.js                # Vite configuration + proxy
│   ├── tailwind.config.js            # Tailwind CSS config
│   ├── postcss.config.js             # PostCSS config
│   ├── package.json                  # Frontend dependencies
│   └── jest.config.js                # Jest config
│
├── data/                             # Persistent Data (Docker Volumes)
│   ├── mongo_data/                   # MongoDB data
│   ├── minio_data/                   # MinIO object storage
│   │   ├── user-media/               # User avatars
│   │   ├── workspace-media/          # Workspace documents
│   │   ├── message-media/            # Message attachments
│   │   └── chatbot-documents/        # AI knowledge base docs
│   └── chroma_data/                  # ChromaDB vector embeddings
│
├── docker-compose.yml                # Docker Compose orchestration
├── .gitignore                        # Git ignore patterns
└── README.md                         # This file

```

---

## 🔄 Luồng Hoạt Động Cơ Bản

### 1️⃣ Authentication Flow (Đăng Nhập)

```
┌─────────┐      ┌──────────┐      ┌─────────┐      ┌────────────┐
│ Browser │      │ Frontend │      │ Backend │      │  MongoDB   │
└────┬────┘      └────┬─────┘      └────┬────┘      └─────┬──────┘
     │                │                  │                  │
     │ 1. Click      │                  │                  │
     │  "Sign In"    │                  │                  │
     ├──────────────>│                  │                  │
     │                │                  │                  │
     │                │ 2. Google OAuth  │                  │
     │                │    Redirect      │                  │
     │<───────────────┤                  │                  │
     │                │                  │                  │
     │ 3. Google     │                  │                  │
     │   Auth Page   │                  │                  │
     ├──────────────>│                  │                  │
     │                │                  │                  │
     │ 4. Callback   │                  │                  │
     │   với code    │                  │                  │
     │<───────────────┤                  │                  │
     │                │                  │                  │
     │                │ 5. POST /api/auth│                 │
     │                │    /google       │                 │
     │                ├─────────────────>│                 │
     │                │                  │                 │
     │                │                  │ 6. Verify token│
     │                │                  │    với Google  │
     │                │                  ├────────────────>│
     │                │                  │                 │
     │                │                  │ 7. Find/Create │
     │                │                  │    User        │
     │                │                  ├────────────────>│
     │                │                  │<────────────────┤
     │                │                  │                 │
     │                │ 8. JWT Token    │                 │
     │                │<─────────────────┤                 │
     │                │                  │                 │
     │ 9. Store JWT  │                  │                 │
     │   in LocalStore│                 │                 │
     │<───────────────┤                  │                 │
     │                │                  │                 │
     │ 10. Navigate  │                  │                 │
     │    to Dashboard│                 │                 │
     │<───────────────┤                  │                 │
```

### 2️⃣ Real-time Messaging Flow

```
┌─────────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐
│ User A  │     │ Frontend │     │ Backend │     │  User B  │
└────┬────┘     └────┬─────┘     └────┬────┘     └────┬─────┘
     │               │                 │                │
     │ 1. Type      │                 │                │
     │   message    │                 │                │
     ├─────────────>│                 │                │
     │               │                 │                │
     │               │ 2. POST /api/   │                │
     │               │    messages     │                │
     │               ├────────────────>│                │
     │               │                 │                │
     │               │                 │ 3. Save to DB │
     │               │                 ├───────────────┤
     │               │                 │                │
     │               │ 4. HTTP Response│                │
     │               │<────────────────┤                │
     │               │                 │                │
     │ 5. Display   │                 │ 6. Socket.io  │
     │   message    │                 │    emit to    │
     │<──────────────┤                 │    User B     │
     │               │                 ├───────────────>│
     │               │                 │                │
     │               │                 │ 7. Receive    │
     │               │                 │    via socket │
     │               │                 │<───────────────┤
     │               │                 │                │
     │               │                 │ 8. Update UI  │
     │               │                 │    real-time  │
     │               │                 │───────────────>│
```

### 3️⃣ AI Chatbot with RAG Flow

```
┌─────────┐   ┌──────────┐   ┌─────────┐   ┌──────────┐   ┌─────────┐
│  User   │   │ Frontend │   │ Backend │   │ ChromaDB │   │ Gemini  │
└────┬────┘   └────┬─────┘   └────┬────┘   └────┬─────┘   └────┬────┘
     │             │               │              │              │
     │ 1. Upload  │               │              │              │
     │    PDF     │               │              │              │
     ├───────────>│               │              │              │
     │             │               │              │              │
     │             │ 2. POST      │              │              │
     │             │   /chatbot/  │              │              │
     │             │   upload     │              │              │
     │             ├──────────────>│              │              │
     │             │               │              │              │
     │             │               │ 3. Parse PDF│              │
     │             │               │   & Extract  │              │
     │             │               │   text       │              │
     │             │               ├──────────────┤              │
     │             │               │              │              │
     │             │               │ 4. Generate  │              │
     │             │               │   embeddings │              │
     │             │               ├─────────────────────────────>│
     │             │               │<─────────────────────────────┤
     │             │               │              │              │
     │             │               │ 5. Store     │              │
     │             │               │   vectors    │              │
     │             │               ├─────────────>│              │
     │             │               │<─────────────┤              │
     │             │               │              │              │
     │ 6. Ask     │               │              │              │
     │  question  │               │              │              │
     ├───────────>│               │              │              │
     │             │               │              │              │
     │             │ 7. POST      │              │              │
     │             │   /chatbot/  │              │              │
     │             │   chat       │              │              │
     │             ├──────────────>│              │              │
     │             │               │              │              │
     │             │               │ 8. Query     │              │
     │             │               │   similar    │              │
     │             │               │   vectors    │              │
     │             │               ├─────────────>│              │
     │             │               │<─────────────┤              │
     │             │               │              │              │
     │             │               │ 9. Build     │              │
     │             │               │   context +  │              │
     │             │               │   question   │              │
     │             │               ├──────────────┤              │
     │             │               │              │              │
     │             │               │ 10. Generate │              │
     │             │               │    answer    │              │
     │             │               ├─────────────────────────────>│
     │             │               │<─────────────────────────────┤
     │             │               │              │              │
     │             │ 11. Response │              │              │
     │             │<──────────────┤              │              │
     │             │               │              │              │
     │ 12. Display│               │              │              │
     │    answer  │               │              │              │
     │<───────────┤               │              │              │
```

### 4️⃣ Workspace Document Management

```
┌─────────┐   ┌──────────┐   ┌─────────┐   ┌─────────┐   ┌──────────┐
│  User   │   │ Frontend │   │ Backend │   │  MinIO  │   │ MongoDB  │
└────┬────┘   └────┬─────┘   └────┬────┘   └────┬────┘   └────┬─────┘
     │             │               │              │              │
     │ 1. Upload  │               │              │              │
     │   Document │               │              │              │
     ├───────────>│               │              │              │
     │             │               │              │              │
     │             │ 2. POST      │              │              │
     │             │   /documents/│              │              │
     │             │   upload     │              │              │
     │             ├──────────────>│              │              │
     │             │               │              │              │
     │             │               │ 3. Upload to│              │
     │             │               │   S3 bucket │              │
     │             │               ├─────────────>│              │
     │             │               │<─────────────┤              │
     │             │               │              │              │
     │             │               │ 4. Save     │              │
     │             │               │   metadata  │              │
     │             │               ├─────────────────────────────>│
     │             │               │<─────────────────────────────┤
     │             │               │              │              │
     │             │ 5. Response  │              │              │
     │             │<──────────────┤              │              │
     │             │               │              │              │
     │ 6. Access  │               │              │              │
     │   document │               │              │              │
     ├───────────>│               │              │              │
     │             │               │              │              │
     │             │ 7. GET       │              │              │
     │             │   /documents/│              │              │
     │             │   {id}       │              │              │
     │             ├──────────────>│              │              │
     │             │               │              │              │
     │             │               │ 8. Get      │              │
     │             │               │   metadata  │              │
     │             │               ├─────────────────────────────>│
     │             │               │<─────────────────────────────┤
     │             │               │              │              │
     │             │ 9. Pre-signed│              │              │
     │             │    URL       │              │              │
     │             │<──────────────┤              │              │
     │             │               │              │              │
     │ 10. Direct │               │              │              │
     │    download│               │              │              │
     │    from S3 │               │              │              │
     ├────────────────────────────────────────────>│              │
     │<───────────────────────────────────────────┤              │
```

---

## 🛠️ Tech Stack Chi Tiết

### Backend Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 18+ | JavaScript runtime |
| **Express.js** | 4.18.2 | Web framework |
| **MongoDB** | 7.x | NoSQL database |
| **Mongoose** | 7.6.3 | MongoDB ODM |
| **Socket.io** | 4.8.1 | Real-time WebSocket |
| **MinIO** | 8.0.6 | S3-compatible object storage |
| **ChromaDB** | 1.9.2 | Vector database for RAG |
| **Google Gemini AI** | 0.21.0 | AI language model |
| **JWT** | 9.0.2 | Authentication tokens |
| **Bcrypt** | 2.4.3 | Password hashing |
| **Multer** | 2.0.2 | File upload middleware |
| **Axios** | 1.13.1 | HTTP client |
| **Joi** | 17.11.0 | Input validation |
| **Helmet** | 7.1.0 | Security headers |

### Frontend Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.2.0 | UI library |
| **Vite** | 5.0.7 | Build tool |
| **React Router** | 6.20.0 | Client-side routing |
| **TailwindCSS** | 3.3.6 | CSS framework |
| **Axios** | 1.6.2 | HTTP client |
| **Socket.io Client** | 4.8.1 | Real-time communication |
| **Heroicons** | 2.2.0 | Icon library |
| **Moment.js** | 2.30.1 | Date formatting |
| **React Big Calendar** | 1.19.4 | Calendar component |
| **React Markdown** | 10.1.0 | Markdown rendering |
| **Framer Motion** | 12.23.26 | Animation library |
| **Recharts** | 3.6.0 | Chart library |

### DevOps & Infrastructure

| Technology | Purpose |
|-----------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **GitHub Actions** | CI/CD pipeline |
| **Jest** | Unit testing |
| **ESLint** | Code linting |

---

## 🚀 Hướng Dẫn Cài Đặt

### Prerequisites

- **Node.js** >= 18.0.0
- **Docker** & **Docker Compose**
- **Git**
- **Google OAuth 2.0 Credentials** (optional, for OAuth)
- **Google Gemini API Key** (for AI features)

### 1. Clone Repository

```bash
git clone https://github.com/your-repo/planner-web.git
cd planner-web
```

### 2. Cấu Hình Environment Variables

#### Backend (.env)

```env
# Server Configuration
NODE_ENV=development
PORT=3001
API_VERSION=v1

# MongoDB
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/planner_db?authSource=admin

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# MinIO S3 Storage
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_USER_MEDIA=user-media
MINIO_BUCKET_WORKSPACE_MEDIA=workspace-media
MINIO_BUCKET_MESSAGE_MEDIA=message-media
MINIO_BUCKET_CHATBOT_DOCUMENTS=chatbot-documents

# ChromaDB Vector Store
CHROMA_URL=http://chromadb:8000

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Email Service (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# CORS
CORS_ORIGIN=http://localhost:3000
```

#### Frontend (.env)

```env
# Google OAuth 2.0 (must match backend)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# API URL
VITE_API_URL=http://localhost:3001/api
```

### 3. Khởi Động Ứng Dụng với Docker

```bash
# Build và start tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Xóa data và restart từ đầu
docker-compose down -v
docker-compose up -d
```

Services sẽ chạy ở:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **MinIO Console**: http://localhost:9001 (login: minioadmin/minioadmin)
- **MongoDB**: localhost:27017
- **ChromaDB**: http://localhost:8000

### 4. Development Mode (không dùng Docker)

#### Backend

```bash
cd backend
npm install
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 📚 API Documentation

### Authentication Endpoints

```
POST   /api/auth/register              # Đăng ký user mới
POST   /api/auth/login                 # Đăng nhập email/password
POST   /api/auth/google                # Google OAuth login
POST   /api/auth/logout                # Đăng xuất
GET    /api/auth/me                    # Lấy thông tin user hiện tại
POST   /api/auth/refresh-token         # Refresh JWT token
```

### Workspace Endpoints

```
GET    /api/workspaces                 # Danh sách workspaces
POST   /api/workspaces                 # Tạo workspace mới
GET    /api/workspaces/:id             # Chi tiết workspace
PUT    /api/workspaces/:id             # Cập nhật workspace
DELETE /api/workspaces/:id             # Xóa workspace
POST   /api/workspaces/:id/members     # Thêm member
DELETE /api/workspaces/:id/members/:userId  # Xóa member
```

### Document Endpoints

```
GET    /api/documents                  # Danh sách documents
POST   /api/documents/upload           # Upload document
GET    /api/documents/:id              # Download document
DELETE /api/documents/:id              # Xóa document
PUT    /api/documents/:id              # Cập nhật metadata
```

### Messaging Endpoints

```
GET    /api/messages/conversations     # Danh sách conversations
GET    /api/messages/:userId           # Lấy messages với user
POST   /api/messages                   # Gửi message
DELETE /api/messages/:id               # Xóa message
```

### Group Endpoints

```
GET    /api/groups                     # Danh sách groups
POST   /api/groups                     # Tạo group
GET    /api/groups/:id                 # Chi tiết group
POST   /api/groups/:id/messages        # Gửi group message
POST   /api/groups/:id/members         # Thêm member vào group
```

### Chatbot Endpoints

```
POST   /api/chatbot/knowledge-base/upload              # Upload PDF to knowledge base
GET    /api/chatbot/knowledge-base/documents           # Danh sách documents
DELETE /api/chatbot/knowledge-base/documents/:id       # Xóa document
POST   /api/chatbot/knowledge-base/import-from-workspace  # Import từ workspace
POST   /api/chatbot/chat                               # Chat với AI
GET    /api/chatbot/chat/sessions                      # Lịch sử chat sessions
GET    /api/chatbot/chat/history/:sessionId            # Lịch sử chat của session
POST   /api/chatbot/workspace-insights/chat            # Chat về workspace
```

### WebSocket Events

```javascript
// Client to Server
socket.emit('join-workspace', workspaceId);
socket.emit('leave-workspace', workspaceId);
socket.emit('join-chat', userId);
socket.emit('typing', { senderId, receiverId });
socket.emit('stop-typing', { senderId, receiverId });

// Server to Client
socket.on('new-message', (message) => { ... });
socket.on('new-group-message', (message) => { ... });
socket.on('user-typing', (data) => { ... });
socket.on('user-stop-typing', (data) => { ... });
socket.on('workspace-updated', (workspace) => { ... });
```

---

## 🔐 Security Features

1. **JWT Authentication**: Token-based authentication với refresh mechanism
2. **Password Hashing**: Bcrypt với salt rounds = 10
3. **OAuth 2.0**: Google OAuth integration
4. **Helmet.js**: Security headers (CSP, XSS protection)
5. **CORS**: Configured for specific origins
6. **Rate Limiting**: Prevent brute force attacks
7. **Input Validation**: Joi schema validation
8. **File Upload Limits**: 10MB per file
9. **SQL Injection Prevention**: Mongoose parameterized queries
10. **XSS Prevention**: Content sanitization

---

## 🧪 Testing

### Run Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Coverage report
npm test -- --coverage
```

---

## 📊 Database Schema Overview

### Users Collection
```javascript
{
  _id: ObjectId,
  googleId: String,
  email: String (unique),
  firstName: String,
  lastName: String,
  avatar: String (URL),
  password: String (hashed),
  isVerified: Boolean,
  createdAt: Date
}
```

### Workspaces Collection
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  owner: ObjectId (ref: User),
  members: [{
    user: ObjectId (ref: User),
    role: String (enum: owner|admin|member)
  }],
  createdAt: Date
}
```

### Documents Collection
```javascript
{
  _id: ObjectId,
  title: String,
  fileUrl: String,
  fileType: String,
  fileSize: Number,
  workspace: ObjectId (ref: Workspace),
  uploadedBy: ObjectId (ref: User),
  createdAt: Date
}
```

---

## 🐛 Troubleshooting

### Common Issues

**1. MongoDB Connection Error**
```
Solution: Đảm bảo MongoDB container đang chạy
docker-compose ps
docker-compose restart mongodb
```

**2. MinIO Buckets Not Created**
```
Solution: Run minio-init container lại
docker-compose up -d minio-init
```

**3. ChromaDB Connection Failed**
```
Solution: Restart ChromaDB container
docker-compose restart chromadb
```

**4. Frontend không kết nối Backend**
```
Solution: Check VITE_API_URL trong frontend/.env
Verify CORS_ORIGIN trong backend/.env
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 License

This project is licensed under the ISC License.

---

## 👥 Team

- **Backend Developer**: API, Database, AI Integration
- **Frontend Developer**: UI/UX, React Components
- **DevOps Engineer**: Docker, CI/CD

---

## 📞 Support

- **Documentation**: [Wiki](https://github.com/your-repo/planner-web/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-repo/planner-web/issues)
- **Email**: support@planner-web.com

---

## 🎯 Roadmap

### Version 2.0 (Planned)
- [ ] Video conferencing integration
- [ ] Advanced task management (Kanban board)
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Third-party integrations (Slack, Trello)
- [ ] Email notifications
- [ ] File versioning

---

**Last Updated**: December 23, 2025
