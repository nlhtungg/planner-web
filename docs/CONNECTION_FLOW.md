# LUỒNG CONNECTION (KẾT NỐI BẠN BÈ)

## TỔNG QUAN KIẾN TRÚC

Luồng Connection quản lý toàn bộ hệ thống kết bạn trong ứng dụng, bao gồm gửi lời mời kết bạn, chấp nhận/từ chối, quản lý danh sách bạn bè và chặn người dùng. Hệ thống được xây dựng theo kiến trúc **MVC + Repository Pattern** với **Real-time WebSocket** cho thông báo tức thời.

## CẤU TRÚC FILE VÀ CHỨC NĂNG

### 1. MODEL LAYER

#### **Connection.js** (`backend/src/models/Connection.js`)
**Chức năng:** Schema MongoDB định nghĩa cấu trúc dữ liệu kết nối giữa hai người dùng.

**Đặc điểm kỹ thuật:**
- **Database Engine:** MongoDB với Mongoose ODM
- **Schema Structure:**
  - `requester`: ObjectId của người gửi lời mời (được đánh index)
  - `recipient`: ObjectId của người nhận lời mời (được đánh index)
  - `status`: Enum ['pending', 'accepted', 'rejected', 'blocked'] (được đánh index)
  - `blockedBy`: ObjectId của người thực hiện chặn
  - Timestamps tự động (createdAt, updatedAt)

**Indexing Strategy:**
- **Compound Index:** `{requester: 1, recipient: 1}` với unique constraint - Đảm bảo không tạo trùng kết nối
- **Single Indexes:** `{requester: 1, status: 1}` và `{recipient: 1, status: 1}` - Tối ưu query theo trạng thái
- **Purpose:** Tăng tốc độ truy vấn danh sách bạn bè, lời mời đang chờ

**Pre-save Hook:**
- Kiểm tra tự động ngăn người dùng tự kết bạn với chính mình
- Throw error nếu `requester === recipient`

**Data Integrity:**
- Unique compound index đảm bảo chỉ có 1 connection record giữa 2 users
- Enum status đảm bảo state machine hợp lệ

---

### 2. REPOSITORY LAYER

#### **connectionRepository.js** (`backend/src/repositories/connectionRepository.js`)
**Chức năng:** Data Access Layer - Tầng truy xuất và xử lý logic nghiệp vụ dữ liệu kết nối.

**Các phương thức chính:**

1. **sendRequest(requesterId, recipientId)**
   - Kiểm tra kết nối tồn tại với query `$or` (cả 2 chiều)
   - Validate trạng thái: không gửi nếu đã blocked/pending/accepted
   - Tạo Connection mới với status 'pending'
   - Populate thông tin user (firstName, lastName, email, avatar)
   - **Return:** Connection object đầy đủ

2. **acceptRequest(requestId, userId)**
   - Kiểm tra quyền: chỉ recipient mới chấp nhận được
   - Validate status phải là 'pending'
   - Update status thành 'accepted'
   - Populate và return updated connection

3. **rejectRequest(requestId, userId)**
   - Tương tự acceptRequest nhưng update status thành 'rejected'
   - Validate authorization

4. **cancelRequest(requestId, userId)**
   - Chỉ requester mới cancel được
   - Delete document khỏi database

5. **getFriends(userId)**
   - Query tất cả connections với status='accepted'
   - Filter cả 2 role (requester hoặc recipient)
   - Populate thông tin bạn bè
   - **Return:** Mảng user objects

6. **getPendingRequests(userId)**
   - Query connections với status='pending' và recipient=userId
   - Populate requester info
   - Sort theo createdAt descending

7. **getSentRequests(userId)**
   - Query pending requests với requester=userId
   - Populate recipient info

8. **blockUser(blockerId, targetUserId)**
   - Tìm hoặc tạo connection
   - Update status='blocked' và set blockedBy
   - Handle cả 2 chiều kết nối

9. **unblockUser(blockerId, targetUserId)**
   - Delete connection nếu status='blocked'
   - Validate chỉ blocker mới unblock được

10. **getSuggestions(userId)**
    - Logic phức tạp: tìm bạn của bạn chưa kết nối
    - Aggregate pipeline MongoDB
    - Exclude đã kết nối, đã gửi, đã block
    - **Performance:** Sử dụng `$lookup` và `$match` stages

11. **getConnectionStatus(userId, targetUserId)**
    - Query kiểm tra trạng thái kết nối giữa 2 users
    - Return status hoặc null

**Đặc điểm nổi bật:**
- **Error Handling:** Throw meaningful errors cho business logic
- **Population Strategy:** Always populate user info để giảm API calls
- **Bidirectional Queries:** Luôn check cả 2 chiều với `$or`

---

### 3. CONTROLLER LAYER

#### **connectionController.js** (`backend/src/controllers/connectionController.js`)
**Chức năng:** HTTP Request Handler - Xử lý request/response và tích hợp WebSocket.

**Các endpoint handlers:**

1. **POST /send** - sendRequest()
   - Validate: recipientId required, không tự gửi
   - Call repository.sendRequest()
   - **WebSocket Emit:**
     - Emit `friend-request-received` tới recipient room
     - Emit `friend-request-sent` tới sender room (real-time UI update)
   - Response: 200 JSON với connection data

2. **POST /accept/:requestId** - acceptRequest()
   - Validate authorization qua repository
   - **WebSocket Emit:**
     - Emit `friend-request-accepted` tới cả 2 users
     - Payload khác nhau: requester nhận thông báo accepted, recipient nhận new friend
   - Response: Populated connection

3. **POST /reject/:requestId** - rejectRequest()
   - Emit `friend-request-rejected` tới cả 2 users
   - Response: 200 success message

4. **DELETE /cancel/:requestId** - cancelRequest()
   - Validate requester authorization
   - Emit `friend-request-cancelled` events
   - Response: 200 confirmation

5. **GET /friends** - getFriends()
   - Return danh sách tất cả bạn bè
   - Response: Array of friend user objects

6. **DELETE /unfriend/:friendId** - unfriend()
   - Delete accepted connection
   - Emit `unfriended` event tới cả 2 users
   - Response: 200 confirmation

7. **POST /block/:targetUserId** - blockUser()
   - Block user và unfriend nếu đang là bạn
   - Emit `user-blocked` event
   - Response: 200 confirmation

8. **DELETE /unblock/:targetUserId** - unblockUser()
   - Remove block status
   - Emit `user-unblocked` event
   - Response: 200 confirmation

9. **GET /requests** - getPendingRequests()
   - Return lời mời đang chờ
   - Response: Array of pending request objects

10. **GET /sent** - getSentRequests()
    - Return lời mời đã gửi
    - Response: Array of sent requests

11. **GET /blocked** - getBlockedUsers()
    - Return danh sách đã chặn
    - Response: Array of blocked user objects

12. **GET /suggestions** - getSuggestions()
    - Return gợi ý kết bạn
    - Limit: 10 suggestions
    - Response: Array of suggested users

13. **GET /status/:targetUserId** - getConnectionStatus()
    - Check relationship status với target user
    - Response: Status object hoặc null

**Đặc điểm kỹ thuật:**
- **Middleware:** Tất cả routes require `authenticateToken`
- **Socket.IO Integration:** Access global.io object
- **Room Strategy:** `user-${userId}` rooms cho personal notifications
- **Error Handling:** Try-catch với console.error logging
- **Response Format:** Consistent `{success, data/message}` structure

---

### 4. ROUTING LAYER

#### **connectionRoutes.js** (`backend/src/routes/connectionRoutes.js`)
**Chức năng:** API Endpoint Definition với authentication middleware.

**Route Configuration:**
```
POST   /api/connections/send
POST   /api/connections/accept/:requestId
POST   /api/connections/reject/:requestId
DELETE /api/connections/cancel/:requestId
GET    /api/connections/friends
DELETE /api/connections/unfriend/:friendId
POST   /api/connections/block/:targetUserId
DELETE /api/connections/unblock/:targetUserId
GET    /api/connections/requests
GET    /api/connections/sent
GET    /api/connections/blocked
GET    /api/connections/suggestions
GET    /api/connections/status/:targetUserId
```

**Đặc điểm:**
- **Global Middleware:** `router.use(authenticateToken)` áp dụng cho tất cả routes
- **RESTful Design:** Sử dụng HTTP methods phù hợp (GET, POST, DELETE)
- **Parameter Patterns:** URL params cho resource IDs

---

## REAL-TIME WEBSOCKET INTEGRATION

### Socket.IO Configuration (`server.js`)

**Connection Flow:**
1. Client connect với JWT token trong handshake
2. Middleware `socketAuth` verify token và attach `socket.userId`
3. Auto-join personal room: `user-${userId}`
4. Socket ready để nhận events

**Event Emissions từ Controller:**
- `friend-request-received`: Thông báo lời mời mới
- `friend-request-sent`: Update UI sender
- `friend-request-accepted`: Thông báo chấp nhận
- `friend-request-rejected`: Thông báo từ chối
- `friend-request-cancelled`: Thông báo hủy
- `unfriended`: Thông báo hủy kết bạn
- `user-blocked`: Thông báo bị chặn
- `user-unblocked`: Thông báo được bỏ chặn

**Room Strategy:**
- Personal rooms: `user-${userId}` - Mỗi user có 1 room riêng
- Emit targeted: `io.to('user-123').emit('event', data)`
- Broadcast tới cả sender và receiver cho synchronization

---

## DATA FLOW DIAGRAM

```
HTTP Request (với JWT) 
    ↓
[authenticateToken Middleware] → Verify & attach req.user
    ↓
[connectionRoutes] → Route matching
    ↓
[connectionController] → Business logic & validation
    ↓
[connectionRepository] → Database operations với Mongoose
    ↓
[MongoDB] → CRUD operations với indexes
    ↓
[connectionRepository] → Return populated data
    ↓
[connectionController] → 
    ├→ Emit WebSocket events (global.io)
    └→ HTTP Response (JSON)
    ↓
Client receives:
    ├→ HTTP Response
    └→ WebSocket Event (real-time)
```

---

## PERFORMANCE OPTIMIZATION

### Database Level:
1. **Compound Index:** `{requester: 1, recipient: 1}` - O(1) lookup
2. **Status Index:** Tối ưu filter theo trạng thái
3. **Populate Strategy:** Chỉ select fields cần thiết (firstName, lastName, email, avatar)

### Application Level:
1. **Repository Pattern:** Tách biệt data access logic
2. **Lean Queries:** Sử dụng `.lean()` khi không cần Mongoose documents
3. **Aggregation Pipeline:** Cho suggestions (tối ưu hơn multiple queries)

### Real-time Level:
1. **Room-based Targeting:** Không broadcast global
2. **Selective Emission:** Chỉ emit tới users liên quan

---

## SECURITY CONSIDERATIONS

1. **Authorization Checks:**
   - Chỉ recipient mới accept/reject được
   - Chỉ requester mới cancel được
   - Chỉ blocker mới unblock được

2. **Validation:**
   - Prevent self-connection (model level)
   - Duplicate connection prevention (unique index)
   - Status state machine enforcement (enum)

3. **Authentication:**
   - JWT token required cho tất cả endpoints
   - Socket authentication middleware

---

## ERROR HANDLING PATTERNS

**Repository Level:**
- Throw descriptive errors: `'Friend request already sent'`
- Business logic validation

**Controller Level:**
- Try-catch blocks
- Console.error logging với context
- Consistent error response format:
  ```json
  {
    "success": false,
    "message": "Error description"
  }
  ```

**Status Codes:**
- 200: Success
- 201: Created
- 400: Validation error
- 403: Authorization error
- 404: Resource not found
- 500: Server error

---

## TESTING CONSIDERATIONS

**Unit Tests:**
- Repository methods với mocked MongoDB
- Controller logic với mocked repository

**Integration Tests:**
- Full API flow với test database
- Socket event emissions

**Test Scenarios:**
- Send request success/failure
- Accept/reject authorization
- Block/unblock flow
- Suggestion algorithm accuracy
- Duplicate request prevention
- Self-connection prevention

---

## SCALABILITY NOTES

**Current Limitations:**
- Suggestions query có thể chậm với user base lớn (aggregate pipeline)
- Socket.IO rooms trong memory (không scale horizontally)

**Recommended Improvements:**
- Redis adapter cho Socket.IO multi-server
- Cache suggestions results
- Pagination cho getFriends với user có nhiều bạn
- Background job cho suggestion calculation

---

## MONITORING & LOGGING

**Current Logging:**
- Console.log cho socket events
- Console.error cho exceptions
- Socket room size tracking

**Recommended Additions:**
- Request/response logging middleware
- Performance metrics (query times)
- Error tracking service (Sentry)
- WebSocket connection monitoring
