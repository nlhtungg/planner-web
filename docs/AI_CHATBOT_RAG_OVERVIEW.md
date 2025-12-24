# 🤖 AI Chatbot với RAG (Retrieval Augmented Generation) - Tổng Quan

## 📋 Mục Lục

1. [Giới Thiệu RAG](#giới-thiệu-rag)
2. [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
3. [Luồng Xử Lý Chi Tiết](#luồng-xử-lý-chi-tiết)
4. [Components Chính](#components-chính)
5. [Models & Database](#models--database)
6. [API Endpoints](#api-endpoints)

---

## 🎯 Giới Thiệu RAG

**RAG (Retrieval Augmented Generation)** là một kỹ thuật AI kết hợp:
- **Retrieval**: Tìm kiếm thông tin liên quan từ knowledge base
- **Augmentation**: Bổ sung context vào câu hỏi
- **Generation**: Sinh câu trả lời dựa trên context

### Tại Sao Cần RAG?

```
❌ Chatbot Thông Thường (LLM Only):
   - Chỉ dựa vào kiến thức được training
   - Không biết về tài liệu riêng của user
   - Có thể hallucination (bịa đặt thông tin)

✅ Chatbot với RAG:
   - Truy vấn được tài liệu riêng của user (PDF, docs)
   - Trả lời dựa trên nguồn thực tế
   - Giảm hallucination, tăng độ chính xác
```

---

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │   ChatbotModal.jsx / ChatbotSection.jsx                  │   │
│  │   - Upload PDF/URL                                       │   │
│  │   - Select documents cho RAG                             │   │
│  │   - Chat interface                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND - NODE.JS                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  chatbotController.js                                    │   │
│  │  - uploadDocument()    → Upload & process PDF/URL        │   │
│  │  - chat()              → Handle chat với RAG             │   │
│  │  - getDocuments()      → Danh sách knowledge base        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↕                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Services Layer                                          │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌───────────┐  │   │
│  │  │ geminiService  │  │ documentProc   │  │  minio    │  │   │
│  │  │ - Embeddings   │  │ - Parse PDF    │  │ - Storage │  │   │
│  │  │ - Chat Model   │  │ - Text Extract │  │           │  │   │
│  │  │ - RAG Logic    │  │ - Chunking     │  │           │  │   │
│  │  └────────────────┘  └────────────────┘  └───────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      DATA & AI SERVICES                         │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────────┐ │
│  │   MongoDB    │  │   MinIO     │  │      ChromaDB          │ │
│  │              │  │             │  │  (Vector Database)     │ │
│  │ - KnowledgeB │  │ - PDF files │  │  ┌──────────────────┐  │ │
│  │   ase        │  │ - Docs      │  │  │ kb_user_123      │  │ │
│  │ - ChatHistory│  │             │  │  │ - doc1_chunk_0   │  │ │
│  │              │  │             │  │  │   [embedding]    │  │ │
│  │              │  │             │  │  │ - doc1_chunk_1   │  │ │
│  │              │  │             │  │  │   [embedding]    │  │ │
│  └──────────────┘  └─────────────┘  │  └──────────────────┘  │ │
│                                      └────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Google Gemini AI API                              │  │
│  │  - text-embedding-004    → Generate embeddings           │  │
│  │  - gemma-3-4b-it         → Chat & text generation        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Luồng Xử Lý Chi Tiết

### 📤 Phase 1: Upload & Index Document

```
┌──────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐     ┌────────┐     ┌────────────┐
│  User    │     │Frontend │     │ Backend  │     │Document  │     │ Gemini │     │ ChromaDB   │
│          │     │         │     │Controller│     │Processor │     │  API   │     │            │
└────┬─────┘     └────┬────┘     └────┬─────┘     └────┬─────┘     └────┬───┘     └─────┬──────┘
     │                │                │                 │                │               │
     │ 1. Select     │                │                 │                │               │
     │    PDF file   │                │                 │                │               │
     ├──────────────>│                │                 │                │               │
     │                │                │                 │                │               │
     │                │ 2. POST       │                 │                │               │
     │                │   /chatbot/   │                 │                │               │
     │                │   upload      │                 │                │               │
     │                ├───────────────>│                 │                │               │
     │                │                │                 │                │               │
     │                │                │ 3. Save PDF    │                │               │
     │                │                │    to MinIO    │                │               │
     │                │                ├────────────────┤                │               │
     │                │                │                 │                │               │
     │                │                │ 4. Extract     │                │               │
     │                │                │    PDF text    │                │               │
     │                │                ├────────────────>│                │               │
     │                │                │                 │                │               │
     │                │                │ 5. Split into  │                │               │
     │                │                │    chunks      │                │               │
     │                │                │    (1000 chars)│                │               │
     │                │                │<────────────────┤                │               │
     │                │                │                 │                │               │
     │                │                │ 6. Save to     │                │               │
     │                │                │    MongoDB     │                │               │
     │                │                │    (status:    │                │               │
     │                │                │    processing) │                │               │
     │                │                ├────────────────┤                │               │
     │                │                │                 │                │               │
     │                │ 7. Response   │                 │                │               │
     │                │   201 Created │                 │                │               │
     │                │<───────────────┤                 │                │               │
     │                │                │                 │                │               │
     │ 8. Show       │                │                 │                │               │
     │   "Processing"│                │                 │                │               │
     │<───────────────┤                │                 │                │               │
     │                │                │                 │                │               │
     │                │         ┌──────┴─────────────────┴────────────────┴───────────────┴────┐
     │                │         │          BACKGROUND PROCESSING (async)                        │
     │                │         └──────┬─────────────────┬────────────────┬───────────────┬────┘
     │                │                │                 │                │               │
     │                │                │ 9. For each    │                │               │
     │                │                │    chunk:      │                │               │
     │                │                │    Generate    │                │               │
     │                │                │    embedding   │                │               │
     │                │                ├────────────────────────────────>│               │
     │                │                │                 │                │               │
     │                │                │ 10. Embedding  │                │               │
     │                │                │     vector     │                │               │
     │                │                │     (768 dim)  │                │               │
     │                │                │<────────────────────────────────┤               │
     │                │                │                 │                │               │
     │                │                │ 11. Store      │                │               │
     │                │                │     vectors +  │                │               │
     │                │                │     metadata   │                │               │
     │                │                │     to ChromaDB│                │               │
     │                │                ├─────────────────────────────────────────────────>│
     │                │                │                 │                │               │
     │                │                │ 12. Update     │                │               │
     │                │                │     status:    │                │               │
     │                │                │     "ready"    │                │               │
     │                │                ├────────────────┤                │               │
     │                │                │                 │                │               │
     │ 13. Refresh   │                │                 │                │               │
     │     list      │                │                 │                │               │
     ├──────────────>│                │                 │                │               │
     │                │                │                 │                │               │
     │ 14. Document  │                │                 │                │               │
     │     status:   │                │                 │                │               │
     │     "READY"   │                │                 │                │               │
     │<───────────────┤                │                 │                │               │
```

#### 🔑 Key Points - Document Indexing

1. **PDF Parsing** (documentProcessorService):
   ```javascript
   - Sử dụng pdf-parse để extract text
   - Chia text thành chunks ~1000 characters
   - Mỗi chunk giữ metadata (page number, position)
   ```

2. **Embedding Generation** (geminiService):
   ```javascript
   - Model: text-embedding-004
   - Input: Text chunk
   - Output: Vector 768 dimensions
   - Parallel processing cho performance
   ```

3. **Vector Storage** (ChromaDB):
   ```javascript
   - Collection per user: kb_user_{userId}
   - Document structure:
     {
       id: "doc123_chunk_0",
       embedding: [0.1, 0.2, ...], // 768 dims
       document: "Original text...",
       metadata: {
         documentId: "doc123",
         chunkIndex: 0,
         pageNumber: 1
       }
     }
   ```

---

### 💬 Phase 2: Chat với RAG

```
┌──────────┐   ┌─────────┐   ┌──────────┐   ┌────────┐   ┌──────────┐   ┌─────────┐
│  User    │   │Frontend │   │ Backend  │   │ Gemini │   │ChromaDB  │   │ MongoDB │
│          │   │         │   │Controller│   │  API   │   │          │   │         │
└────┬─────┘   └────┬────┘   └────┬─────┘   └────┬───┘   └─────┬────┘   └────┬────┘
     │              │              │              │             │             │
     │ 1. Select   │              │              │             │             │
     │   documents │              │              │             │             │
     │   for RAG   │              │              │             │             │
     ├─────────────>│              │              │             │             │
     │              │              │              │             │             │
     │ 2. Type     │              │              │             │             │
     │   question  │              │              │             │             │
     │   "What is  │              │              │             │             │
     │    X?"      │              │              │             │             │
     ├─────────────>│              │              │             │             │
     │              │              │              │             │             │
     │              │ 3. POST     │              │             │             │
     │              │   /chatbot/ │              │             │             │
     │              │   chat      │              │             │             │
     │              │   {         │              │             │             │
     │              │   message,  │              │             │             │
     │              │   sessionId,│              │             │             │
     │              │   docIds[]  │              │             │             │
     │              │   }         │              │             │             │
     │              ├─────────────>│              │             │             │
     │              │              │              │             │             │
     │              │              │ 4. Get chat │             │             │
     │              │              │   history   │             │             │
     │              │              ├─────────────────────────────────────────>│
     │              │              │<─────────────────────────────────────────┤
     │              │              │              │             │             │
     │              │              │ 5. Generate │             │             │
     │              │              │   embedding │             │             │
     │              │              │   for query │             │             │
     │              │              ├─────────────>│             │             │
     │              │              │              │             │             │
     │              │              │ 6. Query    │             │             │
     │              │              │   embedding │             │             │
     │              │              │<─────────────┤             │             │
     │              │              │              │             │             │
     │              │              │ 7. Search   │             │             │
     │              │              │   similar   │             │             │
     │              │              │   vectors   │             │             │
     │              │              │   (where:   │             │             │
     │              │              │   docId IN  │             │             │
     │              │              │   selected) │             │             │
     │              │              ├─────────────────────────>│             │
     │              │              │              │             │             │
     │              │              │ 8. Top 5    │             │             │
     │              │              │   relevant  │             │             │
     │              │              │   chunks    │             │             │
     │              │              │<─────────────────────────┤             │
     │              │              │              │             │             │
     │              │              │ 9. Build    │             │             │
     │              │              │   context   │             │             │
     │              │              │   prompt:   │             │             │
     │              │              │   - System  │             │             │
     │              │              │   - Context │             │             │
     │              │              │   - History │             │             │
     │              │              │   - Question│             │             │
     │              │              ├─────────────┤             │             │
     │              │              │              │             │             │
     │              │              │ 10. Generate│             │             │
     │              │              │    response │             │             │
     │              │              ├─────────────>│             │             │
     │              │              │              │             │             │
     │              │              │ 11. AI      │             │             │
     │              │              │    answer   │             │             │
     │              │              │<─────────────┤             │             │
     │              │              │              │             │             │
     │              │              │ 12. Save    │             │             │
     │              │              │    to chat  │             │             │
     │              │              │    history  │             │             │
     │              │              ├─────────────────────────────────────────>│
     │              │              │              │             │             │
     │              │ 13. Response│              │             │             │
     │              │     {       │              │             │             │
     │              │     response│              │             │             │
     │              │     sources │              │             │             │
     │              │     }       │              │             │             │
     │              │<─────────────┤              │             │             │
     │              │              │              │             │             │
     │ 14. Display │              │              │             │             │
     │    answer   │              │              │             │             │
     │<─────────────┤              │              │             │             │
```

#### 🔑 Key Points - RAG Query Flow

1. **Vector Similarity Search**:
   ```javascript
   // Query embedding
   queryVector = gemini.embed("What is X?")
   
   // Search in ChromaDB với cosine similarity
   results = chromaDB.query({
     queryEmbeddings: [queryVector],
     nResults: 5,
     where: { documentId: { $in: selectedDocIds } }
   })
   
   // Results sorted by similarity (distance)
   ```

2. **Context Building**:
   ```javascript
   systemPrompt = `
   Bạn là trợ lý AI thông minh.
   
   Dựa vào thông tin sau để trả lời:
   
   ${chunk1.text}
   ${chunk2.text}
   ${chunk3.text}
   
   Câu hỏi: ${userQuestion}
   `
   ```

3. **Response Generation**:
   ```javascript
   // Chat với context
   chat = gemini.startChat({
     history: [...previousMessages],
     systemInstruction: systemPrompt
   })
   
   response = chat.sendMessage(userQuestion)
   ```

---

## 🧩 Components Chính

### 1. **chatbotController.js**
Controller xử lý các API endpoint

```javascript
class ChatbotController {
  // Upload PDF/URL và index vào vector DB
  async uploadDocument(req, res) { ... }
  
  // Chat với RAG
  async chat(req, res) { ... }
  
  // Lấy danh sách documents
  async getDocuments(req, res) { ... }
  
  // Xóa document
  async deleteDocument(req, res) { ... }
  
  // Import từ workspace
  async importFromWorkspace(req, res) { ... }
}
```

### 2. **geminiService.js**
Service tương tác với Google Gemini AI

```javascript
class GeminiService {
  // Models
  embedModel = 'text-embedding-004'  // 768 dimensions
  chatModel = 'gemma-3-4b-it'        // Chat model
  
  // Generate embedding cho text
  async generateEmbedding(text) { ... }
  
  // Thêm document chunks vào ChromaDB
  async addDocumentToVectorDB(userId, documentId, chunks) { ... }
  
  // Tìm kiếm chunks tương tự
  async searchSimilarChunks(userId, query, topK, selectedDocIds) { ... }
  
  // Generate response với RAG
  async generateChatResponse(userId, message, history, selectedDocIds) { ... }
}
```

### 3. **documentProcessorService.js**
Service xử lý document parsing

```javascript
class DocumentProcessorService {
  // Parse PDF file
  async processPDF(buffer) {
    const data = await pdfParse(buffer);
    const text = data.text;
    const chunks = this.splitIntoChunks(text, 1000);
    return { text, chunks, metadata };
  }
  
  // Scrape URL content
  async processURL(url) {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const text = $('body').text();
    const chunks = this.splitIntoChunks(text, 1000);
    return { text, chunks, metadata };
  }
  
  // Split text into chunks
  splitIntoChunks(text, chunkSize) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push({
        id: `chunk_${i}`,
        text: text.substring(i, i + chunkSize),
        index: chunks.length
      });
    }
    return chunks;
  }
}
```

### 4. **minioService.js**
Service quản lý file storage

```javascript
class MinioService {
  // Upload PDF to chatbot bucket
  async uploadChatbotDocument(userId, buffer, filename, mimetype) {
    const objectName = `${userId}/${Date.now()}-${filename}`;
    await minioClient.putObject('chatbot-documents', objectName, buffer);
    return { 
      url: `/minio/chatbot-documents/${objectName}`,
      objectName 
    };
  }
  
  // Delete document
  async deleteChatbotDocument(objectName) {
    await minioClient.removeObject('chatbot-documents', objectName);
  }
}
```

---

## 💾 Models & Database

### MongoDB Collections

#### 1. **KnowledgeBase** (ChatbotDocument)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,             // Owner
  title: String,                // "My Document.pdf"
  type: String,                 // "pdf" | "url"
  source: String,               // Filename or URL
  content: String,              // Full text content
  fileUrl: String,              // MinIO URL
  objectName: String,           // MinIO object name
  chromaCollectionId: String,   // "kb_user_123"
  documentIds: [String],        // ["doc_chunk_0", "doc_chunk_1", ...]
  status: String,               // "processing" | "ready" | "failed"
  error: String,                // Error message if failed
  metadata: {
    fileSize: Number,
    mimeType: String,
    originalFilename: String,
    pageCount: Number,
    chunkCount: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. **ChatHistory** (ChatSession)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  sessionId: String,            // "session_1234567890_abc"
  messages: [{
    role: String,               // "user" | "assistant"
    content: String,            // Message text
    timestamp: Date,
    knowledgeBaseSources: [{    // Sources used (optional)
      knowledgeBaseId: ObjectId,
      chunkIndex: Number,
      relevance: Number
    }]
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### ChromaDB Collections

#### Collection Structure
```javascript
Collection: "kb_user_123"
Metadata: { userId: "123" }

Documents: [
  {
    id: "doc456_chunk_0",
    embedding: [0.123, 0.456, ..., 0.789],  // 768 dimensions
    document: "This is the first chunk of text...",
    metadata: {
      documentId: "doc456",
      chunkIndex: 0,
      pageNumber: 1
    }
  },
  {
    id: "doc456_chunk_1",
    embedding: [0.234, 0.567, ..., 0.890],
    document: "This is the second chunk of text...",
    metadata: {
      documentId: "doc456",
      chunkIndex: 1,
      pageNumber: 1
    }
  }
]
```

---

## 📡 API Endpoints

### Knowledge Base Management

```http
# Upload PDF document
POST /api/chatbot/knowledge-base/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
  file: <PDF file>
  type: "pdf"

Response:
{
  "success": true,
  "message": "Document uploaded and processing",
  "data": {
    "id": "doc123",
    "title": "My Document.pdf",
    "type": "pdf",
    "status": "processing"
  }
}
```

```http
# Upload from URL
POST /api/chatbot/knowledge-base/upload
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "type": "url",
  "url": "https://example.com/article",
  "title": "Article Title"
}
```

```http
# Get all documents
GET /api/chatbot/knowledge-base/documents
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "doc123",
      "title": "My Document.pdf",
      "type": "pdf",
      "status": "ready",
      "metadata": {
        "pageCount": 10,
        "chunkCount": 25
      },
      "createdAt": "2025-12-23T10:00:00Z"
    }
  ]
}
```

```http
# Delete document
DELETE /api/chatbot/knowledge-base/documents/:id
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Document deleted successfully"
}
```

```http
# Import document from workspace
POST /api/chatbot/knowledge-base/import-from-workspace
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "documentId": "workspace_doc_123"
}
```

### Chat API

```http
# Send chat message
POST /api/chatbot/chat
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "message": "What is machine learning?",
  "sessionId": "session_123",          // Optional, auto-generated if not provided
  "selectedDocumentIds": ["doc1", "doc2"]  // Optional, filter RAG context
}

Response:
{
  "success": true,
  "data": {
    "response": "Machine learning is a subset of artificial intelligence...",
    "sessionId": "session_123"
  }
}
```

```http
# Get chat sessions
GET /api/chatbot/chat/sessions
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "sessionId": "session_123",
      "lastMessage": "What is AI?",
      "createdAt": "2025-12-23T10:00:00Z",
      "messageCount": 10
    }
  ]
}
```

```http
# Get chat history
GET /api/chatbot/chat/history/:sessionId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "sessionId": "session_123",
    "messages": [
      {
        "role": "user",
        "content": "What is AI?",
        "timestamp": "2025-12-23T10:00:00Z"
      },
      {
        "role": "assistant",
        "content": "AI stands for...",
        "timestamp": "2025-12-23T10:00:05Z"
      }
    ]
  }
}
```

```http
# Delete chat session
DELETE /api/chatbot/chat/sessions/:sessionId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Session deleted successfully"
}
```

---

## 🔍 Ví Dụ Thực Tế

### Scenario: User hỏi về Machine Learning từ PDF đã upload

#### 1. User đã upload file "ML_Basics.pdf"

```
Step 1: Parse PDF
└─> Extract text: "Machine learning is a method of data analysis..."
    Split into chunks:
    - Chunk 0: "Machine learning is a method..."
    - Chunk 1: "There are three types of ML..."
    - Chunk 2: "Supervised learning uses labeled data..."

Step 2: Generate Embeddings
└─> Chunk 0 → [0.12, 0.45, 0.78, ..., 0.23]
    Chunk 1 → [0.34, 0.67, 0.89, ..., 0.45]
    Chunk 2 → [0.56, 0.89, 0.12, ..., 0.67]

Step 3: Store in ChromaDB
└─> Collection: kb_user_123
    Documents: 3 chunks with embeddings
```

#### 2. User hỏi: "What is supervised learning?"

```
Step 1: Embed Query
└─> Query: "What is supervised learning?"
    Embedding: [0.54, 0.88, 0.11, ..., 0.66]

Step 2: Vector Search
└─> Find top 5 similar chunks by cosine similarity
    Results:
    1. Chunk 2 (distance: 0.12) ✅ Closest match
    2. Chunk 1 (distance: 0.35)
    3. Chunk 0 (distance: 0.67)

Step 3: Build Context
└─> System Prompt:
    "Dựa vào thông tin sau:
    
    Supervised learning uses labeled data where each 
    example has an input and a known output. The algorithm
    learns to map inputs to outputs by finding patterns...
    
    [Other relevant chunks]
    
    Câu hỏi: What is supervised learning?"

Step 4: Generate Response
└─> Gemini AI Response:
    "Supervised learning là một phương pháp học máy sử dụng 
    dữ liệu có nhãn (labeled data). Trong supervised learning, 
    mỗi mẫu dữ liệu đều có cả input và output đã biết trước. 
    Thuật toán sẽ học cách ánh xạ từ input sang output bằng 
    cách tìm ra các pattern trong dữ liệu training..."
```

---

## 🎨 Frontend Integration

### ChatbotModal Component

```jsx
const ChatbotModal = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [messages, setMessages] = useState([]);
  
  // Upload document
  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'pdf');
    
    const response = await chatbotService.uploadDocument(formData);
    // Document sẽ có status "processing"
    
    // Poll để check khi nào status thành "ready"
    pollDocumentStatus(response.data.id);
  };
  
  // Send message with RAG
  const handleSendMessage = async (message) => {
    const response = await chatbotService.chat({
      message,
      sessionId: currentSessionId,
      selectedDocumentIds: selectedDocs  // Filter RAG context
    });
    
    setMessages([...messages, {
      role: 'user',
      content: message
    }, {
      role: 'assistant',
      content: response.data.response
    }]);
  };
  
  return (
    <div>
      <DocumentList 
        documents={documents}
        selectedDocs={selectedDocs}
        onSelect={setSelectedDocs}
      />
      <ChatMessages messages={messages} />
      <ChatInput onSend={handleSendMessage} />
    </div>
  );
};
```

---

## 🔧 Configuration

### Environment Variables

```env
# Google Gemini AI
GOOGLE_API_KEY=your-gemini-api-key

# ChromaDB
CHROMA_URL=http://chromadb:8000

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_CHATBOT_DOCUMENTS=chatbot-documents
```

### Gemini Models Configuration

```javascript
// Embedding Model
embedModel: 'text-embedding-004'
- Output dimensions: 768
- Max input tokens: 2048

// Chat Model  
chatModel: 'gemma-3-4b-it'
- Temperature: 0.7
- Top K: 40
- Top P: 0.95
- Max output tokens: 2048
```

### ChromaDB Configuration

```javascript
// Collection naming
Collection name: kb_user_{userId}

// Query settings
nResults: 5              // Top K results
distance_function: "cosine"  // Similarity metric

// Filtering
where: { 
  documentId: { $in: selectedDocumentIds }
}
```

---

## 📊 Performance & Scalability

### Optimization Techniques

1. **Parallel Embedding Generation**
   ```javascript
   // Generate embeddings for multiple chunks in parallel
   const embeddings = await Promise.all(
     chunks.map(chunk => geminiService.generateEmbedding(chunk.text))
   );
   ```

2. **Background Processing**
   ```javascript
   // Upload returns immediately, processing happens in background
   setImmediate(async () => {
     await processAndIndexDocument(document);
   });
   ```

3. **Chunking Strategy**
   ```javascript
   // Optimal chunk size for balance between context and relevance
   chunkSize: 1000 characters
   overlap: 200 characters  // Optional overlap for context preservation
   ```

4. **Caching**
   ```javascript
   // Cache embeddings để tránh regenerate
   // Cache search results cho same query
   ```

### Scalability Considerations

- **ChromaDB**: Supports millions of vectors per collection
- **MongoDB**: Indexed queries for fast retrieval
- **MinIO**: Distributed object storage
- **Gemini API**: Rate limits apply (check quota)

---

## 🐛 Common Issues & Solutions

### Issue 1: "Document processing failed"
```
Cause: PDF parsing error hoặc Gemini API quota exceeded
Solution: 
- Check PDF file integrity
- Verify Gemini API key và quota
- Check ChromaDB connection
```

### Issue 2: "No relevant context found"
```
Cause: Query không match với document content
Solution:
- Improve chunk size
- Use better chunking strategy với overlap
- Adjust topK parameter (increase from 5 to 10)
```

### Issue 3: "ChromaDB connection refused"
```
Cause: ChromaDB service not running
Solution:
docker-compose restart chromadb
```

---

## 🎯 Best Practices

1. **Document Chunking**
   - Size: 500-1500 characters
   - Preserve sentence boundaries
   - Add overlap between chunks (10-20%)

2. **RAG Prompt Engineering**
   - Clear system instructions
   - Relevant context only (top 3-5 chunks)
   - Include chat history for context

3. **Error Handling**
   - Graceful fallback when no context found
   - Retry logic for API calls
   - User-friendly error messages

4. **Security**
   - Validate file types (PDF only)
   - Limit file size (10MB)
   - User isolation (separate collections)

---

## 📚 References

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [RAG Pattern Guide](https://www.pinecone.io/learn/retrieval-augmented-generation/)

---

**Last Updated**: December 23, 2025
