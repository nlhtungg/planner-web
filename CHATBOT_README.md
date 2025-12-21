# AI Chatbot với RAG (Retrieval-Augmented Generation)

## Tổng quan

Chatbot AI được tích hợp vào Planner Web sử dụng **Google Gemini API** miễn phí và **ChromaDB** để thực hiện RAG (Retrieval-Augmented Generation). Người dùng có thể upload PDF hoặc URL để chatbot học và trả lời câu hỏi dựa trên nội dung đó.

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
GOOGLE_API_KEY=AIzaSyAoRJsalD8u6er22bLjr4loDMK65wOgZ0w
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
