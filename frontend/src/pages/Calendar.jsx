import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  getCalendarEvents, 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent 
} from '../services/calendarService';
import { getMyWorkspaces } from '../services/workspaceService';
import {
  HomeIcon,
  BriefcaseIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  BellIcon,
  Cog6ToothIcon,
  ArrowLeftIcon,
  FunnelIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

// Setup moment localizer
const localizer = momentLocalizer(moment);

const Calendar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('all');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    status: 'todo',
    workspace: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sidebarItems = [
    { id: 'home', name: 'Home', icon: HomeIcon, path: '/home' },
    { id: 'workspaces', name: 'Workspaces', icon: BriefcaseIcon, path: '/workspaces' },
    { id: 'connections', name: 'Connections', icon: UserGroupIcon },
    { id: 'messages', name: 'Messages', icon: ChatBubbleLeftRightIcon },
    { id: 'calendar', name: 'Calendar', icon: CalendarDaysIcon, path: '/calendar', active: true },
  ];

  useEffect(() => {
    fetchData();
  }, [selectedWorkspace]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      
      // Fetch workspaces
      const workspacesResponse = await getMyWorkspaces();
      // Backend returns { success, message, data: workspaces[] }
      const fetchedWorkspaces = workspacesResponse.data || [];
      console.log('Workspaces fetched:', fetchedWorkspaces.length, fetchedWorkspaces);
      setWorkspaces(fetchedWorkspaces);

      // Fetch calendar events (tasks with dueDate)
      const params = {};
      if (selectedWorkspace !== 'all') {
        params.workspace = selectedWorkspace;
      }
      
      console.log('Fetching calendar events with params:', params);
      const eventsResponse = await getCalendarEvents(params);
      console.log('Calendar events response:', eventsResponse);
      
      setEvents(eventsResponse.data.events || []);
      console.log('Events set:', eventsResponse.data.events?.length || 0, 'events');
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
    // Open edit modal
    setModalMode('edit');
    setSelectedEvent(event);
    setFormData({
      title: event.resource.title,
      description: event.resource.description || '',
      dueDate: moment(event.resource.dueDate).format('YYYY-MM-DD'),
      priority: event.resource.priority || 'medium',
      status: event.resource.status || 'todo',
      workspace: event.resource.workspace || ''
    });
    setShowModal(true);
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
      status: 'todo',
      workspace: selectedWorkspace !== 'all' ? selectedWorkspace : '' // Empty = personal task
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
      status: 'todo',
      workspace: ''
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
        // Create new calendar event
        const eventData = { ...formData };
        
        // If no workspace selected, remove it (personal event)
        if (!eventData.workspace) {
          delete eventData.workspace;
        }
        
        await createCalendarEvent(eventData);
        alert('Event created successfully!');
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
        border: '0px',
        display: 'block',
        fontSize: '0.875rem',
        padding: '2px 5px',
      }
    };
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
        <span className="text-xl font-bold text-gray-900">
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

        <div className="flex items-center space-x-2">
          <select
            value={selectedWorkspace}
            onChange={(e) => setSelectedWorkspace(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Workspaces</option>
            <option value="personal">Personal Tasks Only</option>
            {workspaces.map(workspace => (
              <option key={workspace._id} value={workspace._id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Planner</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
              <BellIcon className="w-6 h-6 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Cog6ToothIcon className="w-6 h-6 text-gray-600" />
            </button>
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <nav className="p-4 space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => item.path && navigate(item.path)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  item.active
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                  </button>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Calendar</h2>
                    <p className="text-gray-600 text-sm mt-1">View and manage your tasks by date</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setModalMode('create');
                    setSelectedEvent(null);
                    setFormData({
                      title: '',
                      description: '',
                      dueDate: moment().format('YYYY-MM-DD'),
                      priority: 'medium',
                      status: 'todo',
                      workspace: selectedWorkspace !== 'all' ? selectedWorkspace : ''
                    });
                    setShowModal(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>Create Event</span>
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="mb-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center space-x-6">
                <span className="text-sm font-medium text-gray-700">Priority:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm text-gray-600">High</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span className="text-sm text-gray-600">Medium</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm text-gray-600">Low</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-500 rounded opacity-60"></div>
                  <span className="text-sm text-gray-600">Completed</span>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <XMarkIcon className="w-5 h-5 text-red-600" />
                  <p className="text-red-600 font-medium">{error}</p>
                </div>
                <button
                  onClick={fetchData}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Calendar */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200" style={{ height: '700px' }}>
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading calendar...</p>
                  </div>
                </div>
              ) : events.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium mb-2">No events found</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Click on a date to create your first event
                    </p>
                  </div>
                </div>
              ) : (
                <BigCalendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  eventPropGetter={eventStyleGetter}
                  views={['month', 'week', 'day', 'agenda']}
                  view={view}
                  onView={setView}
                  date={date}
                  onNavigate={setDate}
                  components={{
                    toolbar: CustomToolbar,
                  }}
                  popup
                  selectable
                />
              )}
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">{events.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CalendarDaysIcon className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">High Priority</p>
                    <p className="text-2xl font-bold text-red-600">
                      {events.filter(e => e.resource.priority === 'high').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-red-600 font-bold text-xl">!</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">In Progress</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {events.filter(e => e.resource.status === 'in-progress').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <div className="w-6 h-6 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {events.filter(e => e.resource.status === 'done').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

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
                <XMarkIcon className="w-6 h-6 text-gray-600" />
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

              {/* Workspace */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace <span className="text-gray-400 text-xs">(Optional - leave empty for personal task)</span>
                </label>
                <select
                  value={formData.workspace}
                  onChange={(e) => setFormData({ ...formData, workspace: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">📝 Personal Task (No Workspace)</option>
                  {workspaces.length === 0 ? (
                    <option disabled>No workspaces available</option>
                  ) : (
                    workspaces.map(workspace => (
                      <option key={workspace._id} value={workspace._id}>
                        🏢 {workspace.name}
                      </option>
                    ))
                  )}
                </select>
                {!formData.workspace ? (
                  <p className="mt-1 text-xs text-gray-500">
                    💡 This will be a personal task visible only to you
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-blue-600">
                    ✓ This task will appear in the selected workspace and calendar
                  </p>
                )}
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
                      <TrashIcon className="w-5 h-5" />
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
      <style jsx>{`
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
    </div>
  );
};

export default Calendar;
