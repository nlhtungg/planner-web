import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import workspaceService from '../services/workspaceService';
import postService from '../services/postService';
import commentService from '../services/commentService';
import reactionService from '../services/reactionService';
import socketService from '../services/socketService';
import documentService from '../services/documentService';
import { getTasksByWorkspace, createTask, assignTask, unassignTask, deleteTask } from '../services/taskService';
import { Link } from 'react-router-dom';
import { percentOf } from '../utils/taskUtils';
import AddMemberModal from '../components/AddMemberModal';
import RemoveMemberModal from '../components/RemoveMemberModal';
import UserFuzzySelect from '../components/UserFuzzySelect';
import ReactionPicker from '../components/ReactionPicker';
import ReactionBar from '../components/ReactionBar';
import MentionInput from '../components/MentionInput';
import MentionText from '../components/MentionText';
import TaskAssigneeCell from '../components/TaskAssigneeCell';
import GlassPageContainer from '../components/layout/GlassPageContainer';
import GlassHeader from '../components/layout/GlassHeader';
import GlassCard from '../components/layout/GlassCard';
import {
  ArrowLeft,
  Briefcase,
  Users,
  Settings,
  Plus,
  MoreVertical,
  Clock,
  FileText,
  Calendar,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Pencil,
  Trash2,
  X,
  Send,
  Activity,
  TrendingUp,
  Target,
  Folder
} from 'lucide-react';
import DocumentList from '../components/DocumentList';

const WorkspaceDetail = () => {
  const { workspaceId } = useParams();
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // Refs to track if data has been fetched to prevent duplicate calls
  const overviewFetchedRef = React.useRef(false);
  const lastWorkspaceIdRef = React.useRef(null);

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Posts state
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostMentions, setNewPostMentions] = useState([]);
  const [newPostMentionsEveryone, setNewPostMentionsEveryone] = useState(false);
  const [createPostLoading, setCreatePostLoading] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [editPostMentions, setEditPostMentions] = useState([]);
  const [editPostMentionsEveryone, setEditPostMentionsEveryone] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(null);

  // Comments state
  const [expandedComments, setExpandedComments] = useState({}); // { [postId]: true/false }
  const [postComments, setPostComments] = useState({}); // { [postId]: [...comments] }
  const [commentsLoading, setCommentsLoading] = useState({}); // { [postId]: true/false }
  const [newCommentContent, setNewCommentContent] = useState({}); // { [postId]: 'content' }
  const [newCommentMentions, setNewCommentMentions] = useState({}); // { [postId]: [...mentions] }
  const [newCommentMentionsEveryone, setNewCommentMentionsEveryone] = useState({}); // { [postId]: boolean }
  const [commentCounts, setCommentCounts] = useState({}); // { [postId]: count }
  const [editingComment, setEditingComment] = useState(null); // commentId
  const [editCommentContent, setEditCommentContent] = useState('');
  const [editCommentMentions, setEditCommentMentions] = useState([]);
  const [editCommentMentionsEveryone, setEditCommentMentionsEveryone] = useState(false);
  const [commentDropdownOpen, setCommentDropdownOpen] = useState(null);

  // Reactions state
  const [postReactions, setPostReactions] = useState({}); // { [postId]: { summary: [...], userReaction: {...} } }
  const [commentReactions, setCommentReactions] = useState({}); // { [commentId]: { summary: [...], userReaction: {...} } }

  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);
  const [memberToChangeRole, setMemberToChangeRole] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [changingRoleLoading, setChangingRoleLoading] = useState(false);

  // Tasks state (real data)
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', priority: 'medium' });
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskFilters, setTaskFilters] = useState({ status: 'all', assignee: 'all' });

  // Documents state (real data)
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  // Edit workspace state
  const [isEditWorkspaceModalOpen, setIsEditWorkspaceModalOpen] = useState(false);
  const [editWorkspaceForm, setEditWorkspaceForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    isPublic: false
  });

  const colorOptions = [
    { value: '#3B82F6', name: 'Blue' },
    { value: '#10B981', name: 'Green' },
    { value: '#8B5CF6', name: 'Purple' },
    { value: '#F59E0B', name: 'Yellow' },
    { value: '#EF4444', name: 'Red' },
    { value: '#06B6D4', name: 'Cyan' },
    { value: '#84CC16', name: 'Lime' },
    { value: '#F97316', name: 'Orange' },
  ];

  // Memoized handlers for mention callbacks to prevent infinite re-renders
  const handleNewPostMentionsChange = useCallback((mentions, mentionsEveryone) => {
    setNewPostMentions(mentions);
    setNewPostMentionsEveryone(mentionsEveryone);
  }, []);

  const handleEditPostMentionsChange = useCallback((mentions, mentionsEveryone) => {
    setEditPostMentions(mentions);
    setEditPostMentionsEveryone(mentionsEveryone);
  }, []);

  const handleEditCommentMentionsChange = useCallback((mentions, mentionsEveryone) => {
    setEditCommentMentions(mentions);
    setEditCommentMentionsEveryone(mentionsEveryone);
  }, []);

  const handleNewCommentMentionsChange = useCallback((postId) => {
    return (mentions, mentionsEveryone) => {
      setNewCommentMentions(prev => ({ ...prev, [postId]: mentions }));
      setNewCommentMentionsEveryone(prev => ({ ...prev, [postId]: mentionsEveryone }));
    };
  }, []);

  useEffect(() => {
    fetchWorkspace();
  }, [workspaceId]);

  // Single useEffect for tab-specific data loading
  useEffect(() => {
    // Reset overview fetch flag if workspace changes
    if (lastWorkspaceIdRef.current !== workspaceId) {
      overviewFetchedRef.current = false;
      lastWorkspaceIdRef.current = workspaceId;
    }

    const loadTabData = async () => {
      if (activeTab === 'overview' && !overviewFetchedRef.current) {
        overviewFetchedRef.current = true;
        // Fetch overview data - only 3 API calls
        try {
          const [docsResponse, tasksResponse, postsResponse] = await Promise.all([
            documentService.getWorkspaceDocuments(workspaceId).catch(() => []),
            getTasksByWorkspace(workspaceId).catch(() => ({ data: [] })),
            postService.getRecentPosts(workspaceId, 5).catch(() => ({ success: false, data: [] }))
          ]);

          setDocuments(Array.isArray(docsResponse) ? docsResponse : []);
          setTasks(tasksResponse.data || []);
          if (postsResponse.success) {
            setPosts(postsResponse.data);
          }
        } catch (error) {
          console.error('Error loading overview data:', error);
        }
      } else if (activeTab === 'tasks') {
        fetchTasks();
      } else if (activeTab === 'posts') {
        fetchPosts();
      }
    };


    loadTabData();
  }, [activeTab, workspaceId]);

  // Socket.io real-time updates
  useEffect(() => {
    // Socket already connected via SocketProvider, just join workspace
    if (socketService.socket) {
      socketService.joinWorkspace(workspaceId);
    }

    // Handle new post
    const handleNewPost = (post) => {
      setPosts((prevPosts) => {
        // Prevent duplicates - check if post already exists
        if (prevPosts.some(p => p._id === post._id)) {
          return prevPosts;
        }
        return [post, ...prevPosts];
      });
    };

    // Handle post update
    const handleUpdatePost = (updatedPost) => {
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === updatedPost._id ? updatedPost : post
        )
      );
    };

    // Handle post deletion
    const handleDeletePost = (postId) => {
      setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
    };

    // Handle new comment
    const handleNewComment = ({ postId, comment }) => {
      setPostComments((prevComments) => {
        const existingComments = prevComments[postId] || [];
        // Prevent duplicates - check if comment already exists
        if (existingComments.some(c => c._id === comment._id)) {
          return prevComments;
        }
        return {
          ...prevComments,
          [postId]: [comment, ...existingComments]
        };
      });
      setCommentCounts((prevCounts) => {
        const existingComments = postComments[postId] || [];
        // Only increment if comment is new
        if (existingComments.some(c => c._id === comment._id)) {
          return prevCounts;
        }
        return {
          ...prevCounts,
          [postId]: (prevCounts[postId] || 0) + 1
        };
      });
    };

    // Handle comment update
    const handleUpdateComment = ({ postId, comment }) => {
      setPostComments((prevComments) => ({
        ...prevComments,
        [postId]: (prevComments[postId] || []).map((c) =>
          c._id === comment._id ? comment : c
        )
      }));
    };

    // Handle comment deletion
    const handleDeleteComment = ({ postId, commentId }) => {
      setPostComments((prevComments) => ({
        ...prevComments,
        [postId]: (prevComments[postId] || []).filter((c) => c._id !== commentId)
      }));
      setCommentCounts((prevCounts) => ({
        ...prevCounts,
        [postId]: Math.max((prevCounts[postId] || 0) - 1, 0)
      }));
    };

    // Register event listeners
    socketService.onNewPost(handleNewPost);
    socketService.onUpdatePost(handleUpdatePost);
    socketService.onDeletePost(handleDeletePost);
    socketService.onNewComment(handleNewComment);
    socketService.onUpdateComment(handleUpdateComment);
    socketService.onDeleteComment(handleDeleteComment);

    // Cleanup on unmount
    return () => {
      socketService.off('new-post', handleNewPost);
      socketService.off('update-post', handleUpdatePost);
      socketService.off('delete-post', handleDeletePost);
      socketService.off('new-comment', handleNewComment);
      socketService.off('update-comment', handleUpdateComment);
      socketService.off('delete-comment', handleDeleteComment);
      socketService.leaveWorkspace(workspaceId);
    };
  }, [workspaceId]);
  const fetchTasks = async () => {
    setTasksLoading(true);
    setTasksError('');
    try {
      const res = await getTasksByWorkspace(workspaceId);
      // Backend returns array of task objects
      setTasks(res.data);
    } catch (err) {
      setTasksError(err.response?.data?.message || 'Failed to load tasks');
    } finally {
      setTasksLoading(false);
    }
  };

  const openTaskModal = () => {
    setNewTask({ title: '', description: '', dueDate: '', priority: 'medium' });
    setIsTaskModalOpen(true);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title) return;
    setCreatingTask(true);
    try {
      const payload = {
        title: newTask.title,
        description: newTask.description,
        dueDate: newTask.dueDate || undefined,
        priority: newTask.priority,
        workspace: workspaceId,
        assignees: [user._id || user.id] // Auto-assign creator
      };
      const res = await createTask(payload);
      setTasks(prev => [res.data, ...prev]);
      setIsTaskModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (taskFilters.status !== 'all' && t.status !== taskFilters.status) return false;
    if (taskFilters.assignee !== 'all' && !t.assignees?.some(a => (a._id || a) === taskFilters.assignee)) return false;
    return true;
  });

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteTask(taskId);
      setTasks(prev => prev.filter(t => t._id !== taskId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleUpdateTask = (taskId) => {
    navigate(`/tasks/${taskId}`); // navigate to task detail/edit page if exists
  };

  // Edit workspace handlers
  const openEditWorkspaceModal = () => {
    setEditWorkspaceForm({
      name: workspace.name,
      description: workspace.description || '',
      color: workspace.color,
      isPublic: workspace.settings?.isPublic || false
    });
    setIsEditWorkspaceModalOpen(true);
  };

  const handleUpdateWorkspace = async (e) => {
    e.preventDefault();
    
    try {
      const updateData = {
        name: editWorkspaceForm.name.trim(),
        description: editWorkspaceForm.description.trim(),
        color: editWorkspaceForm.color,
        settings: {
          isPublic: editWorkspaceForm.isPublic
        }
      };

      const response = await workspaceService.updateWorkspace(workspaceId, updateData);
      
      if (response.success) {
        setWorkspace(response.data);
        setIsEditWorkspaceModalOpen(false);
      }
    } catch (error) {
      console.error('Update workspace error:', error);
      alert(error.response?.data?.message || 'Failed to update workspace');
    }
  };

  const fetchWorkspace = async () => {
    try {
      const response = await workspaceService.getWorkspace(workspaceId);
      if (response.success) {
        setWorkspace(response.data);
      } else {
        setError(response.message);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch workspace');
      console.error('Fetch workspace error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isOwnerOrAdmin = () => {
    if (!workspace) return false;
    const userRole = workspace.members.find(member =>
      member.user._id === user._id || member.user._id === user.id
    )?.role;
    return userRole === 'owner' || userRole === 'admin';
  };

  const isOwner = () => {
    if (!workspace) return false;
    return workspace.owner._id === user._id || workspace.owner._id === user.id;
  };

  const handleAddMember = async (memberData) => {
    setAddMemberLoading(true);
    try {
      const response = await workspaceService.addMember(workspaceId, memberData);
      if (response.success) {
        setWorkspace(response.data);
        setIsAddMemberModalOpen(false);
        // You could add a success toast here
      }
    } catch (error) {
      console.error('Add member error:', error);
      throw error; // Re-throw to let the modal handle the error
    } finally {
      setAddMemberLoading(false);
    }
  };

  const openRemoveMemberModal = (member) => {
    setMemberToRemove(member);
    setIsRemoveMemberModalOpen(true);
  };

  const handleRemoveMember = async (memberId, memberName) => {
    setRemovingMemberId(memberId);
    try {
      // Check if user is removing themselves
      const isCurrentUser = memberId === user.id || memberId === user._id?.toString();

      const response = isCurrentUser
        ? await workspaceService.leaveWorkspace(workspaceId)
        : await workspaceService.removeMember(workspaceId, memberId);

      if (response.success) {
        if (isCurrentUser) {
          // User left workspace, redirect to workspaces page
          navigate('/workspaces');
        } else {
          setWorkspace(response.data);
          setIsRemoveMemberModalOpen(false);
          setMemberToRemove(null);
        }
      }
    } catch (error) {
      console.error('Remove member error:', error);
      alert(error.response?.data?.message || 'Failed to remove member. Please try again.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const canRemoveMember = (member) => {
    // Can't remove the owner
    if (member.role === 'owner') return false;

    // User can remove themselves (leave workspace) - use email for reliable comparison
    const isCurrentUser = member.user.email === user.email;
    if (isCurrentUser) return true;

    // Only owners and admins can remove other members
    return isOwnerOrAdmin();
  };

  const canChangeRole = (member) => {
    // Can't change owner's role
    if (member.role === 'owner') return false;

    // Can't change own role
    const isCurrentUser = member.user.email === user.email;
    if (isCurrentUser) return false;

    // Only owners can change roles
    return isOwner();
  };

  const openChangeRoleModal = (member) => {
    setMemberToChangeRole(member);
    setSelectedRole(member.role);
    setIsChangeRoleModalOpen(true);
  };

  const handleChangeRole = async () => {
    if (!memberToChangeRole || !selectedRole) return;

    setChangingRoleLoading(true);
    try {
      const response = await workspaceService.updateMemberRole(
        workspaceId,
        memberToChangeRole.user._id || memberToChangeRole.user.id,
        selectedRole
      );

      if (response.success) {
        setWorkspace(response.data);
        setIsChangeRoleModalOpen(false);
        setMemberToChangeRole(null);
        setSelectedRole('');
      }
    } catch (error) {
      console.error('Change role error:', error);
      alert('Failed to change member role. Please try again.');
    } finally {
      setChangingRoleLoading(false);
    }
  };

  // Post handlers
  const fetchPosts = async () => {
    setPostsLoading(true);
    setPostsError('');
    try {
      const response = await postService.getWorkspacePosts(workspaceId);
      if (response.success) {
        setPosts(response.data);

        // Fetch comment counts and reactions for all posts
        const counts = {};
        const reactions = {};
        for (const post of response.data) {
          try {
            const [commentsResponse, reactionsResponse] = await Promise.all([
              commentService.getPostComments(workspaceId, post._id),
              reactionService.getPostReactionSummary(workspaceId, post._id)
            ]);

            if (commentsResponse.success) {
              counts[post._id] = commentsResponse.data.length;
            }

            if (reactionsResponse.success) {
              reactions[post._id] = {
                summary: reactionsResponse.data.summary,
                userReaction: reactionsResponse.data.userReaction
              };
            }
          } catch (error) {
            console.error(`Failed to fetch data for post ${post._id}:`, error);
            counts[post._id] = 0;
          }
        }
        setCommentCounts(counts);
        setPostReactions(reactions);
      } else {
        setPostsError(response.message);
      }
    } catch (error) {
      setPostsError(error.response?.data?.message || 'Failed to fetch posts');
      console.error('Fetch posts error:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    setCreatePostLoading(true);
    try {
      const response = await postService.createPost(workspaceId, {
        content: newPostContent.trim(),
        mentions: newPostMentions,
        mentionsEveryone: newPostMentionsEveryone
      });
      if (response.success) {
        setPosts([response.data, ...posts]);
        setNewPostContent('');
        setNewPostMentions([]);
        setNewPostMentionsEveryone(false);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create post');
      console.error('Create post error:', error);
    } finally {
      setCreatePostLoading(false);
    }
  };

  const handleUpdatePost = async (postId) => {
    if (!editPostContent.trim()) return;

    try {
      const response = await postService.updatePost(workspaceId, postId, {
        content: editPostContent.trim(),
        mentions: editPostMentions,
        mentionsEveryone: editPostMentionsEveryone
      });
      if (response.success) {
        setPosts(posts.map(p => p._id === postId ? response.data : p));
        setEditingPost(null);
        setEditPostContent('');
        setEditPostMentions([]);
        setEditPostMentionsEveryone(false);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update post');
      console.error('Update post error:', error);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await postService.deletePost(workspaceId, postId);
      if (response.success) {
        setPosts(posts.filter(p => p._id !== postId));
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete post');
      console.error('Delete post error:', error);
    }
  };

  const startEditingPost = (post) => {
    setEditingPost(post._id);
    setEditPostContent(post.content);
    setEditPostMentions(post.mentions || []);
    setEditPostMentionsEveryone(post.mentionsEveryone || false);
  };

  const cancelEditingPost = () => {
    setEditingPost(null);
    setEditPostContent('');
    setEditPostMentions([]);
    setEditPostMentionsEveryone(false);
  };

  // Comment handlers
  const toggleComments = async (postId) => {
    const isExpanded = expandedComments[postId];

    if (!isExpanded) {
      // Expanding - fetch comments if not already loaded
      if (!postComments[postId]) {
        await fetchComments(postId);
      }
      setExpandedComments({ ...expandedComments, [postId]: true });
    } else {
      // Collapsing
      setExpandedComments({ ...expandedComments, [postId]: false });
    }
  };

  const fetchComments = async (postId) => {
    setCommentsLoading({ ...commentsLoading, [postId]: true });
    try {
      const response = await commentService.getPostComments(workspaceId, postId);
      if (response.success) {
        setPostComments({ ...postComments, [postId]: response.data });
        setCommentCounts({ ...commentCounts, [postId]: response.data.length });

        // Fetch reactions for each comment
        const reactions = {};
        for (const comment of response.data) {
          try {
            const reactionResponse = await reactionService.getCommentReactionSummary(workspaceId, postId, comment._id);
            if (reactionResponse.success) {
              reactions[comment._id] = {
                summary: reactionResponse.data.summary,
                userReaction: reactionResponse.data.userReaction
              };
            }
          } catch (error) {
            console.error(`Failed to fetch reactions for comment ${comment._id}:`, error);
          }
        }
        setCommentReactions(prev => ({ ...prev, ...reactions }));
      }
    } catch (error) {
      console.error('Fetch comments error:', error);
    } finally {
      setCommentsLoading({ ...commentsLoading, [postId]: false });
    }
  };

  const handleCreateComment = async (postId) => {
    const content = newCommentContent[postId];
    if (!content || !content.trim()) return;

    try {
      const response = await commentService.createComment(
        workspaceId,
        postId,
        content.trim(),
        newCommentMentions[postId] || [],
        newCommentMentionsEveryone[postId] || false
      );
      if (response.success) {
        const currentComments = postComments[postId] || [];
        setPostComments({ ...postComments, [postId]: [...currentComments, response.data] });
        setCommentCounts({ ...commentCounts, [postId]: (commentCounts[postId] || 0) + 1 });
        setNewCommentContent({ ...newCommentContent, [postId]: '' });
        setNewCommentMentions({ ...newCommentMentions, [postId]: [] });
        setNewCommentMentionsEveryone({ ...newCommentMentionsEveryone, [postId]: false });
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create comment');
      console.error('Create comment error:', error);
    }
  };

  const handleUpdateComment = async (postId, commentId) => {
    if (!editCommentContent.trim()) return;

    try {
      const response = await commentService.updateComment(
        workspaceId,
        postId,
        commentId,
        editCommentContent.trim(),
        editCommentMentions,
        editCommentMentionsEveryone
      );
      if (response.success) {
        const updatedComments = postComments[postId].map(c => c._id === commentId ? response.data : c);
        setPostComments({ ...postComments, [postId]: updatedComments });
        setEditingComment(null);
        setEditCommentContent('');
        setEditCommentMentions([]);
        setEditCommentMentionsEveryone(false);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update comment');
      console.error('Update comment error:', error);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await commentService.deleteComment(workspaceId, postId, commentId);
      if (response.success) {
        const updatedComments = postComments[postId].filter(c => c._id !== commentId);
        setPostComments({ ...postComments, [postId]: updatedComments });
        setCommentCounts({ ...commentCounts, [postId]: (commentCounts[postId] || 1) - 1 });
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete comment');
      console.error('Delete comment error:', error);
    }
  };

  const startEditingComment = (comment) => {
    setEditingComment(comment._id);
    setEditCommentContent(comment.content);
    setEditCommentMentions(comment.mentions || []);
    setEditCommentMentionsEveryone(comment.mentionsEveryone || false);
  };

  const cancelEditingComment = () => {
    setEditingComment(null);
    setEditCommentContent('');
    setEditCommentMentions([]);
    setEditCommentMentionsEveryone(false);
  };

  // Reaction handlers
  const handlePostReaction = async (postId, reactionType, emoji) => {
    try {
      const response = await reactionService.togglePostReaction(workspaceId, postId, reactionType, emoji);
      if (response.success) {
        // Refresh reaction summary for this post
        fetchPostReactions(postId);
      }
    } catch (error) {
      console.error('Post reaction error:', error);
    }
  };

  const handleCommentReaction = async (postId, commentId, reactionType, emoji) => {
    try {
      const response = await reactionService.toggleCommentReaction(workspaceId, postId, commentId, reactionType, emoji);
      if (response.success) {
        // Refresh reaction summary for this comment
        fetchCommentReactions(postId, commentId);
      }
    } catch (error) {
      console.error('Comment reaction error:', error);
    }
  };

  const fetchPostReactions = async (postId) => {
    try {
      const response = await reactionService.getPostReactionSummary(workspaceId, postId);
      if (response.success) {
        setPostReactions(prev => ({
          ...prev,
          [postId]: {
            summary: response.data.summary,
            userReaction: response.data.userReaction
          }
        }));
      }
    } catch (error) {
      console.error('Fetch post reactions error:', error);
    }
  };

  const fetchCommentReactions = async (postId, commentId) => {
    try {
      const response = await reactionService.getCommentReactionSummary(workspaceId, postId, commentId);
      if (response.success) {
        setCommentReactions(prev => ({
          ...prev,
          [commentId]: {
            summary: response.data.summary,
            userReaction: response.data.userReaction
          }
        }));
      }
    } catch (error) {
      console.error('Fetch comment reactions error:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'todo': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'document': return FileText;
      case 'task': return CheckCircle2;
      case 'comment': return MessageSquare;
      case 'member': return Users;
      default: return AlertCircle;
    }
  };

  // Theme classes
  const textClass = isDark ? 'text-white' : 'text-slate-800';
  const textSecondaryClass = isDark ? 'text-slate-300/70' : 'text-slate-500';
  const bgClass = isDark
    ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
    : 'bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50';

  if (loading) {
    return (
      <GlassPageContainer>
        <GlassHeader>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${isDark ? 'border-blue-400' : 'border-blue-600'}`}></div>
              <p className={textSecondaryClass}>Loading workspace...</p>
            </div>
          </div>
        </GlassHeader>
      </GlassPageContainer>
    );
  }

  if (error) {
    return (
      <GlassPageContainer>
        <GlassHeader>
          <GlassCard className="max-w-md mx-auto my-20">
            <div className="text-center p-8">
              <AlertCircle className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
              <h3 className={`text-lg font-medium mb-2 ${textClass}`}>Error Loading Workspace</h3>
              <p className={`mb-6 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
              <button
                onClick={() => navigate('/workspaces')}
                className={`px-6 py-2 rounded-full font-medium transition-all ${isDark
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_22px_rgba(59,130,246,0.35)]'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                  }`}
              >
                Back to Workspaces
              </button>
            </div>
          </GlassCard>
        </GlassHeader>
      </GlassPageContainer>
    );
  }

  if (!workspace) {
    return null;
  }

  const workspaceMembers = workspace.members || [];
  const memberUsers = workspaceMembers.map(m => m.user);

  return (
    <GlassPageContainer className="p-2 sm:p-4 md:p-6 max-w-7xl mx-auto">
      <GlassHeader>
        {/* Workspace Header */}
        <GlassCard className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <button
                  onClick={() => navigate('/workspaces')}
                  className={`p-2 rounded-full transition-colors flex-shrink-0 ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                    }`}
                >
                  <ArrowLeft className={`w-5 h-5 ${textClass}`} />
                </button>
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
                  style={{ backgroundColor: workspace.color || '#3B82F6' }}
                >
                  <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className={`text-lg sm:text-2xl font-bold truncate ${textClass}`}>{workspace.name}</h1>
                  <p className={`text-xs sm:text-sm truncate ${textSecondaryClass}`}>
                    {workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}
                    {workspace.description && (
                      <span className="hidden md:inline ml-2">• {workspace.description}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isOwnerOrAdmin() && (
                  <>
                    <button
                      onClick={() => setIsAddMemberModalOpen(true)}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full font-medium transition-all text-sm ${isDark
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_22px_rgba(59,130,246,0.35)]'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                        }`}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span className="hidden sm:inline">Invite</span>
                    </button>
                    <button
                      onClick={openEditWorkspaceModal}
                      className={`p-2 rounded-full transition-all ${isDark ? 'hover:bg-white/10 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                        }`}
                      title="Edit workspace"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className={`border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <nav className="flex space-x-1 px-2 sm:px-6 overflow-x-auto scrollbar-hide">
              {[
                { id: 'overview', name: 'Overview', icon: Activity },
                { id: 'posts', name: 'Posts', icon: MessageSquare },
                { id: 'tasks', name: 'Tasks', icon: CheckCircle2 },
                { id: 'documents', name: 'Documents', icon: FileText },
                { id: 'members', name: 'Members', icon: Users },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${isActive
                      ? isDark
                        ? 'border-blue-400 text-blue-400'
                        : 'border-blue-600 text-blue-600'
                      : isDark
                        ? 'border-transparent text-slate-400 hover:text-slate-200'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </GlassCard>

        {/* Main Content */}
        {activeTab === 'overview' && (
          <div className="flex-1 overflow-y-auto pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Workspace Description */}
                {workspace.description && (
                  <GlassCard>
                    <h3 className={`text-lg font-semibold mb-3 ${textClass}`}>About</h3>
                    <p className={textSecondaryClass}>{workspace.description}</p>
                  </GlassCard>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <GlassCard className="text-center p-3 sm:p-6">
                    <div className={`flex items-center justify-center mb-1 sm:mb-2`}>
                      <Target className={`w-6 h-6 sm:w-8 sm:h-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div className={`text-xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      {tasks.length}
                    </div>
                    <div className={`text-xs sm:text-sm ${textSecondaryClass}`}>Total Tasks</div>
                  </GlassCard>
                  <GlassCard className="text-center p-3 sm:p-6">
                    <div className={`flex items-center justify-center mb-1 sm:mb-2`}>
                      <CheckCircle2 className={`w-6 h-6 sm:w-8 sm:h-8 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <div className={`text-xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                      {tasks.filter(t => t.status === 'done').length}
                    </div>
                    <div className={`text-xs sm:text-sm ${textSecondaryClass}`}>Completed</div>
                  </GlassCard>
                  <GlassCard className="text-center p-3 sm:p-6">
                    <div className={`flex items-center justify-center mb-1 sm:mb-2`}>
                      <Folder className={`w-6 h-6 sm:w-8 sm:h-8 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                    </div>
                    <div className={`text-xl sm:text-3xl font-bold mb-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                      {documents.length}
                    </div>
                    <div className={`text-xs sm:text-sm ${textSecondaryClass}`}>Documents</div>
                  </GlassCard>
                </div>

                {/* Recent Activity - Using Posts */}
                <GlassCard>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${textClass}`}>Recent Activity</h3>
                    <button
                      onClick={() => setActiveTab('posts')}
                      className={`text-sm font-medium transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                        }`}>
                      View all
                    </button>
                  </div>
                  <div className="space-y-4">
                    {postsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${isDark ? 'border-blue-400' : 'border-blue-600'}`}></div>
                      </div>
                    ) : posts.length === 0 ? (
                      <p className={`text-sm ${textSecondaryClass} text-center py-4`}>No recent activity</p>
                    ) : (
                      posts.slice(0, 5).map((post) => (
                        <div key={post._id} className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                            {post.author?.avatar ? (
                              <img src={post.author.avatar} alt={post.author.firstName} className="w-full h-full object-cover" />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-purple-600 to-purple-700' : 'bg-gradient-to-br from-purple-500 to-purple-600'}`}>
                                <span className="text-white text-sm font-semibold">
                                  {post.author?.firstName?.[0]}{post.author?.lastName?.[0]}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${textClass}`}>
                              <span className="font-medium">{post.author?.firstName} {post.author?.lastName}</span>{' '}
                              posted{' '}
                              <span className="font-medium">{post.content?.substring(0, 50)}{post.content?.length > 50 ? '...' : ''}</span>
                            </p>
                            <p className={`text-xs mt-1 ${textSecondaryClass}`}>
                              {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <MessageSquare className={`w-5 h-5 mt-1 ${textSecondaryClass}`} />
                        </div>
                      ))
                    )}
                  </div>
                </GlassCard>
              </div>

              {/* Sidebar */}
              <div className="space-y-4 sm:space-y-6">
                {/* Workspace Info */}
                <GlassCard>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${textClass}`}>Workspace Info</h3>
                    {isOwnerOrAdmin() && (
                      <button
                        onClick={openEditWorkspaceModal}
                        className={`p-1.5 rounded-lg transition-all hover:scale-110 ${
                          isDark 
                            ? 'hover:bg-white/10 text-slate-400 hover:text-white' 
                            : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                        }`}
                        title="Edit workspace"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className={textSecondaryClass}>Owner:</span>
                      <span className={textClass}>{workspace.owner.firstName} {workspace.owner.lastName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={textSecondaryClass}>Created:</span>
                      <span className={textClass}>{new Date(workspace.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={textSecondaryClass}>Last Activity:</span>
                      <span className={textClass}>{new Date(workspace.lastActivity).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={textSecondaryClass}>Visibility:</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${workspace.settings?.isPublic
                          ? isDark
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-green-100 text-green-800'
                          : isDark
                            ? 'bg-slate-700/50 text-slate-300'
                            : 'bg-gray-100 text-gray-800'
                          }`}
                      >
                        {workspace.settings?.isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </div>
                </GlassCard>

                {/* Quick Actions */}
                <GlassCard>
                  <h3 className={`text-lg font-semibold mb-4 ${textClass}`}>Quick Actions</h3>
                  <div className="space-y-2">
                    <button
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Task</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('documents');
                        setTimeout(() => {
                          document.getElementById('document-upload')?.click();
                        }, 100);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Upload Document</span>
                    </button>
                    <button
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Schedule Meeting</span>
                    </button>
                    {isOwnerOrAdmin() && (
                      <button
                        onClick={() => setIsAddMemberModalOpen(true)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Invite Member</span>
                      </button>
                    )}
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4 pb-6">
              {/* Create Post Form */}
              <GlassCard className={`${isDark ? 'shadow-xl' : 'shadow-md'} hover:shadow-xl transition-all duration-300`}>
                <form onSubmit={handleCreatePost}>
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 shadow-md">
                        {user?.avatar ? (
                          <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gradient-to-br from-blue-500 to-blue-600'
                            }`}>
                            <span className="text-white text-sm font-semibold">
                              {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`rounded-xl border-2 transition-all duration-200 ${
                          isDark 
                            ? 'bg-slate-900/40 border-slate-700/50 focus-within:border-blue-500/50 focus-within:bg-slate-900/60' 
                            : 'bg-white border-slate-200 focus-within:border-blue-400 focus-within:bg-blue-50/30'
                        }`}>
                          <MentionInput
                            value={newPostContent}
                            onChange={(value) => setNewPostContent(value)}
                            onMentionsChange={handleNewPostMentionsChange}
                            members={workspaceMembers}
                            placeholder="Start a conversation..."
                            className={`w-full px-4 py-3 border-0 focus:ring-0 resize-none bg-transparent rounded-xl text-[15px] leading-relaxed ${
                              isDark 
                                ? 'text-white placeholder-slate-400' 
                                : 'text-gray-900 placeholder-gray-500'
                            }`}
                            rows={3}
                            disabled={createPostLoading}
                            maxLength={5000}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`px-5 sm:px-6 py-4 border-t flex items-center justify-between rounded-b-lg ${
                    isDark 
                      ? 'bg-slate-900/30 border-slate-700/50' 
                      : 'bg-gradient-to-r from-slate-50 to-blue-50/30 border-slate-200'
                    }`}>
                    <span className={`text-sm font-medium ${
                      isDark 
                        ? 'text-slate-400' 
                        : 'text-slate-600'
                    }`}>
                      {newPostContent.length}/5000
                    </span>
                    <button
                      type="submit"
                      disabled={!newPostContent.trim() || createPostLoading}
                      className={`px-6 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 ${
                        isDark
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-[0_0_25px_rgba(59,130,246,0.4)]'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30'
                        }`}
                    >
                      {createPostLoading ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </form>
              </GlassCard>

              {/* Posts List */}
              {postsLoading && (
                <div className="text-center py-12">
                  <div className={`animate-spin rounded-full h-10 w-10 border-b-2 mx-auto ${isDark ? 'border-blue-400' : 'border-blue-600'
                    }`}></div>
                  <p className={`mt-3 text-sm ${textSecondaryClass}`}>Loading posts...</p>
                </div>
              )}

              {postsError && (
                <GlassCard className={`p-4 ${isDark ? 'bg-red-900/20 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                  <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-700'}`}>{postsError}</p>
                </GlassCard>
              )}

              {!postsLoading && !postsError && posts.length === 0 && (
                <GlassCard className="text-center py-16">
                  <MessageSquare className={`w-16 h-16 mx-auto mb-4 ${textSecondaryClass}`} />
                  <h3 className={`text-lg font-medium mb-2 ${textClass}`}>No posts yet</h3>
                  <p className={textSecondaryClass}>Be the first to share an update!</p>
                </GlassCard>
              )}

              {!postsLoading && !postsError && posts.length > 0 && (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <GlassCard
                      key={post._id}
                      className={`border-l-4 hover:shadow-lg transition-shadow ${isDark ? 'border-orange-500' : 'border-orange-500'
                        }`}
                    >
                      <div className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                            {post.author?.avatar ? (
                              <img src={post.author.avatar} alt={`${post.author.firstName} ${post.author.lastName}`} className="w-full h-full object-cover" />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gradient-to-br from-blue-500 to-blue-600'
                                }`}>
                                <span className="text-white text-sm font-semibold">
                                  {post.author?.firstName?.[0]}{post.author?.lastName?.[0]}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className={`font-semibold text-sm ${textClass}`}>
                                  {post.author?.firstName} {post.author?.lastName}
                                </h4>
                                <div className={`flex items-center gap-2 text-xs mt-0.5 ${textSecondaryClass}`}>
                                  <span>
                                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                                      month: 'numeric',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {new Date(post.createdAt).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </span>
                                  {post.updatedAt !== post.createdAt && (
                                    <>
                                      <span>•</span>
                                      <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>Edited</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {(post.author?._id === user._id || post.author?._id === user.id ||
                                post.author?.email === user.email) && (
                                  <div className="relative">
                                    {editingPost === post._id ? (
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleUpdatePost(post._id)}
                                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${isDark
                                            ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/20'
                                            : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                                            }`}
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={cancelEditingPost}
                                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${isDark
                                            ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                                            }`}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDropdownOpen(dropdownOpen === post._id ? null : post._id);
                                        }}
                                        className={`p-1.5 rounded transition-colors ${isDark
                                          ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                          }`}
                                      >
                                        <MoreVertical className="w-5 h-5" />
                                      </button>
                                    )}
                                    {dropdownOpen === post._id && (
                                      <div className={`absolute right-0 mt-1 w-36 rounded-lg shadow-lg border z-10 ${isDark
                                        ? 'bg-slate-800/95 backdrop-blur-xl border-white/10'
                                        : 'bg-white border-gray-200'
                                        }`}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startEditingPost(post);
                                            setDropdownOpen(null);
                                          }}
                                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-t-lg transition-colors ${isDark
                                            ? 'text-slate-200 hover:bg-white/5'
                                            : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                        >
                                          <Pencil className="w-4 h-4" />
                                          <span>Edit</span>
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeletePost(post._id);
                                            setDropdownOpen(null);
                                          }}
                                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-b-lg transition-colors ${isDark
                                            ? 'text-red-400 hover:bg-red-900/20'
                                            : 'text-red-600 hover:bg-red-50'
                                            }`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          <span>Delete</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                            </div>
                            {editingPost === post._id ? (
                              <div className="mt-3">
                                <MentionInput
                                  value={editPostContent}
                                  onChange={(value) => setEditPostContent(value)}
                                  onMentionsChange={handleEditPostMentionsChange}
                                  members={workspaceMembers}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                                  rows={4}
                                  maxLength={5000}
                                />
                                <span className="text-xs text-gray-500 mt-1 block">
                                  {editPostContent.length}/5000
                                </span>
                              </div>
                            ) : (
                              <div className="mt-3">
                                <MentionText
                                  content={post.content}
                                  mentions={post.mentions}
                                  mentionsEveryone={post.mentionsEveryone}
                                  members={memberUsers}
                                  className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-slate-200' : 'text-gray-800'
                                    }`}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reactions and interactions bar */}
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {/* Reaction Picker */}
                            <ReactionPicker
                              onReact={(reactionType, emoji) => handlePostReaction(post._id, reactionType, emoji)}
                              currentReaction={postReactions[post._id]?.userReaction}
                              position="top"
                            />

                            {/* Reaction Bar */}
                            {postReactions[post._id]?.summary && postReactions[post._id].summary.length > 0 && (
                              <ReactionBar
                                reactions={postReactions[post._id].summary}
                                userReaction={postReactions[post._id].userReaction}
                                onShowDetails={() => console.log('Show reaction details')}
                              />
                            )}
                          </div>

                          {/* Comment count button */}
                          <button
                            onClick={() => toggleComments(post._id)}
                            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                          >
                            <MessageSquare className="w-5 h-5" />
                            <span>
                              {commentCounts[post._id] || 0} {commentCounts[post._id] === 1 ? 'comment' : 'comments'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {expandedComments[post._id] ? '' : ''}
                            </span>
                          </button>
                        </div>

                        {/* Comment section */}
                        <div className="mt-3">
                          {/* Expanded comments section */}
                          {expandedComments[post._id] && (
                            <div className="mt-4 space-y-3">
                              {commentsLoading[post._id] ? (
                                <div className="text-center py-4">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                  <p className="mt-2 text-xs text-gray-500">Loading comments...</p>
                                </div>
                              ) : (
                                <>
                                  {/* Comments list */}
                                  {postComments[post._id]?.length > 0 ? (
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                      {postComments[post._id].map((comment) => (
                                        <div key={comment._id} className={`flex items-start gap-3 rounded-xl p-4 transition-all hover:shadow-md ${isDark ? 'bg-slate-800/60 hover:bg-slate-800/80' : 'bg-gradient-to-br from-slate-50 to-blue-50/30 hover:from-slate-100 hover:to-blue-50/50'}`}>
                                          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 shadow-sm">
                                            {comment.author?.avatar ? (
                                              <img src={comment.author.avatar} alt={`${comment.author.firstName} ${comment.author.lastName}`} className="w-full h-full object-cover" />
                                            ) : (
                                              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                                                <span className="text-white text-xs font-semibold">
                                                  {comment.author?.firstName?.[0]}{comment.author?.lastName?.[0]}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex-1 min-w-0">
                                                <h5 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                  {comment.author?.firstName} {comment.author?.lastName}
                                                </h5>
                                                <div className={`flex items-center space-x-2 text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                  <span>
                                                    {new Date(comment.createdAt).toLocaleDateString('en-US', {
                                                      month: 'numeric',
                                                      day: 'numeric',
                                                      year: 'numeric'
                                                    })}
                                                  </span>
                                                  <span>•</span>
                                                  <span>
                                                    {new Date(comment.createdAt).toLocaleTimeString('en-US', {
                                                      hour: 'numeric',
                                                      minute: '2-digit',
                                                      hour12: true
                                                    })}
                                                  </span>
                                                  {comment.updatedAt !== comment.createdAt && (
                                                    <>
                                                      <span>•</span>
                                                      <span className={`font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Edited</span>
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                              {(comment.author?._id === user._id || comment.author?._id === user.id ||
                                                comment.author?.email === user.email) && (
                                                  <div className="relative flex-shrink-0">
                                                    {editingComment === comment._id ? (
                                                      <div className="flex items-center space-x-1">
                                                        <button
                                                          onClick={() => handleUpdateComment(post._id, comment._id)}
                                                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${isDark ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'}`}
                                                        >
                                                          Save
                                                        </button>
                                                        <button
                                                          onClick={cancelEditingComment}
                                                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${isDark ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50' : 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'}`}
                                                        >
                                                          Cancel
                                                        </button>
                                                      </div>
                                                    ) : (
                                                      <>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCommentDropdownOpen(commentDropdownOpen === comment._id ? null : comment._id);
                                                          }}
                                                          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                                        >
                                                          <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                        {commentDropdownOpen === comment._id && (
                                                          <div className={`absolute right-0 mt-1 w-36 rounded-lg shadow-xl border z-50 overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                startEditingComment(comment);
                                                                setCommentDropdownOpen(null);
                                                              }}
                                                              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'}`}
                                                            >
                                                              <Pencil className="w-4 h-4" />
                                                              <span>Edit</span>
                                                            </button>
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteComment(post._id, comment._id);
                                                                setCommentDropdownOpen(null);
                                                              }}
                                                              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}
                                                            >
                                                              <Trash2 className="w-4 h-4" />
                                                              <span>Delete</span>
                                                            </button>
                                                          </div>
                                                        )}
                                                      </>
                                                    )}
                                                  </div>
                                                )}
                                            </div>
                                            {editingComment === comment._id ? (
                                              <div className="mt-2">
                                                <div className={`rounded-lg border-2 transition-all duration-200 ${isDark ? 'bg-slate-900/40 border-slate-700/50 focus-within:border-blue-500/50' : 'bg-white border-slate-200 focus-within:border-blue-400'}`}>
                                                  <MentionInput
                                                    value={editCommentContent}
                                                    onChange={(value) => setEditCommentContent(value)}
                                                    onMentionsChange={handleEditCommentMentionsChange}
                                                    members={workspaceMembers}
                                                    className={`w-full px-3 py-2 border-0 focus:ring-0 resize-none text-sm bg-transparent ${isDark ? 'text-white placeholder-slate-400' : 'text-gray-900 placeholder-gray-500'}`}
                                                    rows={2}
                                                    maxLength={2000}
                                                  />
                                                </div>
                                                <span className={`text-xs mt-1 block font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                  {editCommentContent.length}/2000
                                                </span>
                                              </div>
                                            ) : (
                                              <>
                                                <MentionText
                                                  content={comment.content}
                                                  mentions={comment.mentions}
                                                  mentionsEveryone={comment.mentionsEveryone}
                                                  members={memberUsers}
                                                  className={`mt-2 text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-slate-200' : 'text-gray-700'}`}
                                                />
                                                {/* Comment reactions */}
                                                <div className="mt-2 flex items-center space-x-2">
                                                  <ReactionPicker
                                                    onReact={(reactionType, emoji) => handleCommentReaction(post._id, comment._id, reactionType, emoji)}
                                                    currentReaction={commentReactions[comment._id]?.userReaction}
                                                    position="bottom"
                                                  />
                                                  {commentReactions[comment._id]?.summary && commentReactions[comment._id].summary.length > 0 && (
                                                    <ReactionBar
                                                      reactions={commentReactions[comment._id].summary}
                                                      userReaction={commentReactions[comment._id].userReaction}
                                                      onShowDetails={() => console.log('Show comment reaction details')}
                                                    />
                                                  )}
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-4">
                                      <p className="text-sm text-gray-500">No comments yet. Be the first to comment!</p>
                                    </div>
                                  )}

                                  {/* Add comment form */}
                                  <div className="flex items-start gap-3 mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 shadow-sm">
                                      {user.avatar ? (
                                        <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                                          <span className="text-white text-xs font-semibold">
                                            {user.firstName?.[0]}{user.lastName?.[0]}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className={`rounded-lg border-2 transition-all duration-200 ${
                                        isDark 
                                          ? 'bg-slate-900/40 border-slate-700/50 focus-within:border-blue-500/50 focus-within:bg-slate-900/60' 
                                          : 'bg-white border-slate-200 focus-within:border-blue-400 focus-within:bg-blue-50/20'
                                      }`}>
                                        <MentionInput
                                          value={newCommentContent[post._id] || ''}
                                          onChange={(value) => setNewCommentContent({ ...newCommentContent, [post._id]: value })}
                                          onMentionsChange={handleNewCommentMentionsChange(post._id)}
                                          members={workspaceMembers}
                                          placeholder="Write a comment..."
                                          className={`w-full px-3 py-2.5 border-0 focus:ring-0 resize-none bg-transparent rounded-lg text-sm leading-relaxed ${
                                            isDark 
                                              ? 'text-white placeholder-slate-400' 
                                              : 'text-gray-900 placeholder-gray-500'
                                          }`}
                                          rows={2}
                                          maxLength={2000}
                                        />
                                      </div>
                                      <div className="flex items-center justify-between mt-2">
                                        <span className={`text-xs font-medium ${
                                          isDark ? 'text-slate-400' : 'text-slate-600'
                                        }`}>
                                          {(newCommentContent[post._id] || '').length}/2000
                                        </span>
                                        <button
                                          onClick={() => handleCreateComment(post._id)}
                                          disabled={!newCommentContent[post._id]?.trim()}
                                          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 ${
                                            isDark
                                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/20'
                                              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md shadow-blue-500/20'
                                          }`}
                                        >
                                          Comment
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Tasks</h2>
              <div className="flex items-center space-x-2">
                <select
                  value={taskFilters.status}
                  onChange={e => setTaskFilters(f => ({ ...f, status: e.target.value }))}
                  className={`border rounded px-2 py-1 text-sm ${isDark ? 'bg-slate-800 border-white/10 text-white' : 'border-gray-300'}`}
                >
                  <option value="all">All Statuses</option>
                  <option value="todo">Todo</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <button onClick={openTaskModal} className="btn-primary flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>New Task</span>
                </button>
              </div>
            </div>

            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/40 backdrop-blur-xl border border-white/10' : 'bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl'}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                      <th className={`text-left py-3 px-4 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Task</th>
                      <th className={`text-left py-3 px-4 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Actions</th>
                      <th className={`text-left py-3 px-4 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Status</th>
                      <th className={`text-left py-3 px-4 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Priority</th>
                      <th className={`text-left py-3 px-4 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Progress</th>
                      <th className={`text-left py-3 px-4 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Assignee</th>
                      <th className={`text-left py-3 px-4 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasksLoading && (
                      <tr><td colSpan="7" className={`py-4 text-center text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Loading tasks...</td></tr>
                    )}
                    {tasksError && !tasksLoading && (
                      <tr><td colSpan="7" className={`py-4 text-center text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>{tasksError}</td></tr>
                    )}
                    {!tasksLoading && !tasksError && filteredTasks.map((task) => (
                      <tr key={task._id} className={`border-b ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <td className="py-3 px-4">
                          <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <Link to={`/tasks/${task._id}`} className={`${isDark ? 'text-blue-400' : 'text-blue-600'} hover:underline`}>{task.title}</Link>
                          </div>
                          {task.description && (
                            <div className={`text-xs mt-1 line-clamp-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{task.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${isDark ? 'bg-slate-700 border-white/10 text-slate-200 hover:bg-slate-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                              onClick={() => handleUpdateTask(task._id)}
                            >
                              Update
                            </button>
                            <button
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${isDark ? 'bg-red-900/50 border-red-500/30 text-red-300 hover:bg-red-800/50' : 'bg-white border-gray-300 text-red-600 hover:bg-red-50'}`}
                              onClick={() => handleDeleteTask(task._id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status?.replace('-', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {(task.priority || 'medium').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <div className={`w-24 rounded h-2 overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                              <div
                                className="h-2 bg-blue-600"
                                style={{ width: `${percentOf(task.loggedHours, task.estimatedHours)}%` }}
                                title={`Time: ${task.loggedHours || 0}h / ${task.estimatedHours || 0}h`}
                              ></div>
                            </div>
                            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{task.autoProgress || 0}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          <TaskAssigneeCell
                            task={task}
                            members={workspaceMembers}
                            onUpdate={fetchTasks}
                          />
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : <span className="text-xs text-gray-400">No due date</span>}
                        </td>
                      </tr>
                    ))}
                    {!tasksLoading && !tasksError && filteredTasks.length === 0 && (
                      <tr><td colSpan="7" className="py-4 text-center text-sm text-gray-500">No tasks match filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentList />
        )}

        {activeTab === 'files' && (
          <FileList />
        )}

        {activeTab === 'members' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Members</h2>
              {isOwnerOrAdmin() && (
                <button
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Invite Member</span>
                </button>
              )}
            </div>

            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-900/40 backdrop-blur-xl border border-white/10' : 'bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl'}`}>
              <div className="space-y-4">
                {workspace.members.filter(member => member.user).map((member) => (
                  <div key={member._id} className={`flex items-center space-x-4 p-4 border rounded-lg ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200'}`}>
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      {member.user.avatar ? (
                        <img src={member.user.avatar} alt={`${member.user.firstName} ${member.user.lastName}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">
                            {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {member.user.firstName} {member.user.lastName}
                      </h4>
                      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{member.user.email}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${member.role === 'owner'
                        ? 'bg-purple-100 text-purple-800'
                        : member.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}>
                        {member.role.toUpperCase()}
                      </span>
                      {canChangeRole(member) && (
                        <button
                          onClick={() => openChangeRoleModal(member)}
                          className={`px-2 py-1 text-xs rounded border transition-colors ${isDark ? 'text-blue-400 border-blue-500/30 hover:bg-blue-900/30' : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200 hover:border-blue-300'}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      {canRemoveMember(member) && (
                        <button
                          onClick={() => openRemoveMemberModal(member)}
                          disabled={removingMemberId === (member.user._id || member.user.id)}
                          className={`px-2 py-1 text-xs rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'text-red-400 border-red-500/30 hover:bg-red-900/30' : 'text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200 hover:border-red-300'}`}
                        >
                          {removingMemberId === (member.user._id || member.user.id) ? (
                            <div className="flex items-center space-x-1">
                              <div className={`animate-spin rounded-full h-3 w-3 border-b ${isDark ? 'border-red-400' : 'border-red-600'}`}></div>
                              <span>Removing...</span>
                            </div>
                          ) : (
                            member.user.email === user.email ? 'Leave' : 'Remove'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        <AddMemberModal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          onAddMember={handleAddMember}
          loading={addMemberLoading}
        />

        {/* Remove Member Modal */}
        <RemoveMemberModal
          isOpen={isRemoveMemberModalOpen}
          onClose={() => {
            setIsRemoveMemberModalOpen(false);
            setMemberToRemove(null);
          }}
          onConfirm={handleRemoveMember}
          member={memberToRemove}
          isCurrentUser={memberToRemove && memberToRemove.user.email === user.email}
          loading={removingMemberId === (memberToRemove?.user._id || memberToRemove?.user.id)}
        />

        {/* Change Role Modal */}
        {isChangeRoleModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Change Member Role</h2>
                <button
                  onClick={() => {
                    setIsChangeRoleModalOpen(false);
                    setMemberToChangeRole(null);
                    setSelectedRole('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                {memberToChangeRole && (
                  <>
                    <div className="mb-4">
                      <p className="text-gray-700">
                        Change role for <span className="font-medium">
                          {memberToChangeRole.user.firstName} {memberToChangeRole.user.lastName}
                        </span>?
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {memberToChangeRole.user.email}
                      </p>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Role
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="admin"
                            checked={selectedRole === 'admin'}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Admin - Can manage members and settings</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="member"
                            checked={selectedRole === 'member'}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Member - Can view and contribute to workspace</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangeRoleModalOpen(false);
                      setMemberToChangeRole(null);
                      setSelectedRole('');
                    }}
                    className="btn-secondary"
                    disabled={changingRoleLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangeRole}
                    className="btn-primary"
                    disabled={changingRoleLoading || !selectedRole || selectedRole === memberToChangeRole?.role}
                  >
                    {changingRoleLoading ? 'Changing...' : 'Change Role'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Task Creation Modal */}
        {isTaskModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <GlassCard className="max-w-md w-full">
              <form onSubmit={handleCreateTask}>
                <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-200'
                  }`}>
                  <h2 className={`text-xl font-semibold ${textClass}`}>New Task</h2>
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className={textSecondaryClass}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${textClass}`}>Title</label>
                    <input
                      value={newTask.title}
                      onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
                      required
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                        ? 'bg-slate-800/50 border-white/10 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      placeholder="Task title"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${textClass}`}>Description</label>
                    <textarea
                      value={newTask.description}
                      onChange={e => setNewTask(t => ({ ...t, description: e.target.value }))}
                      rows={3}
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                        ? 'bg-slate-800/50 border-white/10 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      placeholder="Optional description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${textClass}`}>Due Date</label>
                      <input
                        type="date"
                        value={newTask.dueDate}
                        onChange={e => setNewTask(t => ({ ...t, dueDate: e.target.value }))}
                        className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                          ? 'bg-slate-800/50 border-white/10 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                          }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${textClass}`}>Priority</label>
                      <select
                        value={newTask.priority}
                        onChange={e => setNewTask(t => ({ ...t, priority: e.target.value }))}
                        className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                          ? 'bg-slate-800/50 border-white/10 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                          }`}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className={`flex items-center justify-end gap-3 p-6 border-t ${isDark ? 'border-white/10' : 'border-slate-200'
                  }`}>
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className={`px-4 py-2 rounded-full font-medium transition-colors ${isDark
                      ? 'bg-slate-700/50 hover:bg-slate-700 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    disabled={creatingTask}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-full font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isDark
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_22px_rgba(59,130,246,0.35)]'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                      }`}
                    disabled={creatingTask || !newTask.title}
                  >
                    {creatingTask ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </form>
            </GlassCard>
          </div>
        )}

        {/* Edit Workspace Modal */}
        {isEditWorkspaceModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`${isDark ? 'bg-slate-900/95' : 'bg-white/95'} backdrop-blur-xl border ${isDark ? 'border-white/10' : 'border-white/40'} rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto`}>
              <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <h2 className={`text-xl font-semibold ${textClass}`}>Edit Workspace</h2>
                <button
                  onClick={() => setIsEditWorkspaceModalOpen(false)}
                  className={`${textSecondaryClass} transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateWorkspace} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${textClass} mb-2`}>
                      Workspace Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editWorkspaceForm.name}
                      onChange={(e) => setEditWorkspaceForm({ ...editWorkspaceForm, name: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border backdrop-blur-xl transition-all focus:outline-none ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-400 focus:border-blue-500' 
                          : 'bg-white border-slate-300 text-slate-900 placeholder-gray-400 focus:border-blue-400'
                      }`}
                      placeholder="Enter workspace name"
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textClass} mb-2`}>Description</label>
                    <textarea
                      value={editWorkspaceForm.description}
                      onChange={(e) => setEditWorkspaceForm({ ...editWorkspaceForm, description: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border backdrop-blur-xl transition-all focus:outline-none ${
                        isDark 
                          ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-400 focus:border-blue-500' 
                          : 'bg-white border-slate-300 text-slate-900 placeholder-gray-400 focus:border-blue-400'
                      }`}
                      placeholder="Describe your workspace"
                      rows="3"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textClass} mb-2`}>Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                            editWorkspaceForm.color === color.value 
                              ? (isDark ? 'border-white shadow-lg' : 'border-gray-700 shadow-lg') 
                              : (isDark ? 'border-white/20' : 'border-gray-200')
                          }`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => setEditWorkspaceForm({ ...editWorkspaceForm, color: color.value })}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editWorkspaceForm.isPublic}
                        onChange={(e) => setEditWorkspaceForm({ ...editWorkspaceForm, isPublic: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className={`text-sm font-medium ${textClass}`}>Make this workspace public</span>
                    </label>
                    <p className={`text-xs ${textSecondaryClass} mt-1 ml-6`}>Public workspaces can be discovered and joined by other users</p>
                  </div>
                </div>

                <div className={`flex items-center justify-end gap-3 mt-6 pt-6 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => setIsEditWorkspaceModalOpen(false)}
                    className={`px-5 py-2.5 rounded-full font-medium transition-colors ${
                      isDark 
                        ? 'bg-white/10 hover:bg-white/20 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!editWorkspaceForm.name.trim()}
                    className={`px-5 py-2.5 rounded-full font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-[0_0_25px_rgba(59,130,246,0.4)]'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30'
                    }`}
                  >
                    Update Workspace
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </GlassHeader>
    </GlassPageContainer>
  );
};

export default WorkspaceDetail;