const Workspace = require('../models/Workspace');
const Task = require('../models/Task');
const Post = require('../models/Post');
const PostComment = require('../models/PostComment');
const Document = require('../models/Document');
const DocumentComment = require('../models/DocumentComment');
const geminiService = require('./geminiService');
const logger = require('../utils/logger').child({ module: 'services/workspaceInsightService' });

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
      logger.info({
        workspaceId: workspaceId.toString(),
        userId: userId.toString(),
      }, 'Collecting workspace data');

      const workspace = await Workspace.findOne({
        _id: workspaceId,
        $or: [
          { owner: userId },
          { 'members.user': userId },
        ],
      })
        .populate('owner', 'firstName lastName email')
        .populate('members.user', 'firstName lastName email');

      if (!workspace) {
        throw new Error('Workspace not found or no access');
      }

      const tasks = await Task.find({ workspace: workspaceId })
        .populate('assignees', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(100);

      const posts = await Post.find({ workspace: workspaceId })
        .populate('author', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(50);

      const postIds = posts.map((post) => post._id);
      const postComments = await PostComment.find({
        post: { $in: postIds },
      })
        .populate('author', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(100);

      const documents = await Document.find({ workspace: workspaceId })
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(50);

      const documentIds = documents.map((document) => document._id);
      const documentComments = await DocumentComment.find({
        document: { $in: documentIds },
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
        documentComments,
      };
    } catch (error) {
      logger.error({ err: error, workspaceId, userId }, 'Error collecting workspace data');
      throw error;
    }
  }

  /**
   * Generate workspace context chunks for RAG
   */
  async generateWorkspaceChunks(workspaceData) {
    const chunks = [];
    const {
      workspace,
      tasks,
      posts,
      postComments,
      documents,
      documentComments,
    } = workspaceData;

    const overview = {
      id: `ws_overview_${workspace._id}`,
      text: `
# Workspace: ${workspace.name}

## Description
${workspace.description || 'No description provided'}

## Members
- Owner: ${workspace.owner.firstName} ${workspace.owner.lastName} (${workspace.owner.email})
- Total Members: ${workspace.members.length}
- Members: ${workspace.members.map((member) => `${member.user.firstName} ${member.user.lastName} (${member.role})`).join(', ')}

## Status
- Created: ${workspace.createdAt.toLocaleDateString('vi-VN')}
- Last Activity: ${workspace.lastActivity ? workspace.lastActivity.toLocaleDateString('vi-VN') : 'N/A'}
- Active: ${workspace.isActive ? 'Yes' : 'No'}
      `.trim(),
      metadata: { type: 'overview', workspaceId: workspace._id.toString() },
    };
    chunks.push(overview);

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
${tasks.slice(0, 20).map((task) => `
### ${task.title}
- Status: ${task.status}
- Priority: ${task.priority}
- Assigned to: ${task.assignees && task.assignees.length > 0 ? task.assignees.map((assignee) => `${assignee.firstName} ${assignee.lastName}`).join(', ') : 'Unassigned'}
- Created by: ${task.createdBy.firstName} ${task.createdBy.lastName}
- Deadline: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : 'No deadline'}
- Description: ${task.description || 'No description'}
`).join('\n')}
    `.trim();
    chunks.push({
      id: `ws_tasks_${workspace._id}`,
      text: tasksText,
      metadata: { type: 'tasks', workspaceId: workspace._id.toString() },
    });

    if (posts.length > 0) {
      const postsText = `
# Recent Posts and Discussions (${posts.length} total)

${posts.slice(0, 15).map((post) => {
  const comments = postComments.filter((comment) => comment.post.toString() === post._id.toString());
  return `
## ${post.title}
- Author: ${post.author.firstName} ${post.author.lastName}
- Posted: ${post.createdAt.toLocaleDateString('vi-VN')}
- Content: ${post.content}
- Reactions: ${post.reactions ? post.reactions.length : 0}

### Comments (${comments.length})
${comments.slice(0, 5).map((comment) => `- ${comment.author.firstName}: ${comment.content}`).join('\n')}
`;
}).join('\n')}
      `.trim();
      chunks.push({
        id: `ws_posts_${workspace._id}`,
        text: postsText,
        metadata: { type: 'posts', workspaceId: workspace._id.toString() },
      });
    }

    if (documents.length > 0) {
      const documentsText = `
# Documents (${documents.length} total)

${documents.slice(0, 20).map((document) => {
  const comments = documentComments.filter((comment) => comment.document.toString() === document._id.toString());
  return `
## ${document.title}
- Created by: ${document.createdBy.firstName} ${document.createdBy.lastName}
- Created: ${document.createdAt.toLocaleDateString('vi-VN')}
- Type: ${document.fileType || 'Document'}
- Content Preview: ${document.content ? document.content.substring(0, 300) : 'No content'}
- Comments: ${comments.length}
${comments.length > 0 ? `\nRecent comments:\n${comments.slice(0, 3).map((comment) => `- ${comment.author.firstName}: ${comment.content}`).join('\n')}` : ''}
`;
}).join('\n')}
      `.trim();
      chunks.push({
        id: `ws_documents_${workspace._id}`,
        text: documentsText,
        metadata: { type: 'documents', workspaceId: workspace._id.toString() },
      });
    }

    return chunks;
  }

  /**
   * Index workspace data into vector database
   */
  async indexWorkspace(workspaceId, userId) {
    try {
      logger.info({
        workspaceId: workspaceId.toString(),
        userId: userId.toString(),
      }, 'Indexing workspace');

      const workspaceData = await this.collectWorkspaceData(workspaceId, userId);
      logger.debug({
        workspaceId: workspaceId.toString(),
        workspace: workspaceData.workspace?.name,
        tasks: workspaceData.tasks?.length,
        posts: workspaceData.posts?.length,
        documents: workspaceData.documents?.length,
      }, 'Collected workspace data summary');

      const chunks = await this.generateWorkspaceChunks(workspaceData);
      logger.info({
        workspaceId: workspaceId.toString(),
        chunkCount: chunks.length,
      }, 'Generated workspace chunks');

      if (chunks.length === 0) {
        throw new Error('No content to index in workspace');
      }

      const documentIds = await geminiService.addDocumentToVectorDB(
        userId,
        `workspace_${workspaceId}`,
        chunks,
      );

      logger.info({
        workspaceId: workspaceId.toString(),
        chunkCount: chunks.length,
        documentCount: documentIds.length,
      }, 'Workspace indexed successfully');

      return {
        success: true,
        workspaceId,
        chunksCount: chunks.length,
        documentIds,
      };
    } catch (error) {
      logger.error({ err: error, workspaceId, userId }, 'Error indexing workspace');
      throw error;
    }
  }

  /**
   * Query workspace insights
   */
  async queryWorkspaceInsight(workspaceId, userId, question, conversationHistory = []) {
    try {
      logger.info({
        workspaceId: workspaceId.toString(),
        userId: userId.toString(),
        questionLength: question.length,
      }, 'Querying workspace insight');

      const relevantChunks = await geminiService.searchSimilarChunks(
        userId,
        question,
        10,
        null,
      );

      logger.debug({
        workspaceId: workspaceId.toString(),
        relevantChunkCount: relevantChunks.length,
      }, 'Found relevant chunks');

      const workspaceResults = relevantChunks.filter(
        (chunk) => chunk.metadata?.workspaceId === workspaceId.toString(),
      );

      logger.info({
        workspaceId: workspaceId.toString(),
        workspaceChunkCount: workspaceResults.length,
      }, 'Filtered workspace-specific chunks');

      if (workspaceResults.length === 0) {
        return {
          response: 'Khong tim thay thong tin lien quan trong workspace nay. Vui long thu cau hoi khac hoac dam bao workspace da duoc phan tich.',
          sources: [],
        };
      }

      const context = workspaceResults.map((result) => result.text).join('\n\n');

      const systemPrompt = `You are a workspace assistant analyzing a workspace. 
      
Provide insights, summaries, and answers based on the workspace data provided. Be specific, data-driven, and actionable. 
When discussing tasks, mention assignees, statuses, and deadlines. 
When discussing posts or comments, highlight key discussions and concerns.
Answer in Vietnamese unless asked otherwise.`;

      const prompt = `${systemPrompt}

## Workspace Context:
${context}

## Conversation History:
${conversationHistory.map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`).join('\n')}

## User Question:
${question}

## Your Response:`;

      const response = await geminiService.generateText(prompt, conversationHistory);

      return {
        success: true,
        response: response.trim(),
        sources: workspaceResults.slice(0, 5).map((result) => ({
          type: result.metadata?.type || 'unknown',
          relevance: result.score || 0,
        })),
      };
    } catch (error) {
      logger.error({ err: error, workspaceId, userId }, 'Error querying workspace insight');
      throw error;
    }
  }
}

module.exports = new WorkspaceInsightService();
