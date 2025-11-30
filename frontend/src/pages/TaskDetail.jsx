// TaskDetail.jsx - detailed task view with edit & time logging
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTask, updateTask, setEstimate, logTime, assignTask, assignTaskByIdentifier } from '../services/taskService';
import UserFuzzySelect from '../components/UserFuzzySelect';
import ProgressBars from '../components/ProgressBars';

const TaskDetail = () => {
  const { id: taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editData, setEditData] = useState({ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '' });
  const [saving, setSaving] = useState(false);
  const [estimateValue, setEstimateValue] = useState('');
  const [settingEstimate, setSettingEstimate] = useState(false);
  const [logHours, setLogHours] = useState('');
  const [logDescription, setLogDescription] = useState('');
  const [loggingTime, setLoggingTime] = useState(false);
  const [assigning, setAssigning] = useState(false);

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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = () => {
    if (!task || !user) return false;
    const role = task.workspace?.members?.find(m => (m.user._id || m.user.id) === (user._id || user.id))?.role;
    const isCreator = task.createdBy && (task.createdBy._id || task.createdBy) === (user._id || user.id);
    return isCreator || role === 'owner' || role === 'admin';
  };

  const isOwner = () => {
    if (!task || !user || !task.workspace?.owner) return false;
    return (task.workspace.owner._id || task.workspace.owner) === (user._id || user.id);
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

  const handleAssign = async (identifierOrUser) => {
    if (!identifierOrUser) return;
    setAssigning(true);
    try {
      let res;
      if (typeof identifierOrUser === 'string') {
        res = await assignTaskByIdentifier(task._id, identifierOrUser);
      } else {
        const userId = identifierOrUser._id || identifierOrUser.id;
        // avoid duplicate assignment
        if (task.assignees?.some(a => (a._id || a) === userId)) { setAssigning(false); return; }
        res = await assignTask(task._id, userId);
      }
      setTask(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign');
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignToMe = async () => {
    try {
      const meId = user._id || user.id;
      if (task.assignees?.some(a => (a._id || a) === meId)) return;
      const res = await assignTask(task._id, meId);
      setTask(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign to me');
    }
  };

  if (loading) return <div className="p-6">Loading task...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!task) return null;

  return (
    <div className="p-6 space-y-8">
      <button onClick={() => navigate(-1)} className="text-sm text-blue-600">← Back</button>
      <h1 className="text-2xl font-semibold">Task: {task.title}</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <form onSubmit={handleSave} className="space-y-4 border rounded p-4">
          <h2 className="font-medium text-lg">Edit Task</h2>
          {!canEdit() && <p className="text-xs text-gray-500">You cannot edit this task.</p>}
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input value={editData.title} onChange={e=>setEditData(d=>({...d,title:e.target.value}))} className="w-full border px-2 py-1 rounded" disabled={!canEdit()} />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea value={editData.description} onChange={e=>setEditData(d=>({...d,description:e.target.value}))} className="w-full border px-2 py-1 rounded" rows={3} disabled={!canEdit()} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Status</label>
              <select value={editData.status} onChange={e=>setEditData(d=>({...d,status:e.target.value}))} className="w-full border px-2 py-1 rounded" disabled={!canEdit()}>
                <option value="todo">Todo</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Priority</label>
              <select value={editData.priority} onChange={e=>setEditData(d=>({...d,priority:e.target.value}))} className="w-full border px-2 py-1 rounded" disabled={!canEdit()}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Due Date</label>
              <input type="date" value={editData.dueDate} onChange={e=>setEditData(d=>({...d,dueDate:e.target.value}))} className="w-full border px-2 py-1 rounded" disabled={!canEdit()} />
            </div>
          </div>
          <button type="submit" disabled={!canEdit()||saving} className="btn-primary">{saving? 'Saving...' : 'Save Changes'}</button>
        </form>
        <div className="space-y-6">
          <div className="border rounded p-4 space-y-4">
            <h2 className="font-medium text-lg">Tracking</h2>
            <ProgressBars
              estimatedHours={task.estimatedHours}
              loggedHours={task.loggedHours}
              manualProgress={task.progress}
              autoProgress={task.autoProgress}
            />
            {canEdit() && (
              <form onSubmit={handleSetEstimate} className="flex items-end space-x-2">
                <div className="flex-1">
                  <label className="block text-sm mb-1">Set / Update Estimate (hours)</label>
                  <input value={estimateValue} onChange={e=>setEstimateValue(e.target.value)} className="w-full border px-2 py-1 rounded" placeholder="e.g. 10" />
                </div>
                <button type="submit" disabled={settingEstimate} className="btn-secondary">{settingEstimate? 'Setting...' : 'Apply'}</button>
              </form>
            )}
            {canLogTime() && (
              <form onSubmit={handleLogTime} className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <input value={logHours} onChange={e=>setLogHours(e.target.value)} className="border px-2 py-1 rounded" placeholder="Hours" />
                  <input value={logDescription} onChange={e=>setLogDescription(e.target.value)} className="border px-2 py-1 rounded col-span-2" placeholder="Description (optional)" />
                </div>
                <button type="submit" disabled={loggingTime} className="btn-primary w-full">{loggingTime? 'Logging...' : 'Log Time'}</button>
              </form>
            )}
            <div className="pt-2 border-t mt-4 space-y-2">
              <h3 className="text-sm font-medium">Assign</h3>
              <p className="text-xs text-gray-500">Assign by fuzzy search or identifier (email/username).</p>
              <div className="flex items-center gap-2">
                <UserFuzzySelect
                  workspaceId={task.workspace?._id || task.workspace}
                  onSelect={(u) => handleAssign(u)}
                  className="flex-1"
                />
                <button className="btn-secondary" onClick={handleAssignToMe} disabled={assigning}>Assign to me</button>
              </div>
              {task.assignees && task.assignees.length>0 && (
                <div className="mt-1 text-xs text-gray-600">Assignees: {task.assignees.map(a=> (a.firstName? `${a.firstName} ${a.lastName||''}` : (a._id||a))).join(', ')}</div>
              )}
            </div>
          </div>
          <div className="border rounded p-4">
            <h2 className="font-medium text-lg mb-2">Time Entries</h2>
            {task.timeEntries && task.timeEntries.length>0 ? (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {task.timeEntries.slice().reverse().map((te, idx) => (
                  <li key={idx} className="text-sm flex justify-between">
                    <span>{(te.user?.firstName||'?')} {(te.user?.lastName||'')} • {te.hours}h{te.description? ' - '+te.description: ''}</span>
                    <span className="text-xs text-gray-400">{new Date(te.loggedAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-500">No time logged yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
export default TaskDetail;
