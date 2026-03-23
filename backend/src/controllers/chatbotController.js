const KnowledgeBase = require('../models/KnowledgeBase');
const ChatHistory = require('../models/ChatHistory');
const geminiService = require('../services/geminiService');
const documentProcessorService = require('../services/documentProcessorService');
const minioService = require('../services/minioService');
const workspaceInsightService = require('../services/workspaceInsightService');
const Workspace = require('../models/Workspace');
const Document = require('../models/Document');
const axios = require('axios');
const logger = require('../utils/logger').child({ module: 'controllers/chatbotController' });

/**
 * Generate unique session ID
 */
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
};

/**
 * Chatbot Controller
 * Handles chatbot operations with RAG
 */
class ChatbotController {
  /**
   * Upload and process document (PDF or URL)
   */
  async uploadDocument(req, res) {
    try {
      const userId = req.user._id;
      const { type, url, title } = req.body;

      if (!type || !['pdf', 'url'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid document type'
        });
      }

      let documentData;
      let source;
      let metadata = {};
      let minioResult = null;

      // Process based on type
      if (type === 'pdf') {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'PDF file is required'
          });
        }

        // Upload PDF to MinIO
        minioResult = await minioService.uploadChatbotDocument(
          userId,
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );

        source = req.file.filename || req.file.originalname;
        metadata = {
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          originalFilename: req.file.originalname
        };

        documentData = await documentProcessorService.processDocument(
          req.file.buffer,
          'pdf'
        );
      } else if (type === 'url') {
        if (!url) {
          return res.status(400).json({
            success: false,
            message: 'URL is required'
          });
        }

        source = url;
        documentData = await documentProcessorService.processDocument(url, 'url');
        metadata = {
          url,
          scrapedAt: documentData.metadata.scrapedAt
        };
      }

      // Create knowledge base entry
      const knowledgeBase = new KnowledgeBase({
        userId,
        title: type === 'pdf' ? req.file.originalname : (title || documentData.metadata.title || url),
        type,
        source,
        content: documentData.text,
        metadata: {
          ...metadata,
          pageCount: documentData.metadata.pageCount,
          chunkCount: documentData.metadata.chunkCount,
          originalFilename: type === 'pdf' ? req.file.originalname : url
        },
        fileUrl: minioResult ? minioResult.url : null,
        objectName: minioResult ? minioResult.objectName : null,
        chromaCollectionId: `kb_user_${userId}`,
        status: 'processing'
      });

      await knowledgeBase.save();

      // Process in background
      setImmediate(async () => {
        try {
          logger.info({ data: knowledgeBase._id }, '\n🚀 [BACKGROUND] Starting background processing for document:');
          logger.info({ data: knowledgeBase.title }, '📝 Document title:');
          logger.info({ data: documentData.chunks.length }, '📦 Chunks to process:');
          
          // Add to vector database
          const documentIds = await geminiService.addDocumentToVectorDB(
            userId,
            knowledgeBase._id.toString(),
            documentData.chunks
          );

          // Update knowledge base
          knowledgeBase.documentIds = documentIds;
          knowledgeBase.status = 'ready';
          await knowledgeBase.save();

          logger.info('\n✅ [SUCCESS] Document processing completed!');
          logger.info({ data: knowledgeBase._id }, '📄 Document ID:');
          logger.info({ data: knowledgeBase.title }, '📝 Title:');
          logger.info('✅ Status: READY\n');
        } catch (error) {
          logger.error({ err: error }, 'Error processing document:');
          knowledgeBase.status = 'failed';
          knowledgeBase.error = error.message;
          await knowledgeBase.save();
        }
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded and processing',
        data: {
          id: knowledgeBase._id,
          title: knowledgeBase.title,
          type: knowledgeBase.type,
          status: knowledgeBase.status
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Error uploading document:');
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload document'
      });
    }
  }

  /**
   * Get user's knowledge base documents
   */
  async getDocuments(req, res) {
    try {
      const userId = req.user._id;
      const { status } = req.query;

      const query = { userId };
      if (status) {
        query.status = status;
      }

      const documents = await KnowledgeBase.find(query)
        .sort({ createdAt: -1 })
        .select('-content -documentIds');

      res.json({
        success: true,
        data: documents
      });
    } catch (error) {
      logger.error({ err: error }, 'Error getting documents:');
      res.status(500).json({
        success: false,
        message: 'Failed to get documents'
      });
    }
  }

  /**
   * Delete a document from knowledge base
   */
  async deleteDocument(req, res) {
    try {
      const userId = req.user._id;
      const { id } = req.params;

      const document = await KnowledgeBase.findOne({ _id: id, userId });
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Delete from MinIO if it's a PDF with file URL
      if (document.type === 'pdf' && document.objectName) {
        try {
          await minioService.deleteChatbotDocument(document.objectName);
        } catch (error) {
          logger.error({ err: error }, 'Error deleting file from MinIO:');
          // Continue with deletion even if MinIO delete fails
        }
      }

      await document.deleteOne();

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      logger.error({ err: error }, 'Error deleting document:');
      res.status(500).json({
        success: false,
        message: 'Failed to delete document'
      });
    }
  }

  /**
   * Send chat message and get AI response
   */
  async chat(req, res) {
    try {
      const userId = req.user._id;
      const { message, sessionId, selectedDocumentIds } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Message is required'
        });
      }

      const currentSessionId = sessionId || generateSessionId();

      // Get chat history
      let chatHistory = await ChatHistory.findOne({
        userId,
        sessionId: currentSessionId
      });

      if (!chatHistory) {
        chatHistory = new ChatHistory({
          userId,
          sessionId: currentSessionId,
          messages: []
        });
      }

      // Get conversation history
      const conversationHistory = chatHistory.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Generate AI response with RAG
      const result = await geminiService.generateChatResponse(
        userId,
        message.trim(),
        conversationHistory,
        selectedDocumentIds
      );

      // No sources needed
      const sourceKnowledgeBases = [];

      // Add user message
      chatHistory.messages.push({
        role: 'user',
        content: message.trim(),
        timestamp: new Date()
      });

      // Add assistant response
      chatHistory.messages.push({
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        knowledgeBaseSources: sourceKnowledgeBases
      });

      await chatHistory.save();

      res.json({
        success: true,
        data: {
          response: result.response,
          sessionId: currentSessionId
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Error in chat:');
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate response'
      });
    }
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(req, res) {
    try {
      const userId = req.user._id;
      const { sessionId } = req.params;

      const chatHistory = await ChatHistory.findOne({
        userId,
        sessionId
      }).populate('messages.knowledgeBaseSources.knowledgeBaseId', 'title type');

      if (!chatHistory) {
        return res.json({
          success: true,
          data: {
            sessionId,
            messages: []
          }
        });
      }

      res.json({
        success: true,
        data: {
          sessionId: chatHistory.sessionId,
          messages: chatHistory.messages
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Error getting chat history:');
      res.status(500).json({
        success: false,
        message: 'Failed to get chat history'
      });
    }
  }

  /**
   * Get all chat sessions for user
   */
  async getChatSessions(req, res) {
    try {
      const userId = req.user._id;

      const sessions = await ChatHistory.find({ userId })
        .sort({ updatedAt: -1 })
        .select('sessionId updatedAt messages')
        .limit(50);

      const sessionList = sessions.map(session => ({
        sessionId: session.sessionId,
        lastMessage: session.messages[session.messages.length - 1]?.content.substring(0, 100) || '',
        messageCount: session.messages.length,
        lastActivity: session.updatedAt
      }));

      res.json({
        success: true,
        data: sessionList
      });
    } catch (error) {
      logger.error({ err: error }, 'Error getting chat sessions:');
      res.status(500).json({
        success: false,
        message: 'Failed to get chat sessions'
      });
    }
  }

  /**
   * Get user's workspaces
   */
  async getUserWorkspaces(req, res) {
    try {
      const userId = req.user._id;

      const workspaces = await Workspace.find({
        $or: [
          { owner: userId },
          { 'members.user': userId }
        ],
        isActive: true
      })
      .select('name description color owner')
      .sort({ lastActivity: -1 });

      res.json({
        success: true,
        data: workspaces
      });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching workspaces:');
      res.status(500).json({
        success: false,
        message: 'Failed to fetch workspaces'
      });
    }
  }

  /**
   * Get documents in a workspace
   */
  async getWorkspaceDocuments(req, res) {
    try {
      const userId = req.user._id;
      const { workspaceId } = req.params;

      // Check if user has access to workspace
      const workspace = await Workspace.findOne({
        _id: workspaceId,
        $or: [
          { owner: userId },
          { 'members.user': userId }
        ]
      });

      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found or no access'
        });
      }

      // Get documents with file attachments
      const documents = await Document.find({
        workspace: workspaceId,
        fileUrl: { $ne: null },
        fileType: { $regex: /pdf|document|text|image/i }
      })
      .select('title fileUrl fileType fileSize fileCategory createdAt')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50);

      res.json({
        success: true,
        data: documents
      });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching workspace documents:');
      res.status(500).json({
        success: false,
        message: 'Failed to fetch documents'
      });
    }
  }

  /**
   * Import document from workspace
   */
  async importFromWorkspace(req, res) {
    try {
      const userId = req.user._id;
      const { documentId } = req.body;

      if (!documentId) {
        return res.status(400).json({
          success: false,
          message: 'Document ID is required'
        });
      }

      // Get document and check access
      const document = await Document.findById(documentId).populate('workspace');
      
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Check workspace access
      const workspace = await Workspace.findOne({
        _id: document.workspace._id,
        $or: [
          { owner: userId },
          { 'members.user': userId }
        ]
      });

      if (!workspace) {
        return res.status(403).json({
          success: false,
          message: 'No access to this document'
        });
      }

      let documentData;
      let metadata = {};
      let minioResult = null;

      // Check if it's a PDF
      if (document.fileType && document.fileType.includes('pdf')) {
        // Download file from MinIO
        try {
          // Convert relative URL to full URL if needed
          let fileUrl = document.fileUrl;
          if (fileUrl.startsWith('/minio/')) {
            // Remove /minio prefix and add MinIO URL
            fileUrl = 'http://minio:9000' + fileUrl.replace('/minio', '');
          } else if (fileUrl.startsWith('http://localhost:9000')) {
            // Replace localhost with minio service name for Docker internal network
            fileUrl = fileUrl.replace('http://localhost:9000', 'http://minio:9000');
          }
          
          const response = await axios.get(fileUrl, {
            responseType: 'arraybuffer'
          });

          const fileBuffer = Buffer.from(response.data);

          // Upload to chatbot bucket
          minioResult = await minioService.uploadChatbotDocument(
            userId,
            fileBuffer,
            document.title + '.pdf',
            'application/pdf'
          );

          metadata = {
            fileSize: fileBuffer.length,
            mimeType: 'application/pdf',
            originalFilename: document.title,
            importedFrom: 'workspace',
            workspaceId: workspace._id,
            workspaceName: workspace.name
          };

          documentData = await documentProcessorService.processDocument(
            fileBuffer,
            'pdf'
          );
        } catch (error) {
          logger.error({ err: error }, 'Error downloading document:');
          return res.status(500).json({
            success: false,
            message: 'Failed to download document'
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Only PDF documents are supported for import'
        });
      }

      // Create knowledge base entry
      const knowledgeBase = new KnowledgeBase({
        userId,
        title: document.title,
        type: 'pdf',
        source: document.fileUrl,
        content: documentData.text,
        metadata: {
          ...metadata,
          pageCount: documentData.metadata.pageCount,
          chunkCount: documentData.metadata.chunkCount
        },
        fileUrl: minioResult ? minioResult.url : null,
        objectName: minioResult ? minioResult.objectName : null,
        chromaCollectionId: `kb_user_${userId}`,
        status: 'processing'
      });

      await knowledgeBase.save();

      // Process in background
      setImmediate(async () => {
        try {
          logger.info({ data: knowledgeBase._id }, '\\n🚀 [BACKGROUND] Processing imported document:');
          
          const documentIds = await geminiService.addDocumentToVectorDB(
            userId,
            knowledgeBase._id.toString(),
            documentData.chunks
          );

          knowledgeBase.documentIds = documentIds;
          knowledgeBase.status = 'ready';
          await knowledgeBase.save();

          logger.info('\\n✅ [SUCCESS] Imported document ready!');
        } catch (error) {
          logger.error({ err: error }, 'Error processing imported document:');
          knowledgeBase.status = 'failed';
          knowledgeBase.error = error.message;
          await knowledgeBase.save();
        }
      });

      res.status(201).json({
        success: true,
        message: 'Document imported and processing',
        data: {
          id: knowledgeBase._id,
          title: knowledgeBase.title,
          type: knowledgeBase.type,
          status: knowledgeBase.status
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Error importing document:');
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to import document'
      });
    }
  }

  /**
   * Delete chat session
   */
  async deleteSession(req, res) {
    try {
      const userId = req.user._id;
      const { sessionId } = req.params;

      await ChatHistory.deleteOne({ userId, sessionId });

      res.json({
        success: true,
        message: 'Chat session deleted successfully'
      });
    } catch (error) {
      logger.error({ err: error }, 'Error deleting session:');
      res.status(500).json({
        success: false,
        message: 'Failed to delete session'
      });
    }
  }

  /**
   * Index workspace for insights (RAG)
   */
  async indexWorkspace(req, res) {
    try {
      const userId = req.user._id;
      const { workspaceId } = req.params;

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Workspace ID is required'
        });
      }

      const result = await workspaceInsightService.indexWorkspace(workspaceId, userId);

      res.json({
        success: true,
        message: 'Workspace indexed successfully',
        data: result
      });
    } catch (error) {
      logger.error({ err: error }, 'Error indexing workspace:');
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to index workspace'
      });
    }
  }

  /**
   * Chat about workspace (Workspace Insights)
   */
  async chatWorkspaceInsight(req, res) {
    try {
      const userId = req.user._id;
      const { workspaceId, message, sessionId } = req.body;

      if (!workspaceId || !message || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Workspace ID and message are required'
        });
      }

      const currentSessionId = sessionId || `ws_${workspaceId}_${generateSessionId()}`;

      // Get chat history
      let chatHistory = await ChatHistory.findOne({
        userId,
        sessionId: currentSessionId
      });

      if (!chatHistory) {
        chatHistory = new ChatHistory({
          userId,
          sessionId: currentSessionId,
          messages: [],
          metadata: { workspaceId }
        });
      }

      // Get conversation history
      const conversationHistory = chatHistory.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Query workspace insight
      const result = await workspaceInsightService.queryWorkspaceInsight(
        workspaceId,
        userId,
        message.trim(),
        conversationHistory
      );

      // Add user message
      chatHistory.messages.push({
        role: 'user',
        content: message.trim(),
        timestamp: new Date()
      });

      // Add assistant response
      chatHistory.messages.push({
        role: 'assistant',
        content: result.response,
        timestamp: new Date()
      });

      await chatHistory.save();

      res.json({
        success: true,
        data: {
          response: result.response,
          sessionId: currentSessionId,
          sources: result.sources
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Error in workspace insight chat:');
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate workspace insight'
      });
    }
  }
}

module.exports = new ChatbotController();
