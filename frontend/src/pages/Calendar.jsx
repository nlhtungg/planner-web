import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { 
  getCalendarEvents, 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent 
} from '../services/calendarService';
import workspaceService from '../services/workspaceService';
import GlassPageContainer from '../components/layout/GlassPageContainer';
import GlassHeader from '../components/layout/GlassHeader';
import GlassCard from '../components/layout/GlassCard';
import {
  ArrowLeft,
  Filter,
  Plus,
  X,
  Trash2,
  Search
} from 'lucide-react';

// Setup moment localizer
const localizer = momentLocalizer(moment);

const Calendar = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceFilter, setWorkspaceFilter] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [selectedWorkspaceTask, setSelectedWorkspaceTask] = useState(null);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    status: 'todo'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Theme classes
  const textClass = isDark ? 'text-white' : 'text-slate-800';
  const textSecondaryClass = isDark ? 'text-slate-300/70' : 'text-slate-500';
  const glassCardClass = isDark ? 'bg-slate-900/40' : 'bg-white/60';
  const inputClass = isDark
    ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-white/20 focus:shadow-[0_0_18px_rgba(255,255,255,0.08)]'
    : 'bg-white/40 border-white/30 text-slate-800 placeholder:text-slate-500 focus:ring-2 focus:ring-white/50';

  useEffect(() => {
    fetchWorkspaces();
    fetchData();
  }, []);

  useEffect(() => {
    // Refetch events when filter changes
    fetchData();
  }, [workspaceFilter]);

  const fetchWorkspaces = async () => {
    try {
      const resp = await workspaceService.getMyWorkspaces(true);
      if (resp?.success && Array.isArray(resp.data)) {
        // Only keep workspaces user is a member/owner
        setWorkspaces(resp.data);
      }
    } catch (e) {
      console.error('Error fetching workspaces for calendar filter', e);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors

      const params = {};
      if (workspaceFilter) params.workspace = workspaceFilter;
      const eventsResponse = await getCalendarEvents(params);
      setEvents(eventsResponse.data.events || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Set error message
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load calendar';
      setError(errorMsg);
      
      // Keep empty events array so calendar still renders
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (event) => {
    // Check if this is a personal event or workspace task
    const isPersonalEvent = event.resource.isPersonal || !event.resource.workspace;
    
    if (isPersonalEvent) {
      // Personal event: Open edit modal
      setModalMode('edit');
      setSelectedEvent(event);
      setFormData({
        title: event.resource.title,
        description: event.resource.description || '',
        dueDate: moment(event.resource.dueDate).format('YYYY-MM-DD'),
        priority: event.resource.priority || 'medium',
        status: event.resource.status || 'todo'
      });
      setShowModal(true);
    } else {
      // Workspace task: Show info modal
      setSelectedWorkspaceTask(event);
      setShowWorkspaceModal(true);
    }
  };

  const handleGoToWorkspace = () => {
    if (selectedWorkspaceTask?.resource?.workspace) {
      const workspace = selectedWorkspaceTask.resource.workspace;
      const workspaceId = typeof workspace === 'object' ? workspace._id : workspace;
      navigate(`/workspace/${workspaceId}`);
    }
    setShowWorkspaceModal(false);
  };

  const handleSelectSlot = (slotInfo) => {
    // Open create modal with selected date
    setModalMode('create');
    setSelectedEvent(null);
    setFormData({
      title: '',
      description: '',
      dueDate: moment(slotInfo.start).format('YYYY-MM-DD'),
      priority: 'medium',
      status: 'todo'
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      priority: 'medium',
      status: 'todo'
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    
    try {
      setSaving(true);
      setError('');
      
      if (modalMode === 'create') {
        // Create new calendar event (always personal - no workspace)
        const eventData = { ...formData };
        delete eventData.workspace; // Force personal task
        
        await createCalendarEvent(eventData);
        alert('Personal event created successfully!');
        fetchData(); // Refresh calendar
      } else {
        // Update existing event
        await updateCalendarEvent(selectedEvent.id, formData);
        alert('Event updated successfully!');
        fetchData(); // Refresh calendar
      }
      
      handleCloseModal();
    } catch (error) {
      console.error('Error saving task:', error);
      setError(error.response?.data?.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      setSaving(true);
      await deleteCalendarEvent(selectedEvent.id);
      
      alert('Event deleted successfully!');
      handleCloseModal();
      fetchData(); // Refresh calendar
    } catch (error) {
      console.error('Error deleting task:', error);
      setError(error.response?.data?.message || 'Failed to delete task');
    } finally {
      setSaving(false);
    }
  };

  const eventStyleGetter = (event) => {
    const task = event.resource;
    const isPersonalEvent = task.isPersonal || !task.workspace;
    let backgroundColor = '#3b82f6'; // Default blue

    // Color by priority
    if (task.priority === 'high') {
      backgroundColor = '#ef4444'; // Red
    } else if (task.priority === 'medium') {
      backgroundColor = '#f59e0b'; // Orange
    } else if (task.priority === 'low') {
      backgroundColor = '#10b981'; // Green
    }

    // Dim if completed
    if (task.status === 'done') {
      backgroundColor = '#6b7280'; // Gray
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: task.status === 'done' ? 0.6 : 1,
        color: 'white',
        border: isPersonalEvent ? '0px' : '2px solid white',
        display: 'block',
        fontSize: '0.875rem',
        padding: '2px 5px',
        cursor: isPersonalEvent ? 'pointer' : 'pointer',
        fontWeight: isPersonalEvent ? 'normal' : '600',
      }
    };
  };

  // Custom event component to show icon for workspace tasks
  const EventComponent = ({ event }) => {
    const isPersonalEvent = event.resource.isPersonal || !event.resource.workspace;
    return (
      <div className="flex items-center justify-between">
        <span className="truncate">{event.title}</span>
        {!isPersonalEvent && (
          <BriefcaseIcon className="w-3 h-3 ml-1 flex-shrink-0" />
        )}
      </div>
    );
  };

  const CustomToolbar = (toolbar) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToToday = () => {
      toolbar.onNavigate('TODAY');
    };

    const label = () => {
      const date = moment(toolbar.date);
      return (
        <span className={`text-xl font-bold ${textClass}`}>
          {date.format('MMMM YYYY')}
        </span>
      );
    };

    return (
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={goToBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Workspace Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              className="border px-2 py-1 rounded text-sm"
              value={workspaceFilter}
              onChange={(e) => setWorkspaceFilter(e.target.value)}
            >
              <option value="">All (personal + workspaces)</option>
              {workspaces.map(ws => (
                <option key={ws._id} value={ws._id}>{ws.name}</option>
              ))}
            </select>
            {workspaceFilter && (
              <button className="text-xs text-blue-600" onClick={() => setWorkspaceFilter('')}>Clear</button>
            )}
          </div>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Today
          </button>
          <button
            onClick={goToNext}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {label()}
      </div>
    );
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <GlassPageContainer className="p-2 sm:p-4 md:p-6 max-w-7xl mx-auto">
      <GlassHeader activeNav="calendar">
        {/* Search Bar */}
        <div className="relative flex justify-end mb-4 sm:mb-6">
          <div className="relative w-full sm:w-80 md:w-96">
            <Search className={`w-4 h-4 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 ${textSecondaryClass}`} />
            <input
              type="text"
              placeholder="Search events..."
              className={`backdrop-blur-xl border rounded-full w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm transition-all focus:outline-none ${inputClass}`}
            />
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className={`mb-4 ${isDark ? 'bg-red-900/40' : 'bg-red-50/80'} backdrop-blur-xl border ${isDark ? 'border-red-500/30' : 'border-red-200'} rounded-2xl p-4`}>
            <div className="flex items-center justify-between">
              <p className={`text-sm ${isDark ? 'text-red-200' : 'text-red-700'}`}>{error}</p>
              <button
                onClick={() => setError('')}
                className={`text-sm ${isDark ? 'text-red-200 hover:text-white' : 'text-red-600 hover:text-red-800'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <GlassCard className="flex flex-col flex-1 overflow-hidden calendar-wrapper">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${textClass}`}>Calendar</h2>
            <button 
              onClick={() => {
                setModalMode('create');
                setFormData({ title: '', description: '', dueDate: '', priority: 'medium', status: 'todo' });
                setShowModal(true);
              }}
              className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white text-sm font-medium transition-all ${isDark ? 'shadow-[0_0_22px_rgba(59,130,246,0.35)]' : 'shadow-lg'}`}
            >
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDark ? 'border-white' : 'border-blue-600'}`}></div>
            </div>
          ) : (
            <div className="dashboard-scroll flex-1 overflow-auto">
              <div className={`${glassCardClass} backdrop-blur-xl border ${isDark ? 'border-white/10' : 'border-white/40'} rounded-2xl p-4`} style={{ minHeight: '700px' }}>
                <BigCalendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%', minHeight: '650px' }}
                  onSelectSlot={handleSelectSlot}
                  onSelectEvent={handleSelectEvent}
                  selectable
                  eventPropGetter={eventStyleGetter}
                  components={{
                    event: EventComponent,
                    toolbar: CustomToolbar
                  }}
                  view={view}
                  onView={setView}
                  date={date}
                  onNavigate={setDate}
                />
              </div>
            </div>
          )}
        </GlassCard>
      </GlassHeader>

      {/* Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {modalMode === 'create' ? 'Create New Task' : 'Edit Task'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task title"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task description"
                />
              </div>

              {/* Personal Task Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Personal Calendar Event</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Events created here are personal and editable. Workspace tasks with due dates will also appear but are read-only - click them to navigate to the workspace for editing.
                    </p>
                  </div>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Priority and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                  {modalMode === 'edit' && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={saving}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={saving}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : (modalMode === 'create' ? 'Create Task' : 'Save Changes')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom CSS for calendar styling */}
      <style>{`
        .rbc-calendar {
          font-family: inherit;
        }
        
        .rbc-header {
          padding: 12px 8px;
          font-weight: 600;
          color: #374151;
          background-color: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }

        .rbc-today {
          background-color: #eff6ff;
        }

        .rbc-date-cell {
          padding: 8px;
        }

        .rbc-date-cell.rbc-now {
          font-weight: bold;
        }

        .rbc-date-cell.rbc-now .rbc-button-link {
          background-color: #2563eb;
          color: white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        .rbc-off-range {
          color: #d1d5db;
        }

        .rbc-off-range-bg {
          background-color: #fafafa;
        }

        .rbc-event {
          padding: 2px 5px;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .rbc-event:hover {
          opacity: 0.8;
          cursor: pointer;
        }

        .rbc-event-label {
          font-size: 0.75rem;
        }

        .rbc-month-view {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .rbc-month-row {
          border-color: #e5e7eb;
          min-height: 100px;
        }

        .rbc-day-bg {
          border-color: #e5e7eb;
        }

        .rbc-day-bg:hover {
          background-color: #f9fafb;
        }
      `}</style>

      {/* Workspace Task Info Modal */}
      {showWorkspaceModal && selectedWorkspaceTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BriefcaseIcon className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Workspace Task</h3>
                  <p className="text-sm text-gray-500">Read-only view</p>
                </div>
              </div>
              <button
                onClick={() => setShowWorkspaceModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Info Banner */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-900">Cannot Edit Here</p>
                    <p className="text-xs text-orange-700 mt-1">
                      This is a workspace task. To edit or manage it, please go to the workspace where it was created.
                    </p>
                  </div>
                </div>
              </div>

              {/* Task Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                  <p className="text-base font-semibold text-gray-900">{selectedWorkspaceTask.title}</p>
                </div>

                {selectedWorkspaceTask.resource.description && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                    <p className="text-sm text-gray-700">{selectedWorkspaceTask.resource.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                    <p className="text-sm text-gray-900">{moment(selectedWorkspaceTask.resource.dueDate).format('MMM DD, YYYY')}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedWorkspaceTask.resource.priority === 'high' ? 'bg-red-100 text-red-800' :
                      selectedWorkspaceTask.resource.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {selectedWorkspaceTask.resource.priority}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedWorkspaceTask.resource.status === 'done' ? 'bg-gray-100 text-gray-800' :
                    selectedWorkspaceTask.resource.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedWorkspaceTask.resource.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowWorkspaceModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleGoToWorkspace}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center space-x-2"
              >
                <BriefcaseIcon className="w-4 h-4" />
                <span>Go to Workspace</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </GlassPageContainer>
  );
};

export default Calendar;
