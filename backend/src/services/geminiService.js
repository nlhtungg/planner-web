const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ChromaClient } = require('chromadb');

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
    
    // Log API key info (masked for security)
    const maskedKey = this.apiKey.substring(0, 10) + '...' + this.apiKey.substring(this.apiKey.length - 4);
    console.log('='.repeat(50));
    console.log(`🔑 Gemini API Key: ${maskedKey}`);
    console.log(`🤖 Chat Model: gemma-3-4b-it`);
    console.log(`📝 Embed Model: text-embedding-004`);
    console.log('='.repeat(50));
    
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.embedModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    this.chatModel = this.genAI.getGenerativeModel({ 
      model: 'gemma-3-4b-it',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });
    
    // Initialize ChromaDB client
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
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Create or get ChromaDB collection for user
   */
  async getOrCreateCollection(userId) {
    const collectionName = `kb_user_${userId}`;
    try {
      const collection = await this.chromaClient.getOrCreateCollection({
        name: collectionName,
        metadata: { userId: userId.toString() }
      });
      return collection;
    } catch (error) {
      console.error('Error creating collection:', error);
      throw error;
    }
  }

  /**
   * Add document chunks to ChromaDB with embeddings
   */
  async addDocumentToVectorDB(userId, documentId, chunks) {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('🔄 [EMBEDDING] Starting document processing');
      console.log('📋 Document ID:', documentId);
      console.log('📦 Total chunks:', chunks.length);
      console.log('='.repeat(60));
      
      const collection = await this.getOrCreateCollection(userId);
      
      // Generate embeddings for all chunks
      console.log('🧠 [EMBEDDING] Generating embeddings for', chunks.length, 'chunks...');
      const startTime = Date.now();
      const embeddings = await Promise.all(
        chunks.map((chunk, idx) => {
          if ((idx + 1) % 5 === 0) {
            console.log(`   Progress: ${idx + 1}/${chunks.length} chunks processed`);
          }
          return this.generateEmbedding(chunk.text);
        })
      );
      const embeddingTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ [EMBEDDING] Generated ${embeddings.length} embeddings in ${embeddingTime}s`);

      // Prepare data for ChromaDB
      const ids = chunks.map((_, idx) => `${documentId}_chunk_${idx}`);
      const documents = chunks.map(chunk => chunk.text);
      const metadatas = chunks.map((chunk, idx) => ({
        documentId,
        chunkIndex: idx,
        pageNumber: chunk.pageNumber || 0
      }));

      // Add to ChromaDB
      console.log('💾 [CHROMADB] Saving to vector database...');
      await collection.add({
        ids,
        embeddings,
        documents,
        metadatas
      });

      console.log('✅ [CHROMADB] Saved successfully!');
      console.log('📊 Summary:');
      console.log('   - Document ID:', documentId);
      console.log('   - Chunks stored:', chunks.length);
      console.log('   - Vector IDs:', ids.length);
      console.log('='.repeat(60) + '\n');
      return ids;
    } catch (error) {
      console.error('Error adding to vector DB:', error);
      throw error;
    }
  }

  /**
   * Search for relevant document chunks
   */
  async searchSimilarChunks(userId, query, topK = 5, selectedDocumentIds = null) {
    try {
      const collection = await this.getOrCreateCollection(userId);
      
      // Log selected documents for debugging
      console.log('🔍 Search Query:', query.substring(0, 50) + '...');
      console.log('📋 Selected Document IDs:', selectedDocumentIds);
      
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      // Build query options
      const queryOptions = {
        queryEmbeddings: [queryEmbedding],
        nResults: topK
      };

      // Filter by selected documents if provided
      if (selectedDocumentIds && selectedDocumentIds.length > 0) {
        queryOptions.where = {
          documentId: { $in: selectedDocumentIds }
        };
        console.log('✅ Applying document filter:', selectedDocumentIds);
      } else {
        console.log('⚠️ No document filter - searching all documents');
      }

      // Search in ChromaDB
      const results = await collection.query(queryOptions);
      
      console.log('📊 Search results count:', results.documents[0]?.length || 0);

      // Format results
      if (!results.documents || results.documents.length === 0) {
        return [];
      }

      const chunks = [];
      for (let i = 0; i < results.documents[0].length; i++) {
        const metadata = results.metadatas[0][i];
        console.log(`  📄 Chunk ${i + 1}: Document ID = ${metadata.documentId}`);
        chunks.push({
          text: results.documents[0][i],
          metadata: metadata,
          distance: results.distances[0][i]
        });
      }

      return chunks;
    } catch (error) {
      console.error('Error searching vector DB:', error);
      return [];
    }
  }

  /**
   * Generate chat response with RAG context
   */
  async generateChatResponse(userId, userMessage, chatHistory = [], selectedDocumentIds = null) {
    try {
      // Search for relevant context from selected documents only
      const relevantChunks = await this.searchSimilarChunks(
        userId, 
        userMessage, 
        5,
        selectedDocumentIds
      );

      // Build context from relevant chunks
      let context = '';
      const sources = [];
      
      if (relevantChunks.length > 0) {
        context = 'Dựa vào thông tin sau để trả lời câu hỏi:\n\n';
        relevantChunks.forEach((chunk, idx) => {
          context += `[Nguồn ${idx + 1}]:\n${chunk.text}\n\n`;
          sources.push({
            documentId: chunk.metadata.documentId,
            chunkIndex: chunk.metadata.chunkIndex,
            relevance: 1 - (chunk.distance || 0)
          });
        });
      }

      // Build chat prompt
      const systemPrompt = `Bạn là trợ lý AI thông minh, hỗ trợ người dùng trả lời câu hỏi dựa trên tài liệu được cung cấp.

Quy tắc:
1. Trả lời bằng tiếng Việt, súc tích và rõ ràng
2. Nếu có context từ tài liệu, ưu tiên sử dụng thông tin đó
3. Nếu không tìm thấy thông tin trong tài liệu, hãy thông báo và đưa ra câu trả lời chung
4. Trích dẫn nguồn khi có thể (vd: "Theo tài liệu...")
5. Nếu không chắc chắn, hãy nói rõ

${context ? context : 'Hiện tại chưa có tài liệu tham khảo. Hãy trả lời dựa trên kiến thức chung.'}`;

      // Build chat messages
      const messages = [
        { role: 'user', parts: [{ text: systemPrompt }] }
      ];

      // Add chat history (last 5 messages)
      const recentHistory = chatHistory.slice(-5);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      });

      // Add current user message
      messages.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });

      // Generate response
      const chat = this.chatModel.startChat({ history: messages.slice(0, -1) });
      const result = await chat.sendMessage(userMessage);
      const response = result.response.text();

      return {
        response,
        sources: sources.slice(0, 3) // Return top 3 sources
      };
    } catch (error) {
      console.error('Error generating chat response:', error);
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
      console.log(`Deleted collection for user ${userId}`);
    } catch (error) {
      console.error('Error deleting collection:', error);
      // Don't throw - collection might not exist
    }
  }
}

module.exports = new GeminiService();
