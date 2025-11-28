import React from 'react';
import { 
  XMarkIcon, 
  ExclamationTriangleIcon,
  UserMinusIcon 
} from '@heroicons/react/24/outline';

const RemoveMemberModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  member, 
  isCurrentUser,
  loading = false 
}) => {
  if (!isOpen || !member) return null;

  const handleConfirm = () => {
    onConfirm(member.user._id || member.user.id, `${member.user.firstName} ${member.user.lastName}`);
  };

  const isOwner = member.role === 'owner';
  const actionText = isCurrentUser ? 'Leave Workspace' : 'Remove Member';
  const warningText = isCurrentUser 
    ? 'Are you sure you want to leave this workspace?' 
    : `Are you sure you want to remove ${member.user.firstName} ${member.user.lastName} from this workspace?`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <UserMinusIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{actionText}</h2>
              <p className="text-sm text-gray-500">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Member Info */}
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg mb-6">
            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
              {member.user.avatar ? (
                <img
                  src={`${member.user.avatar}?t=${Date.now()}`}
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-gray-700">
                  {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">
                {member.user.firstName} {member.user.lastName}
                {isCurrentUser && <span className="text-blue-600"> (You)</span>}
              </h4>
              <p className="text-sm text-gray-500">{member.user.email}</p>
              <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                member.role === 'owner' 
                  ? 'bg-purple-100 text-purple-800'
                  : member.role === 'admin'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {member.role.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 mb-1">
                {isCurrentUser ? 'Leave Workspace' : 'Remove Member'}
              </h4>
              <p className="text-sm text-red-700">{warningText}</p>
              {isCurrentUser && (
                <p className="text-sm text-red-600 mt-2">
                  You will lose access to all workspace content and will need to be re-invited to rejoin.
                </p>
              )}
              {!isCurrentUser && (
                <p className="text-sm text-red-600 mt-2">
                  They will lose access to all workspace content and will need to be re-invited to rejoin.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || isOwner}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{isCurrentUser ? 'Leaving...' : 'Removing...'}</span>
              </>
            ) : (
              <>
                <UserMinusIcon className="w-4 h-4" />
                <span>{isCurrentUser ? 'Leave Workspace' : 'Remove Member'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemoveMemberModal;