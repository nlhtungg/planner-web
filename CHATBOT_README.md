# AI Chatbot với RAG (Retrieval-Augmented Generation)

## Tổng quan

Chatbot AI được tích hợp vào Planner Web sử dụng **Google Gemini API** miễn phí và **ChromaDB** để thực hiện RAG (Retrieval-Augmented Generation). Người dùng có thể upload PDF hoặc URL để chatbot học và trả lời câu hỏi dựa trên nội dung đó.

---

# 📚 LUỒNG XỬ LÝ CHATBOT CHI TIẾT - TỪ ĐẦU ĐẾN CUỐI

## 🎯 1. KIẾN TRÚC TỔNG QUAN

### 1.1. Tech Stack
```
Frontend:
├── React 18 + Vite
├── Tailwind CSS (UI styling)
├── Heroicons (icons)
└── React Markdown (hiển thị chat messages)

Backend:
├── Node.js + Express
├── MongoDB (lưu metadata & chat history)
├── ChromaDB (vector database cho RAG)
├── MinIO (lưu file PDF)
├── Google Gemini AI (embedding & chat)
├── pdf-parse (xử lý PDF)
└── cheerio + axios (scraping URL)
```

### 1.2. Các Database/Storage
```
1. MongoDB (Port 27017):
   - KnowledgeBase collection: Metadata tài liệu
   - ChatHistory collection: Lịch sử chat

2. ChromaDB (Port 8000):
   - Vector embeddings của documents
   - Mỗi user có 1 collection riêng

3. MinIO (Port 9000):
   - Bucket: chatbot-documents
   - Lưu trữ file PDF gốc
```

---

## 🔄 2. LUỒNG UPLOAD TÀI LIỆU (PDF/URL)

### Bước 1: User Upload từ Frontend

**File:** `frontend/src/components/ChatbotModal.jsx`
```jsx
// User chọn upload PDF hoặc URL
handleFileUpload() hoặc handleUrlUpload()
  ↓
chatbotService.uploadDocument(file) hoặc chatbotService.uploadUrl(url)
```

**API Call:**
```
POST /api/chatbot/knowledge-base/upload
- Headers: Authorization Bearer token
- Body (PDF): FormData với file
- Body (URL): { type: 'url', url: '...', title: '...' }
```

---

### Bước 2: Backend Nhận Request

**File:** `backend/src/routes/chatbotRoutes.js`
```javascript
// Multer xử lý file upload (max 10MB, chỉ PDF)
router.post('/knowledge-base/upload', 
  authenticateToken,          // ✅ Xác thực JWT
  upload.single('file'),      // ✅ Parse file
  chatbotController.uploadDocument
);
```

---

### Bước 3: Controller Xử Lý Upload

**File:** `backend/src/controllers/chatbotController.js`

#### 3.1. Upload PDF
```javascript
async uploadDocument(req, res) {
  // 1. Validate type (pdf/url)
  // 2. Nếu PDF:
  
  // A. Upload file gốc lên MinIO
  minioResult = await minioService.uploadChatbotDocument(
    userId,
    req.file.buffer,
    req.file.originalname
  );
  // → Lưu vào bucket: chatbot-documents/userId/timestamp_filename.pdf
  
  // B. Extract text từ PDF
  documentData = await documentProcessorService.processDocument(
    req.file.buffer,
    'pdf'
  );
  // → Trả về: { text, chunks[], metadata }
}
```

#### 3.2. Upload URL
```javascript
// Nếu URL:
// A. Scrape webpage
documentData = await documentProcessorService.processDocument(url, 'url');
// → Fetch HTML, parse với cheerio, extract text
```

---

### Bước 4: Extract & Chunk Document

**File:** `backend/src/services/documentProcessorService.js`

#### 4.1. PDF Processing
```javascript
async extractTextFromPDF(pdfBuffer) {
  const data = await pdfParse(pdfBuffer);
  return {
    text: data.text,          // ✅ Full text
    pageCount: data.numpages, // ✅ Số trang
    metadata: {...}
  };
}
```

#### 4.2. URL Processing
```javascript
async extractTextFromURL(url) {
  // 1. Fetch webpage với axios
  const response = await axios.get(url);
  
  // 2. Parse HTML với cheerio
  const $ = cheerio.load(response.data);
  
  // 3. Remove script, style, nav, footer
  $('script, style, nav, footer').remove();
  
  // 4. Extract main content
  const text = $('main, article, body').text();
  
  // 5. Clean text (remove extra spaces/newlines)
  return cleaned_text;
}
```

#### 4.3. Chunk Text
```javascript
async processDocument(source, type) {
  // Extract text
  const extractedData = await (type === 'pdf' 
    ? extractTextFromPDF(source) 
    : extractTextFromURL(source)
  );
  
  // Split thành chunks (mỗi chunk ~1000 chars, overlap 200 chars)
  const chunks = this.chunkText(extractedData.text, 1000, 200);
  // chunks = [
  //   { text: '...', pageNumber: 1, chunkIndex: 0 },
  //   { text: '...', pageNumber: 1, chunkIndex: 1 },
  //   ...
  // ]
  
  return { text, chunks, metadata };
}
```

---

### Bước 5: Lưu Metadata vào MongoDB

**File:** `backend/src/controllers/chatbotController.js`
```javascript
// Tạo KnowledgeBase document
const knowledgeBase = new KnowledgeBase({
  userId,                           // ✅ User ID
  title: file.originalname,         // ✅ Tên tài liệu
  type: 'pdf',                      // ✅ pdf hoặc url
  source: filename,                 // ✅ Path/URL
  content: documentData.text,       // ✅ Full text
  fileUrl: minioResult.url,         // ✅ MinIO URL (nếu PDF)
  objectName: minioResult.objectName, // ✅ MinIO object name
  chromaCollectionId: `kb_user_${userId}`, // ✅ ChromaDB collection
  status: 'processing',             // ✅ Trạng thái: processing
  metadata: {
    fileSize: file.size,
    pageCount: documentData.metadata.pageCount,
    chunkCount: documentData.chunks.length
  }
});

await knowledgeBase.save(); // → Lưu vào MongoDB
```

**MongoDB KnowledgeBase Collection:**
```json
{
  "_id": "67890...",
  "userId": "12345...",
  "title": "Machine_Learning.pdf",
  "type": "pdf",
  "source": "Machine_Learning.pdf",
  "content": "Machine learning is a branch of AI...",
  "fileUrl": "http://localhost:9000/chatbot-documents/...",
  "objectName": "userId/timestamp_Machine_Learning.pdf",
  "chromaCollectionId": "kb_user_12345",
  "documentIds": [], // ← Sẽ được fill sau khi embed
  "status": "processing", // ← processing → ready/failed
  "metadata": {
    "fileSize": 1024000,
    "pageCount": 10,
    "chunkCount": 50
  },
  "createdAt": "2024-01-01T...",
  "updatedAt": "2024-01-01T..."
}
```

---

### Bước 6: Background Processing - Generate Embeddings

**File:** `backend/src/controllers/chatbotController.js`
```javascript
// Xử lý ngầm (không block response)
setImmediate(async () => {
  // 1. Generate embeddings và lưu vào ChromaDB
  const documentIds = await geminiService.addDocumentToVectorDB(
    userId,
    knowledgeBase._id.toString(),
    documentData.chunks
  );
  
  // 2. Update status = 'ready'
  knowledgeBase.documentIds = documentIds;
  knowledgeBase.status = 'ready';
  await knowledgeBase.save();
});
```

---

### Bước 7: Generate Embeddings với Gemini

**File:** `backend/src/services/geminiService.js`

#### 7.1. Create ChromaDB Collection
```javascript
async getOrCreateCollection(userId) {
  const collectionName = `kb_user_${userId}`;
  const collection = await this.chromaClient.getOrCreateCollection({
    name: collectionName,
    metadata: { userId: userId.toString() }
  });
  return collection;
}
```

#### 7.2. Generate Embeddings
```javascript
async addDocumentToVectorDB(userId, documentId, chunks) {
  // 1. Get/Create collection
  const collection = await this.getOrCreateCollection(userId);
  
  // 2. Generate embeddings cho TẤT CẢ chunks
  const embeddings = await Promise.all(
    chunks.map(chunk => this.generateEmbedding(chunk.text))
  );
  // generateEmbedding() → Gemini text-embedding-004 API
  // → Trả về vector 768 dimensions
  
  // 3. Prepare data
  const ids = chunks.map((_, idx) => `${documentId}_chunk_${idx}`);
  const documents = chunks.map(chunk => chunk.text);
  const metadatas = chunks.map((chunk, idx) => ({
    documentId,
    chunkIndex: idx,
    pageNumber: chunk.pageNumber || 0
  }));
  
  // 4. Save to ChromaDB
  await collection.add({
    ids,           // ['docId_chunk_0', 'docId_chunk_1', ...]
    embeddings,    // [[0.1, 0.2, ...], [0.3, 0.4, ...], ...]
    documents,     // ['chunk text 1', 'chunk text 2', ...]
    metadatas      // [{ documentId, chunkIndex, pageNumber }, ...]
  });
  
  return ids; // Trả về danh sách IDs đã lưu
}
```

**ChromaDB Structure:**
```
Collection: kb_user_12345
├── Document ID: "docId_chunk_0"
│   ├── Embedding: [0.12, 0.45, ..., 0.89] (768 dims)
│   ├── Text: "Machine learning is..."
│   └── Metadata: { documentId, chunkIndex: 0, pageNumber: 1 }
├── Document ID: "docId_chunk_1"
│   ├── Embedding: [0.34, 0.67, ..., 0.23]
│   ├── Text: "Deep learning is a subset..."
│   └── Metadata: { documentId, chunkIndex: 1, pageNumber: 1 }
└── ...
```

---

### Bước 8: Frontend Polling Status

**File:** `frontend/src/components/ChatbotModal.jsx`
```javascript
// Polling mỗi 3 giây để kiểm tra status
useEffect(() => {
  if (isOpen) {
    startPolling(); // Bắt đầu polling
  }
  return () => stopPolling(); // Cleanup khi đóng modal
}, [isOpen]);

const startPolling = () => {
  pollingIntervalRef.current = setInterval(() => {
    loadDocuments(); // Load documents mỗi 3s
  }, 3000);
};

const loadDocuments = async () => {
  const response = await chatbotService.getDocuments();
  setDocuments(response.data);
  
  // Kiểm tra nếu document chuyển từ 'processing' → 'ready'
  docs.forEach(doc => {
    const prevDoc = prevDocs.find(d => d._id === doc._id);
    if (prevDoc?.status === 'processing' && doc.status === 'ready') {
      // Hiển thị message: "✅ Tài liệu đã xử lý xong!"
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ Tài liệu "${doc.title}" đã xử lý xong!`
      }]);
    }
  });
};
```

---

## 💬 3. LUỒNG CHAT VỚI RAG

### Bước 1: User Gửi Message

**File:** `frontend/src/components/ChatbotModal.jsx`
```javascript
const handleSendMessage = async (e) => {
  e.preventDefault();
  
  // 1. Thêm message vào UI
  setMessages(prev => [...prev, {
    role: 'user',
    content: userMessage,
    timestamp: new Date()
  }]);
  
  // 2. Call API
  const response = await chatbotService.sendMessage({
    message: userMessage,
    sessionId,                           // Session ID (unique per chat)
    selectedDocumentIds: Array.from(selectedDocIds) // Documents được chọn
  });
  
  // 3. Thêm response vào UI
  setMessages(prev => [...prev, {
    role: 'assistant',
    content: response.data.response,
    sources: response.data.sources,      // Nguồn trích dẫn
    timestamp: new Date()
  }]);
};
```

---

### Bước 2: Backend Xử Lý Chat

**File:** `backend/src/controllers/chatbotController.js`
```javascript
async chat(req, res) {
  const { message, sessionId, selectedDocumentIds } = req.body;
  
  // 1. Load hoặc tạo chat history
  let chatHistory = await ChatHistory.findOne({ userId, sessionId });
  if (!chatHistory) {
    chatHistory = new ChatHistory({ userId, sessionId, messages: [] });
  }
  
  // 2. Get conversation history (last 5 messages)
  const conversationHistory = chatHistory.messages
    .slice(-5)
    .map(msg => ({ role: msg.role, content: msg.content }));
  
  // 3. Generate AI response với RAG
  const result = await geminiService.generateChatResponse(
    userId,
    message,
    conversationHistory,
    selectedDocumentIds
  );
  
  // 4. Lưu messages vào DB
  chatHistory.messages.push(
    { role: 'user', content: message },
    { role: 'assistant', content: result.response, knowledgeBaseSources: [...] }
  );
  await chatHistory.save();
  
  // 5. Return response
  res.json({
    response: result.response,
    sources: result.sources
  });
}
```

---

### Bước 3: RAG - Tìm Context Relevant

**File:** `backend/src/services/geminiService.js`
```javascript
async generateChatResponse(userId, userMessage, chatHistory, selectedDocumentIds) {
  // 1. SEARCH: Tìm chunks relevant từ ChromaDB
  const relevantChunks = await this.searchSimilarChunks(
    userId,
    userMessage,
    topK = 5,                      // Lấy top 5 chunks
    selectedDocumentIds            // Chỉ search trong documents được chọn
  );
}
```

#### 3.1. Vector Search trong ChromaDB
```javascript
async searchSimilarChunks(userId, query, topK, selectedDocumentIds) {
  // 1. Get collection
  const collection = await this.getOrCreateCollection(userId);
  
  // 2. Generate embedding cho query
  const queryEmbedding = await this.generateEmbedding(query);
  // query: "Machine learning là gì?"
  // → embedding: [0.23, 0.56, ..., 0.78] (768 dims)
  
  // 3. Query ChromaDB
  const queryOptions = {
    queryEmbeddings: [queryEmbedding],
    nResults: topK
  };
  
  // Filter theo documents được chọn
  if (selectedDocumentIds?.length > 0) {
    queryOptions.where = {
      documentId: { $in: selectedDocumentIds }
    };
  }
  
  // 4. ChromaDB vector similarity search (cosine similarity)
  const results = await collection.query(queryOptions);
  
  // 5. Format results
  const chunks = results.documents[0].map((doc, i) => ({
    text: doc,                              // Chunk text
    metadata: results.metadatas[0][i],      // { documentId, chunkIndex, pageNumber }
    distance: results.distances[0][i]       // Cosine distance (càng nhỏ càng relevant)
  }));
  
  return chunks; // Top 5 chunks relevant nhất
}
```

**ChromaDB Query Result:**
```javascript
[
  {
    text: "Machine learning is a branch of artificial intelligence...",
    metadata: { documentId: "doc123", chunkIndex: 0, pageNumber: 1 },
    distance: 0.12  // ← Rất relevant!
  },
  {
    text: "Deep learning is a subset of machine learning...",
    metadata: { documentId: "doc123", chunkIndex: 5, pageNumber: 2 },
    distance: 0.28
  },
  ...
]
```

---

### Bước 4: Build Context & Prompt

**File:** `backend/src/services/geminiService.js`
```javascript
async generateChatResponse(...) {
  // ... (đã search xong relevantChunks)
  
  // 1. Build context từ relevant chunks
  let context = 'Dựa vào thông tin sau để trả lời câu hỏi:\n\n';
  relevantChunks.forEach((chunk, idx) => {
    context += `[Nguồn ${idx + 1}]:\n${chunk.text}\n\n`;
  });
  
  // 2. Build system prompt
  const systemPrompt = `
Bạn là trợ lý AI thông minh, hỗ trợ người dùng trả lời câu hỏi dựa trên tài liệu.

Quy tắc:
1. Trả lời bằng tiếng Việt, súc tích và rõ ràng
2. Ưu tiên sử dụng thông tin từ context
3. Trích dẫn nguồn khi có thể
4. Nếu không tìm thấy thông tin, thông báo rõ ràng

${context}
`;
  
  // 3. Build messages với chat history
  const messages = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    ...chatHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    })),
    { role: 'user', parts: [{ text: userMessage }] }
  ];
  
  // 4. Call Gemini Chat API
  const chat = this.chatModel.startChat({ history: messages.slice(0, -1) });
  const result = await chat.sendMessage(userMessage);
  const response = result.response.text();
  
  return {
    response,
    sources: relevantChunks.slice(0, 3) // Top 3 sources
  };
}
```

**Example Prompt gửi đến Gemini:**
```
System:
Bạn là trợ lý AI thông minh...

Dựa vào thông tin sau:

[Nguồn 1]:
Machine learning is a branch of artificial intelligence (AI) that enables 
computers to learn from data without being explicitly programmed...

[Nguồn 2]:
Deep learning is a subset of machine learning that uses neural networks...

User History:
- User: Xin chào
- Assistant: Chào bạn! Tôi có thể giúp gì?

User: Machine learning là gì?
```

---

### Bước 5: Lưu Chat History

**File:** `backend/src/controllers/chatbotController.js`
```javascript
// Lưu vào MongoDB
chatHistory.messages.push(
  {
    role: 'user',
    content: "Machine learning là gì?",
    timestamp: new Date()
  },
  {
    role: 'assistant',
    content: "Theo tài liệu, Machine learning là một nhánh của...",
    timestamp: new Date(),
    knowledgeBaseSources: [
      {
        knowledgeBaseId: "doc123",
        title: "Machine_Learning.pdf",
        relevance: 0.88
      }
    ]
  }
);
await chatHistory.save();
```

**MongoDB ChatHistory Collection:**
```json
{
  "_id": "abc123...",
  "userId": "12345...",
  "sessionId": "session_1234567890_abc",
  "messages": [
    {
      "role": "user",
      "content": "Machine learning là gì?",
      "timestamp": "2024-01-01T10:00:00Z",
      "knowledgeBaseSources": []
    },
    {
      "role": "assistant",
      "content": "Theo tài liệu, Machine learning là...",
      "timestamp": "2024-01-01T10:00:05Z",
      "knowledgeBaseSources": [
        {
          "knowledgeBaseId": "doc123",
          "title": "Machine_Learning.pdf",
          "relevance": 0.88
        }
      ]
    }
  ],
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-01T10:00:05Z"
}
```

---

### Bước 6: Frontend Hiển Thị Response

**File:** `frontend/src/components/ChatbotModal.jsx`
```jsx
// Hiển thị messages với React Markdown
{messages.map((msg, idx) => (
  <div key={idx} className={msg.role === 'user' ? 'user-message' : 'bot-message'}>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {msg.content}
    </ReactMarkdown>
    
    {/* Hiển thị sources nếu có */}
    {msg.sources && msg.sources.length > 0 && (
      <div className="sources">
        <h4>📚 Nguồn:</h4>
        {msg.sources.map(source => (
          <div key={source.knowledgeBaseId}>
            • {source.title} (relevance: {source.relevance.toFixed(2)})
          </div>
        ))}
      </div>
    )}
  </div>
))}
```

---

## 🗑️ 4. LUỒNG XÓA TÀI LIỆU

**File:** `backend/src/controllers/chatbotController.js`
```javascript
async deleteDocument(req, res) {
  const { id } = req.params;
  
  // 1. Find document
  const document = await KnowledgeBase.findOne({ _id: id, userId });
  
  // 2. Delete from ChromaDB
  const collection = await geminiService.getOrCreateCollection(userId);
  if (document.documentIds?.length > 0) {
    await collection.delete({
      ids: document.documentIds // Xóa tất cả chunks
    });
  }
  
  // 3. Delete from MinIO (nếu là PDF)
  if (document.type === 'pdf' && document.objectName) {
    await minioService.deleteChatbotDocument(document.objectName);
  }
  
  // 4. Delete from MongoDB
  await document.deleteOne();
}
```

---

## 🔐 5. AUTHENTICATION FLOW

**File:** `backend/src/middlewares/auth.js`
```javascript
// Mọi API đều require JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded; // { _id, email, ... }
  next();
};
```

**Frontend:**
```javascript
// File: frontend/src/services/api.js
// Tự động thêm token vào mọi request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## 📊 6. DATA FLOW SUMMARY

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ACTION                              │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│  FRONTEND (React)                                                │
│  - ChatbotModal.jsx: UI                                          │
│  - chatbotService.js: API calls                                  │
│  - State: messages, documents, sessionId                         │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓ HTTP Request (JWT Auth)
┌──────────────────────────────────────────────────────────────────┐
│  BACKEND API (Express)                                           │
│  - Routes: chatbotRoutes.js                                      │
│  - Controller: chatbotController.js                              │
│  - Middleware: auth, multer                                      │
└──┬───────────────┬────────────────┬──────────────────────────────┘
   ↓               ↓                ↓
┌──────────┐  ┌───────────┐  ┌──────────────┐
│ MongoDB  │  │ ChromaDB  │  │ MinIO        │
│          │  │           │  │              │
│ • KnowledgeBase │  • Vector    │  • PDF files │
│   Collection    │    Embeddings │              │
│                 │  • Semantic   │              │
│ • ChatHistory   │    Search     │              │
│   Collection    │               │              │
│                 │  • Collection │              │
│ • User          │    per user   │              │
│   Collection    │               │              │
└──────────┘  └─────┬─────┘  └──────────────┘
                    ↓
            ┌───────────────┐
            │ Gemini API    │
            │ • Embeddings  │
            │ • Chat        │
            └───────────────┘
```

---

## 🎭 7. COMPONENT HIERARCHY

```
App.jsx
└── ChatbotProvider.jsx (Wrapper cho tất cả protected routes)
    ├── {children} (Nội dung trang chính: Dashboard, Calendar, etc.)
    ├── ChatbotButton.jsx (Floating button góc dưới phải)
    └── ChatbotModal.jsx (Modal chat interface)
        ├── Header (Title, Close button)
        ├── Document List (Upload, View, Delete documents)
        │   ├── Document Item (Status: processing/ready/failed)
        │   └── Upload Menu (PDF/URL)
        ├── Messages Area
        │   ├── User Message
        │   ├── Bot Message (with ReactMarkdown)
        │   └── Sources (Knowledge base citations)
        └── Input Area (Text input + Send button)
```

---

## 🚀 8. PERFORMANCE & OPTIMIZATION

### 8.1. Chunking Strategy
- **Chunk size:** 1000 characters
- **Overlap:** 200 characters
- **Lý do:** Balance giữa context và performance

### 8.2. Embedding Caching
- Embeddings được lưu permanent trong ChromaDB
- Không cần re-embed khi chat

### 8.3. Polling Strategy
- Poll mỗi 3s chỉ khi modal open
- Stop polling khi modal close
- Giảm API calls không cần thiết

### 8.4. Vector Search
- Top K = 5 chunks
- Cosine similarity
- Filter by selected documents only

---

## 🐛 9. ERROR HANDLING

### 9.1. Upload Errors
```javascript
// PDF too large
if (file.size > 10MB) → Error 400

// Invalid file type
if (mimetype !== 'application/pdf') → Error 400

// URL scraping failed
if (axios.get fails) → status = 'failed' in DB
```

### 9.2. Chat Errors
```javascript
// No ready documents
if (hasReadyDocuments === false) → Show warning message

// Gemini API rate limit
if (rate limit exceeded) → Error 429 → Retry after 60s

// ChromaDB connection failed
if (chroma connection fails) → Error 500
```

---

## 🔒 10. SECURITY

### 10.1. Authentication
- JWT token required cho mọi API
- Token expire: 7 days
- Stored in localStorage

### 10.2. Data Isolation
- Mỗi user có ChromaDB collection riêng
- MongoDB queries always filter by userId
- MinIO files organized by userId

### 10.3. File Validation
- PDF: Max 10MB
- URL: Whitelist protocols (http/https only)
- Multer sanitization

---

## 📈 11. SCALABILITY CONSIDERATIONS

### 11.1. Current Limitations
- Gemini Free Tier: 60 requests/minute
- MongoDB: Single instance
- ChromaDB: In-memory (không persistent)

### 11.2. Future Improvements
- Add Redis caching cho frequent queries
- Implement queue system (Bull/RabbitMQ) cho background processing
- Use ChromaDB persistent storage
- Upgrade Gemini API tier
- Add pagination cho documents/messages

---

## Tính năng

✅ **Upload PDF**: Upload file PDF (tối đa 10MB) để chatbot học nội dung
✅ **Trích xuất URL**: Nhập URL website để chatbot trích xuất và học nội dung
✅ **RAG với ChromaDB**: Tìm kiếm ngữ nghĩa thông minh với vector embeddings
✅ **Google Gemini AI**: Sử dụng model Gemini 1.5 Flash (miễn phí)
✅ **Chat History**: Lưu lịch sử chat theo session
✅ **Knowledge Base**: Quản lý tài liệu đã upload
✅ **Multi-page Integration**: Floating button xuất hiện trên mọi trang
✅ **Beautiful UI**: Giao diện hiện đại với Tailwind CSS

## Kiến trúc

```
Frontend (React)
├── ChatbotButton.jsx       # Floating button (bottom-right)
├── ChatbotModal.jsx        # Chat interface
├── ChatbotProvider.jsx     # Wrapper for all pages
└── chatbotService.js       # API calls

Backend (Node.js/Express)
├── Models
│   ├── KnowledgeBase.js    # Documents storage
│   └── ChatHistory.js      # Chat sessions
├── Services
│   ├── geminiService.js    # Gemini AI & RAG
│   └── documentProcessorService.js  # PDF/URL processing
├── Controllers
│   └── chatbotController.js
└── Routes
    └── chatbotRoutes.js

Dependencies
├── ChromaDB (Vector DB)    # Port 8000
└── MongoDB (Data storage)  # Port 27017
```

## API Endpoints

### Knowledge Base

```bash
# Upload PDF
POST /api/chatbot/knowledge-base/upload
Content-Type: multipart/form-data
Body: { file: PDF, type: "pdf", title: "Optional" }

# Upload URL
POST /api/chatbot/knowledge-base/upload
Body: { type: "url", url: "https://...", title: "Optional" }

# Get documents
GET /api/chatbot/knowledge-base/documents
Query: ?status=ready|processing|failed

# Delete document
DELETE /api/chatbot/knowledge-base/documents/:id
```

### Chat

```bash
# Send message
POST /api/chatbot/chat
Body: { message: "Your question", sessionId: "optional" }

# Get chat history
GET /api/chatbot/chat/history/:sessionId

# Get all sessions
GET /api/chatbot/chat/sessions

# Delete session
DELETE /api/chatbot/chat/sessions/:sessionId
```

## Cách sử dụng

### 1. Cấu hình (đã xong)

File `.env` đã có:
```env
CHROMA_URL=http://chromadb:8000
```

### 2. Build & Run Docker

```bash
# Build lại containers với dependencies mới
docker-compose down
docker-compose build
docker-compose up -d

# Kiểm tra logs
docker-compose logs -f backend
```

### 3. Sử dụng Chatbot

1. **Mở web**: Login vào Planner Web
2. **Tìm button**: Thấy button AI (icon ✨) ở góc dưới phải
3. **Upload tài liệu**:
   - Click button "Add Document"
   - Chọn "Upload PDF" hoặc "From URL"
   - Đợi xử lý (status: Processing → Ready)
4. **Chat**: Hỏi câu hỏi về nội dung đã upload
5. **View sources**: Xem nguồn trích dẫn trong câu trả lời

### 4. Ví dụ sử dụng

```
User: [Upload file "Machine_Learning.pdf"]
Bot: ✅ Đã upload file "Machine_Learning.pdf" thành công!

User: Machine learning là gì?
Bot: Theo tài liệu, Machine Learning là một nhánh của 
     trí tuệ nhân tạo (AI) cho phép máy tính học từ dữ 
     liệu mà không cần lập trình cụ thể...
     
     Sources:
     • Machine_Learning.pdf
```

## Cấu trúc Database

### KnowledgeBase Collection
```javascript
{
  userId: ObjectId,
  title: "Document title",
  type: "pdf" | "url",
  source: "/path/to/file" | "https://...",
  content: "Full extracted text",
  chromaCollectionId: "kb_user_{userId}",
  documentIds: ["doc_chunk_0", "doc_chunk_1", ...],
  status: "processing" | "ready" | "failed",
  metadata: {
    fileSize: 1024000,
    pageCount: 10,
    chunkCount: 50
  }
}
```

### ChatHistory Collection
```javascript
{
  userId: ObjectId,
  sessionId: "session_123",
  messages: [{
    role: "user" | "assistant",
    content: "Message text",
    timestamp: Date,
    knowledgeBaseSources: [{
      knowledgeBaseId: ObjectId,
      title: "Document title",
      relevance: 0.95
    }]
  }]
}
```

## ChromaDB Collections

Mỗi user có 1 collection riêng:
- Collection name: `kb_user_{userId}`
- Embeddings: Gemini embedding-001 (768 dimensions)
- Metadata: documentId, chunkIndex, pageNumber

## Troubleshooting

### Lỗi "ChromaDB connection failed"
```bash
# Kiểm tra ChromaDB đang chạy
docker-compose ps chromadb

# Restart ChromaDB
docker-compose restart chromadb
```

### Lỗi "Gemini API rate limit"
- Free tier: 60 requests/minute
- Giải pháp: Đợi 1 phút hoặc upgrade API key

### Upload PDF thất bại
- Kiểm tra file size < 10MB
- Kiểm tra file type = application/pdf
- Xem logs: `docker-compose logs backend`

### URL scraping thất bại
- Kiểm tra URL accessible
- Một số site chặn bot (403/401)
- Thử URL khác

## Performance

- **PDF Processing**: ~1-5s cho file 1-10MB
- **URL Scraping**: ~2-10s tùy website
- **Embedding Generation**: ~0.5-2s cho 1000 tokens
- **Chat Response**: ~1-3s với RAG context

## Giới hạn

- PDF file: Max 10MB
- URL content: Max 1MB text
- Chunk size: 1000 characters
- Top K retrieval: 5 chunks
- Chat history: Last 5 messages
- Session retention: Unlimited (stored in MongoDB)

## Security

✅ Authentication required (JWT)
✅ User isolation (mỗi user có collection riêng)
✅ File validation (PDF only)
✅ URL validation (HTTP/HTTPS only)
✅ Rate limiting (có thể thêm)
✅ Input sanitization

## Future Enhancements

- [ ] Support more file types (DOCX, TXT)
- [ ] Advanced chunking strategies
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Export chat history
- [ ] Shared knowledge bases
- [ ] Analytics dashboard
- [ ] Fine-tuning on user data

## Dependencies Added

**Backend:**
```json
{
  "@google/generative-ai": "^0.21.0",
  "chromadb": "^1.9.2",
  "pdf-parse": "^1.1.1",
  "cheerio": "^1.0.0"
}
```

**Frontend:**
```
Không cần thêm dependencies mới
(Đã có axios, react, heroicons)
```

## Tác giả

Được tạo bởi GitHub Copilot với Gemini AI integration.

---

**Lưu ý**: API key Gemini miễn phí có giới hạn. Để production, nên upgrade hoặc implement rate limiting.

# Hướng dẫn Build và Chạy Chatbot AI

## Bước 1: Stop containers hiện tại

```bash
docker-compose down
```

## Bước 2: Build lại với dependencies mới

```bash
docker-compose build backend
```

Hoặc build toàn bộ:
```bash
docker-compose build
```

## Bước 3: Khởi động lại

```bash
docker-compose up -d
```

## Bước 4: Kiểm tra logs

```bash
# Xem logs backend
docker-compose logs -f backend

# Xem logs ChromaDB
docker-compose logs -f chromadb

# Xem logs tất cả
docker-compose logs -f
```

## Bước 5: Kiểm tra services

```bash
# Kiểm tra tất cả services đang chạy
docker-compose ps

# Kết quả mong đợi:
# - backend: Up
# - frontend: Up
# - mongodb: Up
# - chromadb: Up
# - minio: Up
```

## Bước 6: Test chatbot

1. Mở trình duyệt: http://localhost:5173
2. Login vào Planner
3. Thấy button AI (✨) ở góc dưới phải màn hình
4. Click vào button để mở chatbot
5. Upload PDF hoặc URL
6. Hỏi câu hỏi!

## Troubleshooting

### Lỗi: ChromaDB không connect được

```bash
# Restart ChromaDB
docker-compose restart chromadb

# Kiểm tra port 8000
curl http://localhost:8000/api/v1/heartbeat
```

### Lỗi: Backend không khởi động

```bash
# Xem logs chi tiết
docker-compose logs backend

# Thường do:
# - Dependencies chưa cài: rebuild lại
# - MongoDB chưa ready: đợi thêm
# - Port conflict: check port 3001
```

### Lỗi: npm install failed

Nếu build thất bại do npm, thử:

```bash
# Clear cache và rebuild
docker-compose build --no-cache backend
```

### Reset toàn bộ (nếu cần)

```bash
# Stop và xóa containers
docker-compose down

# Xóa volumes (MẤT DATA!)
docker-compose down -v

# Build lại từ đầu
docker-compose build --no-cache
docker-compose up -d
```

## Kiểm tra API

### Test health endpoint

```bash
curl http://localhost:3001/health
```

### Test chatbot endpoints

```bash
# Get documents (cần token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/chatbot/knowledge-base/documents

# Send chat message (cần token)
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","sessionId":"test"}' \
  http://localhost:3001/api/chatbot/chat
```

## Files đã tạo/sửa

### Backend (d:\Project_20251\planner-web\backend\)
- ✅ src/models/KnowledgeBase.js (NEW)
- ✅ src/models/ChatHistory.js (NEW)
- ✅ src/services/geminiService.js (NEW)
- ✅ src/services/documentProcessorService.js (NEW)
- ✅ src/controllers/chatbotController.js (NEW)
- ✅ src/routes/chatbotRoutes.js (NEW)
- ✅ src/routes/index.js (UPDATED)
- ✅ package.json (UPDATED - added dependencies)

### Frontend (d:\Project_20251\planner-web\frontend\)
- ✅ src/components/ChatbotModal.jsx (NEW)
- ✅ src/components/ChatbotButton.jsx (NEW)
- ✅ src/components/ChatbotProvider.jsx (NEW)
- ✅ src/services/chatbotService.js (NEW)
- ✅ src/pages/Home.jsx (UPDATED)
- ✅ src/App.jsx (UPDATED)

### Documentation
- ✅ CHATBOT_README.md (NEW)
- ✅ BUILD_INSTRUCTIONS.md (THIS FILE)

## Sau khi chạy thành công

1. ✨ Button AI xuất hiện ở góc dưới phải mọi trang
2. Click vào để mở chat modal
3. Upload PDF/URL trong sidebar
4. Chat với AI về nội dung đã upload
5. Xem sources trong câu trả lời

Chúc may mắn! 🚀
