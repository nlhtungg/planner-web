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
