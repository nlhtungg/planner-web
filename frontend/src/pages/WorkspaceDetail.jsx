import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import workspaceService from '../services/workspaceService';
import postService from '../services/postService';
import commentService from '../services/commentService';
import reactionService from '../services/reactionService';
import socketService from '../services/socketService';
import { getTasksByWorkspace, createTask, assignTaskByIdentifier, assignTask, deleteTask } from '../services/taskService';
import { Link } from 'react-router-dom';
import { percentOf } from '../utils/taskUtils';
import AddMemberModal from '../components/AddMemberModal';
import RemoveMemberModal from '../components/RemoveMemberModal';
import UserFuzzySelect from '../components/UserFuzzySelect';
import ReactionPicker from '../components/ReactionPicker';
import ReactionBar from '../components/ReactionBar';
import MentionInput from '../components/MentionInput';
import MentionText from '../components/MentionText';
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  ClockIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import DocumentList from '../components/DocumentList';

const WorkspaceDetail = () => {
  const { workspaceId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  // Mock data for workspace content
  const recentActivity = [
    { id: 1, type: 'document', action: 'created', item: 'Project Requirements.docx', user: 'Alice Johnson', time: '2 hours ago', avatar: 'AJ' },
    { id: 2, type: 'task', action: 'completed', item: 'Review API documentation', user: 'Bob Smith', time: '4 hours ago', avatar: 'BS' },
    { id: 3, type: 'comment', action: 'commented on', item: 'Design System Updates', user: 'Carol Davis', time: '6 hours ago', avatar: 'CD' },
    { id: 4, type: 'member', action: 'joined', item: 'the workspace', user: 'David Wilson', time: '1 day ago', avatar: 'DW' },
  ];

  // Tasks state (real data)
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', priority: 'medium', assignees: [] });
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskFilters, setTaskFilters] = useState({ status: 'all', assignee: 'all' });
  const [quickAssign, setQuickAssign] = useState({}); // { [taskId]: identifier }

  const documents = [
    { id: 1, name: 'Project Requirements.docx', type: 'document', size: '2.4 MB', modified: '2 hours ago', author: 'Alice Johnson' },
    { id: 2, name: 'API Specifications.pdf', type: 'pdf', size: '1.8 MB', modified: '1 day ago', author: 'Bob Smith' },
    { id: 3, name: 'Design Assets.zip', type: 'archive', size: '15.2 MB', modified: '2 days ago', author: 'Carol Davis' },
    { id: 4, name: 'Meeting Notes.md', type: 'markdown', size: '45 KB', modified: '3 days ago', author: 'David Wilson' },
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

  useEffect(() => {
    if (activeTab === 'posts') {
      fetchPosts();
    }
  }, [activeTab, workspaceId]);

  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTasks();
    }
  }, [activeTab, workspaceId]);

  // Socket.io real-time updates
  useEffect(() => {
    // Connect to socket and join workspace
    socketService.connect();
    socketService.joinWorkspace(workspaceId);

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
    setNewTask({ title: '', description: '', dueDate: '', priority: 'medium', assignees: [] });
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
        assignees: (newTask.assignees || []).map(a => a?._id || a).filter(Boolean)
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

  const handleQuickAssign = async (taskId) => {
    const identifier = (quickAssign[taskId] || '').trim();
    if (!identifier) return;
    try {
      const res = await assignTaskByIdentifier(taskId, identifier);
      setTasks(prev => prev.map(t => t._id === taskId ? res.data : t));
      setQuickAssign(q => ({ ...q, [taskId]: '' }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign');
    }
  };

  const handleAssignToMe = async (taskId) => {
    try {
      const meId = user._id || user.id;
      const task = tasks.find(t => t._id === taskId);
      if (task && task.assignees?.some(a => (a._id || a) === meId)) {
        return; // already assigned; avoid duplicate UI action
      }
      const res = await assignTask(taskId, user._id || user.id);
      setTasks(prev => prev.map(t => t._id === taskId ? res.data : t));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign to me');
    }
  };

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
      case 'document': return DocumentTextIcon;
      case 'task': return CheckCircleIcon;
      case 'comment': return ChatBubbleLeftRightIcon;
      case 'member': return UserGroupIcon;
      default: return ExclamationCircleIcon;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationCircleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Workspace</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/workspaces')}
            className="btn-primary"
          >
            Back to Workspaces
          </button>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return null;
  }

  const workspaceMembers = workspace.members || [];
  const memberUsers = workspaceMembers.map(m => m.user);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/workspaces')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: workspace.color }}
              >
                <BriefcaseIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{workspace.name}</h1>
                <p className="text-sm text-gray-500">{workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isOwnerOrAdmin() && (
              <button className="btn-secondary flex items-center space-x-2">
                <Cog6ToothIcon className="w-4 h-4" />
                <span>Settings</span>
              </button>
            )}
            {isOwnerOrAdmin() && (
              <button
                onClick={() => setIsAddMemberModalOpen(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <UserPlusIcon className="w-4 h-4" />
                <span>Invite</span>
              </button>
            )}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </button>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-t border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview', icon: BriefcaseIcon },
              { id: 'posts', name: 'Posts', icon: ChatBubbleLeftRightIcon },
              { id: 'tasks', name: 'Tasks', icon: CheckCircleIcon },
              { id: 'documents', name: 'Documents', icon: DocumentTextIcon },
              { id: 'members', name: 'Members', icon: UserGroupIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Workspace Description */}
              {workspace.description && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">About</h3>
                  <p className="text-gray-700">{workspace.description}</p>
                </div>
              )}

              {/* Recent Activity */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View all
                  </button>
                </div>
                <div className="space-y-4">
                  {recentActivity.map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-semibold">
                            {activity.avatar}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">{activity.user}</span>{' '}
                            {activity.action}{' '}
                            <span className="font-medium">{activity.item}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card text-center">
                  <div className="text-2xl font-bold text-blue-600">{tasks.length}</div>
                  <div className="text-sm text-gray-600">Total Tasks</div>
                </div>
                <div className="card text-center">
                  <div className="text-2xl font-bold text-green-600">{tasks.filter(t => t.status === 'done').length}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="card text-center">
                  <div className="text-2xl font-bold text-orange-600">{documents.length}</div>
                  <div className="text-sm text-gray-600">Documents</div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Workspace Info */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Workspace Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Owner:</span>
                    <span className="text-gray-900">{workspace.owner.firstName} {workspace.owner.lastName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="text-gray-900">{new Date(workspace.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Last Activity:</span>
                    <span className="text-gray-900">{new Date(workspace.lastActivity).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Visibility:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${workspace.settings?.isPublic
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                      }`}>
                      {workspace.settings?.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                    <PlusIcon className="w-4 h-4" />
                    <span>Create Task</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('documents');
                      setTimeout(() => {
                        document.getElementById('document-upload')?.click();
                      }, 100);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>Upload Document</span>
                  </button>
                  <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                    <CalendarDaysIcon className="w-4 h-4" />
                    <span>Schedule Meeting</span>
                  </button>
                  {isOwnerOrAdmin() && (
                    <button
                      onClick={() => setIsAddMemberModalOpen(true)}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      <UserPlusIcon className="w-4 h-4" />
                      <span>Invite Member</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Create Post Form */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <form onSubmit={handleCreatePost}>
                <div className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <MentionInput
                        value={newPostContent}
                        onChange={(value) => setNewPostContent(value)}
                        onMentionsChange={handleNewPostMentionsChange}
                        members={workspaceMembers}
                        placeholder="Start a conversation..."
                        className="w-full px-0 py-0 border-0 focus:ring-0 resize-none text-gray-900 placeholder-gray-400"
                        rows={3}
                        disabled={createPostLoading}
                        maxLength={5000}
                      />
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between rounded-b-lg">
                  <span className="text-xs text-gray-500">
                    {newPostContent.length}/5000
                  </span>
                  <button
                    type="submit"
                    disabled={!newPostContent.trim() || createPostLoading}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {createPostLoading ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </form>
            </div>

            {/* Posts List */}
            {postsLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-3 text-sm text-gray-500">Loading posts...</p>
              </div>
            )}

            {postsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{postsError}</p>
              </div>
            )}

            {!postsLoading && !postsError && posts.length === 0 && (
              <div className="text-center py-16">
                <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-500">Be the first to share an update!</p>
              </div>
            )}

            {!postsLoading && !postsError && posts.length > 0 && (
              <div className="space-y-3">
                {posts.map((post) => (
                  <div 
                    key={post._id} 
                    className="bg-white rounded-lg shadow-sm border-l-4 border-orange-500 hover:shadow-md transition-shadow"
                  >
                    <div className="p-5">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                          {post.author?.avatar ? (
                            <img src={post.author.avatar} alt={`${post.author.firstName} ${post.author.lastName}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                              <span className="text-white text-sm font-semibold">
                                {post.author?.firstName?.[0]}{post.author?.lastName?.[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900 text-sm">
                                {post.author?.firstName} {post.author?.lastName}
                              </h4>
                              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-0.5">
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
                                    <span className="text-blue-600">Edited</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {(post.author?._id === user._id || post.author?._id === user.id || 
                              post.author?.email === user.email) && (
                              <div className="relative">
                                {editingPost === post._id ? (
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => handleUpdatePost(post._id)}
                                      className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={cancelEditingPost}
                                      className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
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
                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                  >
                                    <EllipsisVerticalIcon className="w-5 h-5" />
                                  </button>
                                )}
                                {dropdownOpen === post._id && (
                                  <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditingPost(post);
                                        setDropdownOpen(null);
                                      }}
                                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                                    >
                                      <PencilIcon className="w-4 h-4" />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeletePost(post._id);
                                        setDropdownOpen(null);
                                      }}
                                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                                    >
                                      <TrashIcon className="w-4 h-4" />
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
                                className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap"
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
                          <ChatBubbleLeftRightIcon className="w-5 h-5" />
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
                                      <div key={comment._id} className="flex items-start space-x-2 bg-gray-50 rounded-lg p-3">
                                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
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
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <h5 className="font-semibold text-gray-900 text-xs">
                                                {comment.author?.firstName} {comment.author?.lastName}
                                              </h5>
                                              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-0.5">
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
                                                    <span className="text-blue-600">Edited</span>
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                            {(comment.author?._id === user._id || comment.author?._id === user.id || 
                                              comment.author?.email === user.email) && (
                                              <div className="relative">
                                                {editingComment === comment._id ? (
                                                  <div className="flex items-center space-x-1">
                                                    <button
                                                      onClick={() => handleUpdateComment(post._id, comment._id)}
                                                      className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                                    >
                                                      Save
                                                    </button>
                                                    <button
                                                      onClick={cancelEditingComment}
                                                      className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                                                    >
                                                      Cancel
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setCommentDropdownOpen(commentDropdownOpen === comment._id ? null : comment._id);
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                                                  >
                                                    <EllipsisVerticalIcon className="w-4 h-4" />
                                                  </button>
                                                )}
                                                {commentDropdownOpen === comment._id && (
                                                  <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        startEditingComment(comment);
                                                        setCommentDropdownOpen(null);
                                                      }}
                                                      className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded-t-lg"
                                                    >
                                                      <PencilIcon className="w-3 h-3" />
                                                      <span>Edit</span>
                                                    </button>
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteComment(post._id, comment._id);
                                                        setCommentDropdownOpen(null);
                                                      }}
                                                      className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-b-lg"
                                                    >
                                                      <TrashIcon className="w-3 h-3" />
                                                      <span>Delete</span>
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          {editingComment === comment._id ? (
                                            <div className="mt-2">
                                              <MentionInput
                                                value={editCommentContent}
                                                onChange={(value) => setEditCommentContent(value)}
                                                onMentionsChange={handleEditCommentMentionsChange}
                                                members={workspaceMembers}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-xs"
                                                rows={2}
                                                maxLength={2000}
                                              />
                                              <span className="text-xs text-gray-500 mt-0.5 block">
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
                                                className="mt-2 text-gray-700 text-xs leading-relaxed whitespace-pre-wrap"
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
                                <div className="flex items-start space-x-2 mt-3">
                                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
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
                                    <MentionInput
                                      value={newCommentContent[post._id] || ''}
                                      onChange={(value) => setNewCommentContent({ ...newCommentContent, [post._id]: value })}
                                      onMentionsChange={handleNewCommentMentionsChange(post._id)}
                                      members={workspaceMembers}
                                      placeholder="Write a comment..."
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                                      rows={2}
                                      maxLength={2000}
                                    />
                                    <div className="flex items-center justify-between mt-2">
                                      <span className="text-xs text-gray-500">
                                        {(newCommentContent[post._id] || '').length}/2000
                                      </span>
                                      <button
                                        onClick={() => handleCreateComment(post._id)}
                                        disabled={!newCommentContent[post._id]?.trim()}
                                        className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
              <div className="flex items-center space-x-2">
                <select
                  value={taskFilters.status}
                  onChange={e => setTaskFilters(f => ({ ...f, status: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="todo">Todo</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <button onClick={openTaskModal} className="btn-primary flex items-center space-x-2">
                  <PlusIcon className="w-4 h-4" />
                  <span>New Task</span>
                </button>
              </div>
            </div>

            <div className="card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Task</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Priority</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Progress</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Assignee</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasksLoading && (
                      <tr><td colSpan="4" className="py-4 text-center text-sm text-gray-500">Loading tasks...</td></tr>
                    )}
                    {tasksError && !tasksLoading && (
                      <tr><td colSpan="4" className="py-4 text-center text-sm text-red-600">{tasksError}</td></tr>
                    )}
                    {!tasksLoading && !tasksError && filteredTasks.map((task) => (
                      <tr key={task._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">
                            <Link to={`/tasks/${task._id}`} className="text-blue-600 hover:underline">{task.title}</Link>
                          </div>
                          {task.description && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button className="btn-secondary text-xs" onClick={() => handleUpdateTask(task._id)}>Update</button>
                            <button className="btn-secondary text-xs" onClick={() => handleDeleteTask(task._id)}>Delete</button>
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
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-200 rounded h-2 overflow-hidden">
                                <div
                                  className="h-2 bg-blue-600"
                                  style={{ width: `${percentOf(task.loggedHours, task.estimatedHours)}%` }}
                                  title={`Time: ${task.loggedHours || 0}h / ${task.estimatedHours || 0}h`}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-600">{task.autoProgress || 0}%</span>
                            </div>
                            {typeof task.progress === 'number' && task.progress !== task.autoProgress && (
                              <div className="text-[10px] text-gray-400">Manual: {task.progress}%</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {task.assignees && task.assignees.length > 0 ? (
                            <div className="flex -space-x-2">
                              {task.assignees.slice(0,3).map((a, idx) => (
                                <div key={`${a._id || a}-${idx}`} className="w-7 h-7 rounded-full border-2 border-white overflow-hidden" title={a.firstName ? `${a.firstName} ${a.lastName}` : ''}>
                                  {a.avatar ? (
                                    <img src={a.avatar} alt={`${a.firstName} ${a.lastName}`} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                      <span className="text-white text-[10px] font-semibold">
                                        {(a.firstName?.[0] || '?')}{(a.lastName?.[0] || '')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                              {task.assignees.length > 3 && (
                                <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 text-[10px] flex items-center justify-center border-2 border-white" title={`${task.assignees.length - 3} more`}>+{task.assignees.length - 3}</div>
                              )}
                            </div>
                          ) : <span className="text-xs text-gray-400">Unassigned</span>}
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="email or username"
                              value={quickAssign[task._id] || ''}
                              onChange={(e) => setQuickAssign(q => ({ ...q, [task._id]: e.target.value }))}
                              className="border rounded px-2 py-1 text-xs"
                              style={{ width: '180px' }}
                            />
                            <button
                              className="text-xs btn-secondary"
                              onClick={() => handleQuickAssign(task._id)}
                            >Assign</button>
                            <button
                              className="text-xs btn-secondary"
                              onClick={() => handleAssignToMe(task._id)}
                            >Assign to me</button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : <span className="text-xs text-gray-400">No due date</span>}
                        </td>
                      </tr>
                    ))}
                    {!tasksLoading && !tasksError && filteredTasks.length === 0 && (
                      <tr><td colSpan="4" className="py-4 text-center text-sm text-gray-500">No tasks match filters.</td></tr>
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
              <h2 className="text-2xl font-bold text-gray-900">Members</h2>
              {isOwnerOrAdmin() && (
                <button
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <UserPlusIcon className="w-4 h-4" />
                  <span>Invite Member</span>
                </button>
              )}
            </div>

            <div className="card">
              <div className="space-y-4">
                {workspace.members.map((member) => (
                  <div key={member._id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
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
                      <h4 className="font-medium text-gray-900">
                        {member.user.firstName} {member.user.lastName}
                      </h4>
                      <p className="text-sm text-gray-500">{member.user.email}</p>
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
                          className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                        >
                          <PencilIcon className="w-3 h-3" />
                        </button>
                      )}
                      {canRemoveMember(member) && (
                        <button
                          onClick={() => openRemoveMemberModal(member)}
                          disabled={removingMemberId === (member.user._id || member.user.id)}
                          className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-200 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {removingMemberId === (member.user._id || member.user.id) ? (
                            <div className="flex items-center space-x-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-red-600"></div>
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
      </main>

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <form onSubmit={handleCreateTask}>
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">New Task</h2>
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >×</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    value={newTask.title}
                    onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Task title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={e => setNewTask(t => ({ ...t, description: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={e => setNewTask(t => ({ ...t, dueDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={e => setNewTask(t => ({ ...t, priority: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assignees</label>
                  <UserFuzzySelect
                    workspaceId={workspaceId}
                    onSelect={(u) => setNewTask(t => ({
                      ...t,
                      assignees: (t.assignees || []).some(x => (x._id || x) === u._id)
                        ? t.assignees
                        : [...(t.assignees || []), u]
                    }))}
                  />
                  {newTask.assignees && newTask.assignees.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newTask.assignees.map((a, idx) => (
                        <span key={`${a._id || a}-${idx}`} className="inline-flex items-center gap-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                          <span>{a.displayName || a.email || a}</span>
                          <button
                            type="button"
                            className="text-gray-500 hover:text-gray-700"
                            onClick={() => setNewTask(t => ({
                              ...t,
                              assignees: t.assignees.filter(x => (x._id || x) !== (a._id || a))
                            }))}
                          >×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="btn-secondary"
                  disabled={creatingTask}
                >Cancel</button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creatingTask || !newTask.title}
                >{creatingTask ? 'Creating...' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceDetail;