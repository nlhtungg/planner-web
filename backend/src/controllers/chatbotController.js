const KnowledgeBase = require('../models/KnowledgeBase');
const ChatHistory = require('../models/ChatHistory');
const geminiService = require('../services/geminiService');
const documentProcessorService = require('../services/documentProcessorService');

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

      // Process based on type
      if (type === 'pdf') {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'PDF file is required'
          });
        }

        source = req.file.filename || req.file.originalname;
        metadata = {
          fileSize: req.file.size,
          mimeType: req.file.mimetype
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
        chromaCollectionId: `kb_user_${userId}`,
        status: 'processing'
      });

      await knowledgeBase.save();

      // Process in background
      setImmediate(async () => {
        try {
          console.log('\n🚀 [BACKGROUND] Starting background processing for document:', knowledgeBase._id);
          console.log('📝 Document title:', knowledgeBase.title);
          console.log('📦 Chunks to process:', documentData.chunks.length);
          
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

          console.log('\n✅ [SUCCESS] Document processing completed!');
          console.log('📄 Document ID:', knowledgeBase._id);
          console.log('📝 Title:', knowledgeBase.title);
          console.log('✅ Status: READY\n');
        } catch (error) {
          console.error('Error processing document:', error);
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
      console.error('Error uploading document:', error);
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
      console.error('Error getting documents:', error);
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

      await document.deleteOne();

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting document:', error);
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

      // Get source documents
      const sourceKnowledgeBases = [];
      if (result.sources && result.sources.length > 0) {
        const docIds = [...new Set(result.sources.map(s => s.documentId))];
        const docs = await KnowledgeBase.find({
          _id: { $in: docIds }
        }).select('_id title type');

        sourceKnowledgeBases.push(...docs.map(doc => ({
          knowledgeBaseId: doc._id,
          title: doc.title,
          relevance: result.sources.find(s => s.documentId === doc._id.toString())?.relevance || 0
        })));
      }

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
          sessionId: currentSessionId,
          sources: sourceKnowledgeBases
        }
      });
    } catch (error) {
      console.error('Error in chat:', error);
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
      console.error('Error getting chat history:', error);
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
      console.error('Error getting chat sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get chat sessions'
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
      console.error('Error deleting session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete session'
      });
    }
  }
}

module.exports = new ChatbotController();
