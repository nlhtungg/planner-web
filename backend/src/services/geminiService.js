const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ChromaClient } = require('chromadb');
const logger = require('../utils/logger').child({ module: 'services/geminiService' });

/**
 * Gemini AI Service with RAG
 * Handles embeddings, vector search, and chat with context
 */
class GeminiService {
  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY;
    if (!this.apiKey) {
      throw new Error('GOOGLE_API_KEY is not configured');
    }

    const maskedKey = `${this.apiKey.substring(0, 10)}...${this.apiKey.substring(this.apiKey.length - 4)}`;
    logger.info({
      apiKeyPreview: maskedKey,
      chatModel: 'gemma-3-4b-it',
      embedModel: 'text-embedding-004',
    }, 'Gemini service configured');

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.embedModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    this.chatModel = this.genAI.getGenerativeModel({
      model: 'gemma-3-4b-it',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    const chromaUrl = process.env.CHROMA_URL || 'http://chromadb:8000';
    this.chromaClient = new ChromaClient({ path: chromaUrl });
  }

  /**
   * Generate embeddings for text using Gemini
   */
  async generateEmbedding(text) {
    try {
      const result = await this.embedModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      logger.error({ err: error }, 'Error generating embedding');
      throw error;
    }
  }

  /**
   * Create or get ChromaDB collection for user
   */
  async getOrCreateCollection(userId) {
    const collectionName = `kb_user_${userId}`;
    try {
      return await this.chromaClient.getOrCreateCollection({
        name: collectionName,
        metadata: { userId: userId.toString() },
      });
    } catch (error) {
      logger.error({ err: error, userId, collectionName }, 'Error creating collection');
      throw error;
    }
  }

  /**
   * Add document chunks to ChromaDB with embeddings
   */
  async addDocumentToVectorDB(userId, documentId, chunks) {
    try {
      logger.info({
        userId: userId.toString(),
        documentId,
        chunkCount: chunks.length,
      }, 'Starting document embedding workflow');

      const collection = await this.getOrCreateCollection(userId);

      const startTime = Date.now();
      const embeddings = await Promise.all(
        chunks.map((chunk, idx) => {
          if ((idx + 1) % 5 === 0) {
            logger.debug({
              documentId,
              processed: idx + 1,
              total: chunks.length,
            }, 'Embedding progress');
          }
          return this.generateEmbedding(chunk.text);
        }),
      );
      const embeddingTimeSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));

      const ids = chunks.map((chunk, idx) => chunk.id || `${documentId}_chunk_${idx}`);
      const documents = chunks.map((chunk) => chunk.text);
      const metadatas = chunks.map((chunk, idx) => ({
        documentId,
        chunkIndex: idx,
        pageNumber: chunk.pageNumber || 0,
        ...(chunk.metadata || {}),
      }));

      await collection.add({
        ids,
        embeddings,
        documents,
        metadatas,
      });

      logger.info({
        userId: userId.toString(),
        documentId,
        chunkCount: chunks.length,
        vectorCount: ids.length,
        embeddingTimeSeconds,
      }, 'Stored document embeddings in ChromaDB');

      return ids;
    } catch (error) {
      logger.error({ err: error, userId, documentId }, 'Error adding document to vector DB');
      throw error;
    }
  }

  /**
   * Search for relevant document chunks
   */
  async searchSimilarChunks(userId, query, topK = 5, selectedDocumentIds = null) {
    try {
      const collection = await this.getOrCreateCollection(userId);
      const queryEmbedding = await this.generateEmbedding(query);

      const queryOptions = {
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
      };

      if (selectedDocumentIds && selectedDocumentIds.length > 0) {
        queryOptions.where = {
          documentId: { $in: selectedDocumentIds },
        };
      }

      logger.info({
        userId: userId.toString(),
        topK,
        hasDocumentFilter: Boolean(selectedDocumentIds?.length),
        selectedDocumentCount: selectedDocumentIds?.length || 0,
        queryPreview: query.substring(0, 50),
      }, 'Searching similar chunks');

      const results = await collection.query(queryOptions);
      const resultCount = results.documents?.[0]?.length || 0;
      logger.info({ userId: userId.toString(), resultCount }, 'Completed vector search');

      if (!results.documents || results.documents.length === 0) {
        return [];
      }

      const chunks = [];
      for (let i = 0; i < results.documents[0].length; i += 1) {
        const metadata = results.metadatas[0][i];
        logger.debug({
          index: i,
          documentId: metadata.documentId,
          chunkIndex: metadata.chunkIndex,
        }, 'Matched vector chunk');

        chunks.push({
          text: results.documents[0][i],
          metadata,
          distance: results.distances[0][i],
        });
      }

      return chunks;
    } catch (error) {
      logger.error({ err: error, userId }, 'Error searching vector DB');
      return [];
    }
  }

  /**
   * Generate chat response with RAG context
   */
  async generateChatResponse(userId, userMessage, chatHistory = [], selectedDocumentIds = null) {
    try {
      const relevantChunks = await this.searchSimilarChunks(
        userId,
        userMessage,
        5,
        selectedDocumentIds,
      );

      let context = '';
      const sources = [];

      if (relevantChunks.length > 0) {
        context = 'Dua vao thong tin sau de tra loi cau hoi:\n\n';
        relevantChunks.forEach((chunk) => {
          context += `${chunk.text}\n\n`;
          sources.push({
            documentId: chunk.metadata.documentId,
            chunkIndex: chunk.metadata.chunkIndex,
            relevance: 1 - (chunk.distance || 0),
          });
        });
      }

      const systemPrompt = `Ban la tro ly AI thong minh, ho tro nguoi dung tra loi cau hoi dua tren tai lieu duoc cung cap.

Quy tac:
1. Tra loi bang tieng Viet, suc tich va ro rang
2. Neu co context tu tai lieu, uu tien su dung thong tin do
3. Neu khong tim thay thong tin trong tai lieu, hay thong bao va dua ra cau tra loi chung
4. Neu khong chac chan, hay noi ro

${context || 'Hien tai chua co tai lieu tham khao. Hay tra loi dua tren kien thuc chung.'}`;

      const messages = [
        { role: 'user', parts: [{ text: systemPrompt }] },
      ];

      const recentHistory = chatHistory.slice(-5);
      recentHistory.forEach((message) => {
        messages.push({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        });
      });

      messages.push({
        role: 'user',
        parts: [{ text: userMessage }],
      });

      const chat = this.chatModel.startChat({ history: messages.slice(0, -1) });
      const result = await chat.sendMessage(userMessage);
      const response = result.response.text();

      return {
        response,
        sources,
      };
    } catch (error) {
      logger.error({ err: error, userId }, 'Error generating chat response');
      throw error;
    }
  }

  /**
   * Delete user's collection from ChromaDB
   */
  async deleteUserCollection(userId) {
    try {
      const collectionName = `kb_user_${userId}`;
      await this.chromaClient.deleteCollection({ name: collectionName });
      logger.info({ userId: userId.toString(), collectionName }, 'Deleted user collection');
    } catch (error) {
      logger.error({ err: error, userId }, 'Error deleting collection');
    }
  }

  /**
   * Generate text response using Gemini (for workspace insights)
   */
  async generateText(prompt, chatHistory = []) {
    try {
      const messages = [];

      const recentHistory = chatHistory.slice(-5);
      recentHistory.forEach((message) => {
        messages.push({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        });
      });

      const chat = this.chatModel.startChat({ history: messages });
      const result = await chat.sendMessage(prompt);
      return result.response.text();
    } catch (error) {
      logger.error({ err: error }, 'Error generating text with Gemini');
      throw error;
    }
  }
}

module.exports = new GeminiService();
