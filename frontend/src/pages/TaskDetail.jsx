// TaskDetail.jsx - detailed task view with edit & time logging
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getTask, updateTask, setEstimate, logTime } from '../services/taskService';
import workspaceService from '../services/workspaceService';
import ProgressBars from '../components/ProgressBars';
import TaskAssigneeCell from '../components/TaskAssigneeCell';
import GlassPageContainer from '../components/layout/GlassPageContainer';
import GlassHeader from '../components/layout/GlassHeader';
import GlassCard from '../components/layout/GlassCard';
import { ArrowLeft, Save, Clock, User, CheckCircle2 } from 'lucide-react';

const TaskDetail = () => {
  const { id: taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [task, setTask] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editData, setEditData] = useState({ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '' });
  const [saving, setSaving] = useState(false);
  const [estimateValue, setEstimateValue] = useState('');
  const [settingEstimate, setSettingEstimate] = useState(false);
  const [logHours, setLogHours] = useState('');
  const [logDescription, setLogDescription] = useState('');
  const [loggingTime, setLoggingTime] = useState(false);

  useEffect(() => { fetchTask(); }, [taskId]);

  const fetchTask = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getTask(taskId);
      setTask(res.data);
      setEditData({
        title: res.data.title,
        description: res.data.description || '',
        status: res.data.status,
        priority: res.data.priority,
        dueDate: res.data.dueDate ? res.data.dueDate.substring(0,10) : ''
      });
      setEstimateValue(res.data.estimatedHours || '');
      
      // Fetch full workspace data with members
      if (res.data.workspace) {
        const workspaceId = res.data.workspace._id || res.data.workspace;
        try {
          const wsRes = await workspaceService.getWorkspace(workspaceId);
          setWorkspace(wsRes.data);
        } catch (wsErr) {
          console.error('Failed to load workspace:', wsErr);
          // Don't fail the whole page if workspace fetch fails
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = () => {
    if (!task || !user) return false;
    const role = workspace?.members?.find(m => (m.user._id || m.user.id) === (user._id || user.id))?.role;
    const isCreator = task.createdBy && (task.createdBy._id || task.createdBy) === (user._id || user.id);
    return isCreator || role === 'owner' || role === 'admin';
  };

  const isOwner = () => {
    if (!task || !user || !workspace?.owner) return false;
    return (workspace.owner._id || workspace.owner) === (user._id || user.id);
  };

  const canLogTime = () => {
    if (!task || !user) return false;
    const isAssignee = task.assignees?.some(a => (a._id || a) === (user._id || user.id));
    return isAssignee || isOwner();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit()) return;
    setSaving(true);
    try {
      const payload = {
        title: editData.title,
        description: editData.description,
        status: editData.status,
        priority: editData.priority,
        dueDate: editData.dueDate || undefined
      };
      const res = await updateTask(task._id, payload);
      setTask(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleSetEstimate = async (e) => {
    e.preventDefault();
    if (!canEdit()) return;
    const val = parseFloat(estimateValue);
    if (isNaN(val) || val <= 0) { alert('Enter a positive number'); return; }
    setSettingEstimate(true);
    try {
      const res = await setEstimate(task._id, val);
      setTask(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to set estimate');
    } finally {
      setSettingEstimate(false);
    }
  };

  const handleLogTime = async (e) => {
    e.preventDefault();
    if (!canLogTime()) return;
    const hoursVal = parseFloat(logHours);
    if (isNaN(hoursVal) || hoursVal <= 0) { alert('Enter valid hours'); return; }
    setLoggingTime(true);
    try {
      const res = await logTime(task._id, hoursVal, logDescription || undefined);
      setTask(res.data);
      setLogHours('');
      setLogDescription('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to log time');
    } finally {
      setLoggingTime(false);
    }
  };

  const refreshTask = async () => {
    await fetchTask();
  };

  // Theme classes
  const textClass = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondaryClass = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputClass = `w-full px-3 py-2 rounded-lg border transition-colors ${
    isDark 
      ? 'bg-white/5 border-white/10 text-slate-100 placeholder-slate-400 focus:bg-white/10 focus:border-blue-400' 
      : 'bg-white border-gray-300 text-slate-900 placeholder-gray-400 focus:border-blue-500'
  } focus:ring-2 focus:ring-blue-500/20 focus:outline-none`;
  const buttonPrimaryClass = `px-4 py-2 rounded-lg font-medium transition-all ${
    isDark
      ? 'bg-blue-600 hover:bg-blue-500 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white'
  } disabled:opacity-50 disabled:cursor-not-allowed`;
  const buttonSecondaryClass = `px-4 py-2 rounded-lg font-medium transition-all ${
    isDark
      ? 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'
      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
  } disabled:opacity-50 disabled:cursor-not-allowed`;

  if (loading) return (
    <GlassPageContainer>
      <div className="flex items-center justify-center h-64">
        <p className={textClass}>Loading task...</p>
      </div>
    </GlassPageContainer>
  );
  
  if (error) return (
    <GlassPageContainer>
      <div className="flex items-center justify-center h-64">
        <p className={`${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
      </div>
    </GlassPageContainer>
  );
  
  if (!task) return null;

  return (
    <GlassPageContainer>
      <GlassHeader 
        title={`Task: ${task.title}`}
        subtitle={task.description}
      />

      {/* Back button */}
      <button 
        onClick={() => navigate(-1)} 
        className={`flex items-center gap-2 mb-6 text-sm font-medium transition-colors ${
          isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit Task Form */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-6">
            <Save className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <h2 className={`text-lg font-semibold ${textClass}`}>Edit Task</h2>
          </div>
          
          {!canEdit() && (
            <p className={`text-xs ${textMutedClass} mb-4`}>
              You cannot edit this task.
            </p>
          )}
          
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondaryClass}`}>
                Title
              </label>
              <input 
                value={editData.title} 
                onChange={e => setEditData(d => ({...d, title: e.target.value}))} 
                className={inputClass}
                disabled={!canEdit()} 
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondaryClass}`}>
                Description
              </label>
              <textarea 
                value={editData.description} 
                onChange={e => setEditData(d => ({...d, description: e.target.value}))} 
                className={inputClass}
                rows={3} 
                disabled={!canEdit()} 
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${textSecondaryClass}`}>
                  Status
                </label>
                <select 
                  value={editData.status} 
                  onChange={e => setEditData(d => ({...d, status: e.target.value}))} 
                  className={inputClass}
                  disabled={!canEdit()}
                  style={isDark ? { colorScheme: 'dark' } : {}}
                >
                  <option value="todo">Todo</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${textSecondaryClass}`}>
                  Priority
                </label>
                <select 
                  value={editData.priority} 
                  onChange={e => setEditData(d => ({...d, priority: e.target.value}))} 
                  className={inputClass}
                  disabled={!canEdit()}
                  style={isDark ? { colorScheme: 'dark' } : {}}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${textSecondaryClass}`}>
                  Due Date
                </label>
                <input 
                  type="date" 
                  value={editData.dueDate} 
                  onChange={e => setEditData(d => ({...d, dueDate: e.target.value}))} 
                  className={inputClass}
                  disabled={!canEdit()}
                  style={isDark ? { colorScheme: 'dark' } : {}} 
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={!canEdit() || saving} 
              className={buttonPrimaryClass}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </GlassCard>

        {/* Tracking & Time Log */}
        <div className="space-y-6">
          {/* Tracking Card */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-6">
              <Clock className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              <h2 className={`text-lg font-semibold ${textClass}`}>Tracking</h2>
            </div>
            
            <div className="space-y-4">
              <ProgressBars
                estimatedHours={task.estimatedHours}
                loggedHours={task.loggedHours}
                manualProgress={task.progress}
                autoProgress={task.autoProgress}
              />
              
              {canEdit() && (
                <form onSubmit={handleSetEstimate} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                  <div className="flex-1">
                    <label className={`block text-sm font-medium mb-2 ${textSecondaryClass}`}>
                      Set / Update Estimate (hours)
                    </label>
                    <input 
                      value={estimateValue} 
                      onChange={e => setEstimateValue(e.target.value)} 
                      className={inputClass}
                      placeholder="e.g. 10" 
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={settingEstimate} 
                    className={buttonSecondaryClass}
                  >
                    {settingEstimate ? 'Setting...' : 'Apply'}
                  </button>
                </form>
              )}
              
              {canLogTime() && (
                <form onSubmit={handleLogTime} className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input 
                      value={logHours} 
                      onChange={e => setLogHours(e.target.value)} 
                      className={inputClass}
                      placeholder="Hours" 
                    />
                    <input 
                      value={logDescription} 
                      onChange={e => setLogDescription(e.target.value)} 
                      className={`${inputClass} sm:col-span-2`}
                      placeholder="Description (optional)" 
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={loggingTime} 
                    className={`${buttonPrimaryClass} w-full`}
                  >
                    {loggingTime ? 'Logging...' : 'Log Time'}
                  </button>
                </form>
              )}
              
              <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <User className={`w-4 h-4 ${textMutedClass}`} />
                  <h3 className={`text-sm font-medium ${textSecondaryClass}`}>Assign</h3>
                </div>
                <TaskAssigneeCell
                  task={task}
                  members={workspace?.members || []}
                  onUpdate={refreshTask}
                  enableSearch
                  workspaceId={task.workspace?._id || task.workspace}
                  currentUserId={user?._id || user?.id}
                />
              </div>
            </div>
          </GlassCard>

          {/* Time Entries Card */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              <h2 className={`text-lg font-semibold ${textClass}`}>Time Entries</h2>
            </div>
            
            {task.timeEntries && task.timeEntries.length > 0 ? (
              <ul className="space-y-3 max-h-64 overflow-y-auto">
                {task.timeEntries.slice().reverse().map((te, idx) => (
                  <li 
                    key={idx} 
                    className={`text-sm flex justify-between items-start p-3 rounded-lg ${
                      isDark ? 'bg-white/5' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex-1">
                      <p className={textClass}>
                        {te.user?.firstName || '?'} {te.user?.lastName || ''} • <span className="font-semibold">{te.hours}h</span>
                      </p>
                      {te.description && (
                        <p className={`text-xs mt-1 ${textMutedClass}`}>{te.description}</p>
                      )}
                    </div>
                    <span className={`text-xs ${textMutedClass} whitespace-nowrap ml-2`}>
                      {new Date(te.loggedAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`text-sm ${textMutedClass}`}>No time logged yet.</p>
            )}
          </GlassCard>
        </div>
      </div>
    </GlassPageContainer>
  );
};
export default TaskDetail;
