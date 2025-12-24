# LUỒNG MESSAGE (TIN NHẮN CÁ NHÂN)

## TỔNG QUAN KIẾN TRÚC

Luồng Message quản lý hệ thống chat 1-1 giữa các người dùng, bao gồm gửi tin nhắn văn bản, đính kèm file, reactions, pin message, và cài đặt conversation. Hệ thống được xây dựng với **Real-time WebSocket**, **File Storage Integration (MinIO)**, và **Conversation State Management**.

## CẤU TRÚC FILE VÀ CHỨC NĂNG

### 1. MODEL LAYER

#### **Message.js** (`backend/src/models/Message.js`)
**Chức năng:** Schema MongoDB cho tin nhắn cá nhân.

**Đặc điểm kỹ thuật:**
- **Database Engine:** MongoDB với Mongoose ODM
- **Schema Structure:**
  - `sender`: ObjectId người gửi (indexed)
  - `receiver`: ObjectId người nhận (indexed)
  - `content`: String nội dung tin nhắn (required, trimmed)
  - `attachments`: Array of objects
    - `url`: Public URL từ MinIO
    - `filename`: Tên file gốc
    - `mimetype`: MIME type
    - `size`: Kích thước bytes
  - `readAt`: Date timestamp khi được đọc
  - `readBy`: Array of objects (multi-read tracking)
    - `user`: ObjectId
    - `readAt`: Date
  - `deletedBy`: Array ObjectIds (soft delete per user)
  - `conversationId`: String identifier cho conversation (indexed)
  - `reactions`: Array of emoji reactions
    - `user`: ObjectId
    - `emoji`: String
    - `createdAt`: Date
  - `isPinned`: Boolean flag
  - `isSystemMessage`: Boolean (cho notification messages)
  - `systemMessageType`: Enum ['reaction_added', 'message_pinned', 'message_unpinned', null]
  - `relatedMessage`: ObjectId reference

**Indexing Strategy:**
- **Compound Index:** `{conversationId: 1, createdAt: -1}` - Tối ưu query messages theo thời gian
- **Compound Index:** `{sender: 1, receiver: 1}` - Tối ưu query theo người dùng
- **Purpose:** Hỗ trợ pagination và real-time loading

**Static Methods:**
- `generateConversationId(userId1, userId2)`: Tạo consistent ID bằng cách sort 2 userIds
  - Format: `"${sortedId1}_${sortedId2}"`
  - Đảm bảo cùng conversationId bất kể thứ tự parameters

**Instance Methods:**
- `isDeletedFor(userId)`: Check xem message có bị delete cho user không
  - Kiểm tra userId trong deletedBy array

**Data Integrity:**
- ConversationId bidirectional - cùng ID cho cả 2 users
- Soft delete pattern - message không bị xóa khỏi DB
- System messages cho notifications (không delete được)

---

#### **Conversation.js** (`backend/src/models/Conversation.js`)
**Chức năng:** Schema MongoDB cho conversation metadata và settings.

**Schema Structure:**
- `participants`: Array of 2 ObjectIds (indexed)
- `conversationId`: String unique identifier (indexed)
- `lastMessage`: String preview
- `lastMessageSender`: ObjectId
- `lastMessageAt`: Date (cho sorting conversations)
- `unreadCount`: Map of userId → count
  - Key: userId string
  - Value: Number (unread message count)
- `nicknames`: Map of userId → nickname string
  - Custom nicknames trong conversation
- `themeColor`: String hex color (default: '#3B82F6')

**Indexing:**
- `{participants: 1, lastMessageAt: -1}`: Query user conversations sorted
- `{conversationId: 1}`: Unique constraint và fast lookup

**Instance Methods:**
- `incrementUnread(userId)`: Tăng unread count cho user
- `resetUnread(userId)`: Reset về 0 khi đọc

**Đặc điểm nổi bật:**
- **Map Type:** Sử dụng Mongoose Map cho dynamic keys (userIds)
- **Metadata Separation:** Tách conversation settings khỏi messages
- **Sorting Optimization:** lastMessageAt cho real-time conversation list

---

### 2. REPOSITORY LAYER

#### **messageRepository.js** (`backend/src/repositories/messageRepository.js`)
**Chức năng:** Data Access Layer với conversation management.

**Các phương thức chính:**

1. **getConversations(userId)**
   - Query tất cả conversations có userId trong participants
   - Populate: participants, lastMessageSender với selected fields
   - Sort: lastMessageAt descending (mới nhất trên cùng)
   - **Transform:** Convert Map unreadCount thành plain object
   - **Return:** Array conversation objects

2. **getOrCreateConversation(userId1, userId2)**
   - Generate conversationId từ 2 userIds
   - Find existing conversation
   - Nếu không tồn tại: Create mới với:
     - 2 participants
     - Empty lastMessage
     - UnreadCount = 0 cho cả 2
   - Populate và return

3. **getMessages(userId1, userId2, limit=50, skip=0)**
   - Generate conversationId
   - Query messages với filters:
     - `conversationId` match
     - `deletedBy: {$ne: userId1}` - Exclude deleted messages
   - Populate: sender, receiver, readBy.user
   - Sort: createdAt descending (pagination)
   - **Limit & Skip:** Hỗ trợ infinite scroll
   - **Log:** Console log số messages và system messages
   - **Return:** Messages array

4. **createMessage({sender, receiver, content, attachments})**
   - Generate conversationId
   - Create Message document
   - **Conversation Update Logic:**
     - Find hoặc create conversation
     - Update lastMessage, lastMessageSender, lastMessageAt
     - Increment unreadCount cho receiver
   - Populate sender và receiver info
   - **Return:** Populated message object

5. **markAsRead(messageId, userId)**
   - Find message by ID
   - Validate: userId phải là receiver
   - Update readAt timestamp
   - Add entry vào readBy array nếu chưa có
   - **Return:** Updated message

6. **markConversationAsRead(conversationId, userId)**
   - Update tất cả unread messages trong conversation
   - Batch update với `updateMany`:
     - Filter: conversationId, receiver=userId, readAt=null
     - Set: readAt = now, add to readBy
   - Update conversation: reset unreadCount
   - **Return:** Update count

7. **deleteMessage(messageId, userId)**
   - Find message
   - Check: message không phải system message
   - Add userId vào deletedBy array (soft delete)
   - **Behavior:** Message vẫn tồn tại cho user khác
   - **Return:** Deleted message

8. **addReaction(messageId, userId, emoji)**
   - Find message
   - Check existing reaction từ user
   - Nếu trùng emoji: throw error
   - Nếu khác emoji: update
   - Nếu chưa có: add mới
   - **Return:** Updated message with reactions

9. **removeReaction(messageId, userId)**
   - Pull reaction object khỏi reactions array
   - Filter by user ID
   - **Return:** Updated message

10. **togglePinMessage(messageId, userId)**
    - Find message và conversation
    - Validate: user phải là participant
    - Toggle isPinned boolean
    - **Optional:** Create system notification message
    - **Return:** Updated message

11. **updateConversationSettings(conversationId, userId, settings)**
    - Settings include: nicknames, themeColor
    - Update conversation document
    - **Nicknames:** Map of userIds to custom names
    - **ThemeColor:** Hex color string
    - **Return:** Updated conversation

12. **searchMessages(conversationId, userId, searchTerm)**
    - Query messages với text search
    - Filter: content contains searchTerm (case-insensitive regex)
    - Exclude deleted messages cho userId
    - Sort: createdAt descending
    - **Return:** Matching messages

**Đặc điểm nổi bật:**
- **Transaction Safety:** Atomic operations cho conversation updates
- **Soft Delete Pattern:** Messages không bị xóa vật lý
- **Populate Strategy:** Always populate user info để giảm API calls
- **Logging:** Console logs cho debugging conversation flow

---

### 3. MIDDLEWARE LAYER

#### **messageUpload.js** (`backend/src/middlewares/messageUpload.js`)
**Chức năng:** Multer middleware cho file upload handling.

**Configuration:**
- **Storage:** `multer.memoryStorage()` - Files trong RAM (buffer)
- **File Size Limit:** 10MB per file
- **File Count:** Tối đa 5 files per message
- **Allowed Types:** All file types (không restrict mimetype)

**File Processing:**
- File buffer được pass tới MinIO service
- Original filename preserved (với UTF-8 encoding)
- Mimetype detection tự động

**Usage:** `messageUpload.array('files', 5)` trong route

**Đặc điểm:**
- **Memory Storage:** Phù hợp cho small-medium files
- **No Disk I/O:** Tránh disk write overhead
- **Buffer Upload:** Trực tiếp upload tới MinIO

---

### 4. SERVICE LAYER

#### **minioService.js** (`backend/src/services/minioService.js`)
**Chức năng:** Object Storage service cho file attachments.

**Configuration:**
- **Storage:** MinIO (S3-compatible)
- **Bucket:** `message-media`
- **Access:** Public read URLs

**Methods:**
- `uploadMessageMedia(userId, buffer, filename, mimetype)`:
  - Generate unique filename: `${userId}/${timestamp}-${uuid}-${filename}`
  - Upload buffer to MinIO bucket
  - Set metadata: content-type, original-filename
  - Return object: `{url, fileName, mimeType, size}`

**URL Format:** `http://minio:9000/message-media/${path}`

**Đặc điểm:**
- **Namespace:** Files organized by userId
- **Unique Names:** Timestamp + UUID prevent collisions
- **Public Access:** Direct URLs không cần signed URLs

---

### 5. CONTROLLER LAYER

#### **messageController.js** (`backend/src/controllers/messageController.js`)
**Chức năng:** HTTP Handler với WebSocket integration và file handling.

**Các endpoint handlers:**

1. **GET /conversations** - getConversations()
   - Get all conversations cho current user
   - Sorted by lastMessageAt
   - Response: Array conversations với unread counts

2. **GET /:otherUserId** - getMessages()
   - Get messages với specific user
   - Query params: `limit` (default 50), `skip` (default 0)
   - Messages reversed (oldest first) cho display
   - Response: Messages array

3. **POST /send** - sendMessage()
   - **Body:** receiverId, content
   - **Files:** req.files từ multer middleware
   - **File Processing Loop:**
     - Upload từng file tới MinIO
     - Log progress: `[1/5] Uploading...`
     - Collect attachment objects
     - Continue on error (partial success)
   - Create message với attachments
   - **WebSocket Emit:**
     - `new-message` tới receiver room
     - `new-message` tới sender room (UI sync)
     - Log room sizes cho debugging
   - Response: 201 với message object

4. **PATCH /message/:messageId/read** - markAsRead()
   - Mark single message as read
   - Validate receiver authorization
   - **WebSocket Emit:** `message-read` event với messageId
   - Response: Updated message

5. **PATCH /:otherUserId/read** - markConversationAsRead()
   - Mark all messages trong conversation as read
   - Batch update với repository method
   - **WebSocket Emit:** `conversation-read` với conversationId
   - Response: Update count

6. **DELETE /:messageId** - deleteMessage()
   - Soft delete message cho current user
   - Validate: không delete system messages
   - **WebSocket Emit:** `message-deleted` event
   - Response: 200 confirmation

7. **POST /message/:messageId/reaction** - addReaction()
   - **Body:** emoji string
   - Add reaction tới message
   - Validate: không duplicate reactions
   - **WebSocket Emit:** `message-reaction-added` tới cả 2 users
   - Response: Updated message với reactions

8. **DELETE /message/:messageId/reaction** - removeReaction()
   - Remove user's reaction
   - **WebSocket Emit:** `message-reaction-removed`
   - Response: Updated message

9. **PATCH /message/:messageId/pin** - togglePinMessage()
   - Toggle pin status
   - Validate: user trong conversation
   - **WebSocket Emit:** `message-pinned` or `message-unpinned`
   - Response: Updated message

10. **PATCH /:otherUserId/settings** - updateConversationSettings()
    - **Body:** nicknames (Map), themeColor (string)
    - Update conversation metadata
    - **WebSocket Emit:** `conversation-settings-updated`
    - Response: Updated conversation

11. **GET /:otherUserId/search** - searchMessages()
    - **Query param:** q (search term)
    - Search messages trong conversation
    - Response: Matching messages array

12. **GET /users/search** - searchUsers()
    - **Query param:** q (search term)
    - Search users để start new chat
    - Exclude current user
    - Response: User objects array

13. **GET /unread-count** - getUnreadCount()
    - Get total unread messages cho current user
    - Aggregate across all conversations
    - Response: `{count: number}`

**Đặc điểm kỹ thuật:**
- **Middleware:** authenticateToken cho tất cả routes
- **File Upload:** messageUpload.array('files', 5) cho /send
- **Socket Rooms:** `user-${userId}` pattern
- **Dual Emission:** Emit tới cả sender và receiver cho sync
- **Error Logging:** Detailed console logs với context
- **Partial Success:** File upload failures không block message

---

### 6. ROUTING LAYER

#### **messageRoutes.js** (`backend/src/routes/messageRoutes.js`)
**Chức năng:** API Endpoint Definition.

**Route Configuration:**
```
GET    /api/messages/conversations
GET    /api/messages/users/search
GET    /api/messages/unread-count
GET    /api/messages/:otherUserId
POST   /api/messages/send (với file upload)
PATCH  /api/messages/:otherUserId/read
PATCH  /api/messages/message/:messageId/read
DELETE /api/messages/:messageId
POST   /api/messages/message/:messageId/reaction
DELETE /api/messages/message/:messageId/reaction
PATCH  /api/messages/message/:messageId/pin
PATCH  /api/messages/:otherUserId/settings
GET    /api/messages/:otherUserId/search
```

**Middleware Order:**
1. `authenticateToken` - Global authentication
2. `messageUpload.array('files', 5)` - Chỉ cho /send route

---

## REAL-TIME WEBSOCKET EVENTS

### Client → Server Events:
- `join-chat`: User joins chat room với otherUserId

### Server → Client Events:
- `new-message`: New message received
- `message-read`: Message marked as read
- `conversation-read`: Entire conversation read
- `message-deleted`: Message deleted
- `message-reaction-added`: Reaction added
- `message-reaction-removed`: Reaction removed
- `message-pinned`: Message pinned
- `message-unpinned`: Message unpinned
- `conversation-settings-updated`: Settings changed

### Event Payload Examples:
```javascript
// new-message
{
  _id, sender, receiver, content, attachments, 
  conversationId, createdAt, isPinned, reactions
}

// message-reaction-added
{
  messageId, reaction: {user, emoji, createdAt}
}

// conversation-settings-updated
{
  conversationId, nicknames: Map, themeColor
}
```

---

## FILE UPLOAD FLOW

```
Client Upload (multipart/form-data)
    ↓
[Multer Middleware] → Parse files into req.files (buffers)
    ↓
[messageController.sendMessage]
    ├→ Loop through req.files
    ├→ minioService.uploadMessageMedia(buffer)
    │   ├→ Generate unique filename
    │   ├→ Put object to MinIO bucket
    │   └→ Return public URL
    ├→ Collect attachment objects {url, filename, mimetype, size}
    └→ Create message with attachments array
    ↓
[MongoDB] → Store message với attachment URLs
    ↓
[WebSocket] → Emit new-message với attachments
    ↓
Client Download (direct from MinIO URL)
```

**Storage Path:** `message-media/${userId}/${timestamp}-${uuid}-${filename}`

---

## DATA FLOW DIAGRAM

```
HTTP POST /send (với files)
    ↓
[authenticateToken]
    ↓
[messageUpload.array('files', 5)] → req.files = [buffer, ...]
    ↓
[messageController.sendMessage]
    ├→ Validate receiverId & content
    ├→ For each file:
    │   └→ minioService.uploadMessageMedia → MinIO URL
    ├→ messageRepository.createMessage
    │   ├→ Insert Message document
    │   └→ Update/Create Conversation
    └→ Emit WebSocket events
        ├→ io.to(`user-${receiver}`).emit('new-message')
        └→ io.to(`user-${sender}`).emit('new-message')
    ↓
Response: 201 JSON với message object
```

---

## PERFORMANCE OPTIMIZATION

### Database Level:
1. **Compound Indexes:** `{conversationId, createdAt}` cho pagination
2. **Populate Select:** Chỉ load fields cần thiết
3. **Batch Updates:** markConversationAsRead dùng updateMany
4. **Soft Delete:** Không delete documents (giữ referential integrity)

### File Storage Level:
1. **Direct URLs:** Client download trực tiếp từ MinIO
2. **No Proxy:** Server không proxy files
3. **CDN-ready:** MinIO URLs có thể dùng với CDN

### Application Level:
1. **Pagination:** limit/skip parameters
2. **Lazy Loading:** Infinite scroll pattern
3. **Buffer Upload:** Không lưu temp files

### Real-time Level:
1. **Room Targeting:** Chỉ emit tới users trong conversation
2. **Event Batching:** Một emit cho multiple updates

---

## SECURITY CONSIDERATIONS

1. **Authorization:**
   - Chỉ participants mới đọc được messages
   - Chỉ sender/receiver mới delete được
   - Validate user trong conversation cho all actions

2. **File Upload:**
   - 10MB size limit per file
   - 5 files limit per message
   - Filename sanitization (UTF-8 encoding)

3. **Data Privacy:**
   - Soft delete (user-specific visibility)
   - No cross-conversation leakage
   - JWT authentication required

4. **MinIO Security:**
   - Public read-only access
   - Write access qua backend only
   - Namespace isolation by userId

---

## ERROR HANDLING

**Common Error Scenarios:**
- File upload failures: Continue với partial success
- Invalid receiverId: 400 Bad Request
- Unauthorized access: 403 Forbidden
- Message not found: 404 Not Found
- Duplicate reactions: 400 với descriptive message

**Logging Strategy:**
- File upload progress logs
- Socket room size tracking
- Conversation creation/updates
- Error stack traces

---

## SCALABILITY NOTES

**Current Limitations:**
- Files stored in memory (RAM usage)
- Socket.IO rooms in-memory (single server)
- No message archival (all messages trong active DB)

**Recommended Improvements:**
- Redis adapter cho Socket.IO horizontal scaling
- Stream upload cho large files (avoid memory)
- Message archival strategy (move old messages)
- Conversation list pagination
- Read receipts optimization (batch updates)
- MinIO CDN integration
- Thumbnail generation for images
- File virus scanning

---

## MONITORING & OBSERVABILITY

**Current Logging:**
- Message count per conversation
- System message detection
- File upload progress
- Socket room sizes

**Recommended Additions:**
- Message delivery tracking
- File upload success rate
- Average conversation load time
- Unread message metrics
- Storage usage per user
- WebSocket connection health
