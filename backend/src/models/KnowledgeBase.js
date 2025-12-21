const mongoose = require('mongoose');

/**
 * Knowledge Base Schema
 * Stores documents (PDF/URL) for RAG chatbot
 */
const knowledgeBaseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['pdf', 'url'],
    required: true
  },
  source: {
    type: String,
    required: true // File path for PDF, URL for web content
  },
  content: {
    type: String,
    required: true // Extracted text content
  },
  metadata: {
    fileSize: Number,
    mimeType: String,
    pageCount: Number,
    url: String,
    scrapedAt: Date,
    originalFilename: String
  },
  fileUrl: {
    type: String // MinIO URL for PDF files
  },
  objectName: {
    type: String // MinIO object name for deletion
  },
  chromaCollectionId: {
    type: String,
    required: true // ChromaDB collection ID for embeddings
  },
  documentIds: [{
    type: String // Array of document IDs in ChromaDB
  }],
  status: {
    type: String,
    enum: ['processing', 'ready', 'failed'],
    default: 'processing'
  },
  error: String
}, {
  timestamps: true
});

// Index for efficient queries
knowledgeBaseSchema.index({ userId: 1, status: 1 });
knowledgeBaseSchema.index({ chromaCollectionId: 1 });

const KnowledgeBase = mongoose.model('KnowledgeBase', knowledgeBaseSchema);

module.exports = KnowledgeBase;
