import React, { useState, useRef, useEffect, useMemo } from 'react';
import { assignTask, assignTaskByIdentifier, unassignTask } from '../services/taskService';
import { searchMembers } from '../services/workspace';
import { UserPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

const TaskAssigneeCell = ({
  task,
  members = [],
  onUpdate,
  enableSearch = false,
  workspaceId,
  currentUserId,
  searchLimit = 10,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchItems, setSearchItems] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update dropdown position when opened with smart positioning
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        const rect = buttonRef.current.getBoundingClientRect();
        const dropdownWidth = 256; // w-64 = 16rem = 256px
        const dropdownHeight = 400; // estimated max height
        const spacing = 8;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let top = rect.bottom + spacing;
        let left = rect.left;
        
        // Check if dropdown would overflow right edge
        if (left + dropdownWidth > viewportWidth - 16) {
          // Position from right edge of button instead
          left = rect.right - dropdownWidth;
          // If still overflows, align with right edge of viewport
          if (left < 16) {
            left = viewportWidth - dropdownWidth - 16;
          }
        }
        
        // Ensure minimum left margin on small screens
        if (left < 16) {
          left = 16;
        }
        
        // Check if dropdown would overflow bottom edge
        if (top + dropdownHeight > viewportHeight - 16) {
          // Position above the button instead
          top = rect.top - dropdownHeight - spacing;
          // If still overflows top, position at top of viewport
          if (top < 16) {
            top = 16;
          }
        }
        
        setDropdownPosition({ top, left });
      };
      
      updatePosition();
      
      // Recalculate on window resize or scroll
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen]);

  const handleAssign = async (userId) => {
    try {
      setLoading(true);
      await assignTask(task._id, userId);
      onUpdate?.();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to assign task:', error);
      alert(error.response?.data?.message || 'Failed to assign task');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignByIdentifier = async (identifier) => {
    const val = (identifier || '').trim();
    if (!val) return;
    try {
      setLoading(true);
      await assignTaskByIdentifier(task._id, val);
      onUpdate?.();
      setIsOpen(false);
      setSearchQuery('');
      setSearchItems([]);
    } catch (error) {
      console.error('Failed to assign task by identifier:', error);
      alert(error.response?.data?.message || 'Failed to assign task');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async (userId) => {
    try {
      setLoading(true);
      await unassignTask(task._id, userId);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to unassign task:', error);
      alert(error.response?.data?.message || 'Failed to unassign task');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToMe = async () => {
    if (!currentUserId) return;
    if (isAssigned(currentUserId)) return;
    await handleAssign(currentUserId);
  };

  const isAssigned = (userId) => {
    return task.assignees.some(a => (a._id || a) === userId);
  };

  const canSearch = enableSearch && Boolean(workspaceId);

  useEffect(() => {
    if (!canSearch || !isOpen) return;
    const handler = setTimeout(async () => {
      const q = searchQuery.trim();
      if (q.length > 0 && q.length < 2) {
        setSearchItems([]);
        return;
      }
      setSearchLoading(true);
      try {
        const results = await searchMembers(workspaceId, q, searchLimit);
        setSearchItems(Array.isArray(results) ? results : []);
      } catch (e) {
        setSearchItems([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [canSearch, isOpen, searchQuery, workspaceId, searchLimit]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchItems([]);
      setSearchLoading(false);
    }
  }, [isOpen]);

  const displayedMembers = useMemo(() => members || [], [members]);

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 items-center" ref={buttonRef}>
        {task.assignees && task.assignees.length > 0 ? (
          task.assignees.map((assignee) => (
            <div 
              key={assignee._id || assignee} 
              className="relative group w-8 h-8"
            >
              <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden shadow-sm cursor-default" title={assignee.firstName ? `${assignee.firstName} ${assignee.lastName}` : ''}>
                {assignee.avatar ? (
                  <img src={assignee.avatar} alt={assignee.firstName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      {(assignee.firstName?.[0] || '?')}{(assignee.lastName?.[0] || '')}
                    </span>
                  </div>
                )}
              </div>
              {/* Remove button on hover */}
              <button
                onClick={(e) => { e.stopPropagation(); handleUnassign(assignee._id || assignee); }}
                disabled={loading}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600 z-10 disabled:opacity-50"
                title="Remove assignee"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
          ))
        ) : (
          <span className="text-xs text-gray-400 italic mr-2">Unassigned</span>
        )}
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
          title="Add assignee"
        >
          <UserPlusIcon className="w-4 h-4" />
        </button>
      </div>

      {isOpen && (
        <div 
          ref={dropdownRef}
          className="fixed z-[9999] w-64 max-h-[400px] bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
        >
          <div className="p-2 border-b border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-slate-700/50 flex-shrink-0">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wider">Assign to</h4>
          </div>

          {canSearch && (
            <div className="p-2 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-slate-800 space-y-2 flex-shrink-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (searchItems.length > 0) {
                      const first = searchItems[0];
                      const uid = first?._id || first?.id;
                      if (uid) handleAssign(uid);
                    } else {
                      handleAssignByIdentifier(searchQuery);
                    }
                  }
                }}
                placeholder="Assign by name, email, or username..."
                className="input-field text-sm"
                disabled={loading}
              />

              <div className="space-y-1">
                {currentUserId && (
                  <button
                    type="button"
                    onClick={handleAssignToMe}
                    disabled={loading || isAssigned(currentUserId)}
                    className={`w-full flex items-center px-2 py-2 text-sm text-left transition-colors rounded ${
                      isAssigned(currentUserId)
                        ? 'opacity-50 cursor-default bg-gray-50 dark:bg-slate-700/50'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="font-medium text-primary">Assign to me</span>
                    {isAssigned(currentUserId) && (
                      <span className="text-xs text-green-500 font-medium ml-2">Assigned</span>
                    )}
                  </button>
                )}

                {searchQuery.trim().length >= 2 && (
                  <div className="max-h-44 overflow-y-auto">
                    {searchLoading ? (
                      <div className="px-2 py-2 text-sm text-secondary">Searching...</div>
                    ) : searchItems.length > 0 ? (
                      searchItems.map((u) => {
                        const userId = u._id || u.id;
                        const assigned = isAssigned(userId);
                        return (
                          <button
                            key={userId}
                            type="button"
                            onClick={() => !assigned && userId && handleAssign(userId)}
                            disabled={assigned || loading}
                            className={`w-full flex items-center px-2 py-2 text-sm text-left transition-colors rounded ${
                              assigned ? 'opacity-50 cursor-default bg-gray-50 dark:bg-slate-700/50' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-full overflow-hidden mr-2 flex-shrink-0">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.displayName || u.firstName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-gray-600 dark:text-slate-300 text-xs font-bold">
                                  {(u.displayName || u.firstName || '?').slice(0, 1)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-primary truncate">{u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim()}</p>
                              <p className="text-xs text-secondary truncate">{u.email || u.username || ''}</p>
                            </div>
                            {assigned && (
                              <span className="text-xs text-green-500 font-medium ml-2">Assigned</span>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left px-2 py-2 text-sm text-secondary hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded"
                        disabled={loading}
                        onClick={() => handleAssignByIdentifier(searchQuery)}
                        title="Assign by identifier (email/username)"
                      >
                        No matches. Press Enter to assign “{searchQuery.trim()}”.
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto">
            {displayedMembers.map((member) => {
              const assigned = isAssigned(member.user._id);
              return (
                <button
                  key={member.user._id}
                  onClick={() => !assigned && handleAssign(member.user._id)}
                  disabled={assigned || loading}
                  className={`w-full flex items-center px-4 py-2 text-sm text-left transition-colors ${
                    assigned ? 'opacity-50 cursor-default bg-gray-50 dark:bg-slate-700/50' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden mr-3 flex-shrink-0">
                    {member.user.avatar ? (
                      <img src={member.user.avatar} alt={member.user.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-gray-600 dark:text-slate-300 text-xs font-bold">
                        {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-primary truncate">
                      {member.user.firstName} {member.user.lastName}
                    </p>
                    <p className="text-xs text-secondary truncate">{member.user.email}</p>
                  </div>
                  {assigned && (
                    <span className="text-xs text-green-500 font-medium ml-2">Assigned</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskAssigneeCell;
