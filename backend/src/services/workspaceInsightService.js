const Workspace = require('../models/Workspace');
const Task = require('../models/Task');
const Post = require('../models/Post');
const PostComment = require('../models/PostComment');
const Document = require('../models/Document');
const DocumentComment = require('../models/DocumentComment');
const geminiService = require('./geminiService');

/**
 * Workspace Insight Service
 * Generate insights and summaries about workspace activities
 */
class WorkspaceInsightService {
  /**
   * Collect workspace data for RAG
   */
  async collectWorkspaceData(workspaceId, userId) {
    try {
      console.log(`📊 Collecting workspace data for: ${workspaceId}`);

      // Get workspace details
      const workspace = await Workspace.findOne({
        _id: workspaceId,
        $or: [
          { owner: userId },
          { 'members.user': userId }
        ]
      })
      .populate('owner', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email');

      if (!workspace) {
        throw new Error('Workspace not found or no access');
      }

      // Get tasks
      const tasks = await Task.find({ workspace: workspaceId })
        .populate('assignees', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(100);

      // Get recent posts
      const posts = await Post.find({ workspace: workspaceId })
        .populate('author', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(50);

      // Get recent post comments
      const postIds = posts.map(p => p._id);
      const postComments = await PostComment.find({ 
        post: { $in: postIds } 
      })
        .populate('author', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(100);

      // Get documents
      const documents = await Document.find({ workspace: workspaceId })
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(50);

      // Get document comments
      const documentIds = documents.map(d => d._id);
      const documentComments = await DocumentComment.find({
        document: { $in: documentIds }
      })
        .populate('author', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(100);

      return {
        workspace,
        tasks,
        posts,
        postComments,
        documents,
        documentComments
      };
    } catch (error) {
      console.error('Error collecting workspace data:', error);
      throw error;
    }
  }

  /**
   * Generate workspace context chunks for RAG
   */
  async generateWorkspaceChunks(workspaceData) {
    const chunks = [];
    const { workspace, tasks, posts, postComments, documents, documentComments } = workspaceData;

    // Chunk 1: Workspace Overview
    const overview = {
      id: `ws_overview_${workspace._id}`,
      text: `
# Workspace: ${workspace.name}

## Description
${workspace.description || 'No description provided'}

## Members
- Owner: ${workspace.owner.firstName} ${workspace.owner.lastName} (${workspace.owner.email})
- Total Members: ${workspace.members.length}
- Members: ${workspace.members.map(m => `${m.user.firstName} ${m.user.lastName} (${m.role})`).join(', ')}

## Status
- Created: ${workspace.createdAt.toLocaleDateString('vi-VN')}
- Last Activity: ${workspace.lastActivity ? workspace.lastActivity.toLocaleDateString('vi-VN') : 'N/A'}
- Active: ${workspace.isActive ? 'Yes' : 'No'}
      `.trim(),
      metadata: { type: 'overview', workspaceId: workspace._id.toString() }
    };
    chunks.push(overview);

    // Chunk 2: Tasks Summary
    const tasksByStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});

    const tasksByPriority = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});

    const tasksText = `
# Tasks Overview (${tasks.length} total)

## Status Distribution
${Object.entries(tasksByStatus).map(([status, count]) => `- ${status}: ${count} tasks`).join('\n')}

## Priority Distribution
${Object.entries(tasksByPriority).map(([priority, count]) => `- ${priority}: ${count} tasks`).join('\n')}

## Recent Tasks
${tasks.slice(0, 20).map(task => `
### ${task.title}
- Status: ${task.status}
- Priority: ${task.priority}
- Assigned to: ${task.assignees && task.assignees.length > 0 ? task.assignees.map(a => `${a.firstName} ${a.lastName}`).join(', ') : 'Unassigned'}
- Created by: ${task.createdBy.firstName} ${task.createdBy.lastName}
- Deadline: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : 'No deadline'}
- Description: ${task.description || 'No description'}
`).join('\n')}
    `.trim();
    chunks.push({
      id: `ws_tasks_${workspace._id}`,
      text: tasksText,
      metadata: { type: 'tasks', workspaceId: workspace._id.toString() }
    });

    // Chunk 3: Posts and Discussions
    if (posts.length > 0) {
      const postsText = `
# Recent Posts and Discussions (${posts.length} total)

${posts.slice(0, 15).map(post => {
  const comments = postComments.filter(c => c.post.toString() === post._id.toString());
  return `
## ${post.title}
- Author: ${post.author.firstName} ${post.author.lastName}
- Posted: ${post.createdAt.toLocaleDateString('vi-VN')}
- Content: ${post.content}
- Reactions: ${post.reactions ? post.reactions.length : 0}

### Comments (${comments.length})
${comments.slice(0, 5).map(c => `- ${c.author.firstName}: ${c.content}`).join('\n')}
`;
}).join('\n')}
      `.trim();
      chunks.push({
        id: `ws_posts_${workspace._id}`,
        text: postsText,
        metadata: { type: 'posts', workspaceId: workspace._id.toString() }
      });
    }

    // Chunk 4: Documents
    if (documents.length > 0) {
      const documentsText = `
# Documents (${documents.length} total)

${documents.slice(0, 20).map(doc => {
  const comments = documentComments.filter(c => c.document.toString() === doc._id.toString());
  return `
## ${doc.title}
- Created by: ${doc.createdBy.firstName} ${doc.createdBy.lastName}
- Created: ${doc.createdAt.toLocaleDateString('vi-VN')}
- Type: ${doc.fileType || 'Document'}
- Content Preview: ${doc.content ? doc.content.substring(0, 300) : 'No content'}
- Comments: ${comments.length}
${comments.length > 0 ? `\nRecent comments:\n${comments.slice(0, 3).map(c => `- ${c.author.firstName}: ${c.content}`).join('\n')}` : ''}
`;
}).join('\n')}
      `.trim();
      chunks.push({
        id: `ws_documents_${workspace._id}`,
        text: documentsText,
        metadata: { type: 'documents', workspaceId: workspace._id.toString() }
      });
    }

    return chunks;
  }

  /**
   * Index workspace data into vector database
   */
  async indexWorkspace(workspaceId, userId) {
    try {
      console.log(`🔄 Indexing workspace: ${workspaceId} for user: ${userId}`);

      // Collect data
      const workspaceData = await this.collectWorkspaceData(workspaceId, userId);
      console.log(`📦 Collected data:`, {
        workspace: workspaceData.workspace?.name,
        tasks: workspaceData.tasks?.length,
        posts: workspaceData.posts?.length,
        documents: workspaceData.documents?.length
      });

      // Generate chunks
      const chunks = await this.generateWorkspaceChunks(workspaceData);
      console.log(`📦 Generated ${chunks.length} chunks for workspace`);

      if (chunks.length === 0) {
        throw new Error('No content to index in workspace');
      }

      // Add to vector database with workspace prefix
      const documentIds = await geminiService.addDocumentToVectorDB(
        userId,
        `workspace_${workspaceId}`,
        chunks
      );

      console.log(`✅ Workspace indexed successfully`);

      return {
        success: true,
        workspaceId,
        chunksCount: chunks.length,
        documentIds
      };
    } catch (error) {
      console.error('❌ Error indexing workspace:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Query workspace insights
   */
  async queryWorkspaceInsight(workspaceId, userId, question, conversationHistory = []) {
    try {
      console.log(`💬 Querying workspace insight: ${question}`);

      // Search for relevant chunks using searchSimilarChunks
      const relevantChunks = await geminiService.searchSimilarChunks(
        userId,
        question,
        10, // Retrieve top 10 relevant chunks
        null // No document filtering - we'll filter by workspace below
      );

      console.log(`📚 Found ${relevantChunks.length} relevant chunks`);

      // Filter results to only include workspace-specific chunks
      const workspaceResults = relevantChunks.filter(
        chunk => chunk.metadata?.workspaceId === workspaceId.toString()
      );

      console.log(`🎯 Filtered to ${workspaceResults.length} workspace-specific chunks`);

      if (workspaceResults.length === 0) {
        return {
          response: 'Không tìm thấy thông tin liên quan trong workspace này. Vui lòng thử câu hỏi khác hoặc đảm bảo workspace đã được phân tích.',
          sources: []
        };
      }

      // Build context from relevant chunks
      const context = workspaceResults.map(r => r.text).join('\n\n');

      // Generate response
      const systemPrompt = `You are a workspace assistant analyzing a workspace. 
      
Provide insights, summaries, and answers based on the workspace data provided. Be specific, data-driven, and actionable. 
When discussing tasks, mention assignees, statuses, and deadlines. 
When discussing posts or comments, highlight key discussions and concerns.
Answer in Vietnamese unless asked otherwise.`;

      const prompt = `${systemPrompt}

## Workspace Context:
${context}

## Conversation History:
${conversationHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}

## User Question:
${question}

## Your Response:`;

      const response = await geminiService.generateText(prompt, conversationHistory);

      return {
        success: true,
        response: response.trim(),
        sources: workspaceResults.slice(0, 5).map(r => ({
          type: r.metadata?.type || 'unknown',
          relevance: r.score || 0
        }))
      };
    } catch (error) {
      console.error('Error querying workspace insight:', error);
      throw error;
    }
  }
}

module.exports = new WorkspaceInsightService();
