import { BriefcaseIcon, ClockIcon, EllipsisVerticalIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function WorkspaceListItem({ workspace, onMenuClick }) {
  const navigate = useNavigate();
  const membersCount = Array.isArray(workspace.members) ? workspace.members.length : (workspace.memberCount || 0);
  const lastActivity = workspace.updatedAt ? new Date(workspace.updatedAt).toLocaleString() : workspace.lastActivity || '';
  const color = workspace.color || '#3B82F6';

  return (
    <div
      className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
      onClick={() => navigate(`/workspace/${workspace._id || workspace.id}`)}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color }}>
        <BriefcaseIcon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{workspace.name}</h4>
        {workspace.description && (
          <p className="text-sm text-gray-600">{workspace.description}</p>
        )}
        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
          {lastActivity && (
            <span className="flex items-center space-x-1">
              <ClockIcon className="w-3 h-3" />
              <span>{lastActivity}</span>
            </span>
          )}
          <span className="flex items-center space-x-1">
            <UserGroupIcon className="w-3 h-3" />
            <span>{membersCount} members</span>
          </span>
        </div>
      </div>
      <button className="p-1 text-gray-400 hover:text-gray-600" onClick={(e) => { e.stopPropagation(); onMenuClick?.(workspace); }}>
        <EllipsisVerticalIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
