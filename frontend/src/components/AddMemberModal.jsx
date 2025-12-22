import React, { useState } from 'react';
import { 
  XMarkIcon, 
  UserPlusIcon, 
  ExclamationCircleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';

const AddMemberModal = ({ isOpen, onClose, onAddMember, loading = false }) => {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    role: 'member'
  });
  const [errors, setErrors] = useState({});

  const roles = [
    { value: 'member', label: 'Member', description: 'Can view and contribute to workspace content' },
    { value: 'admin', label: 'Admin', description: 'Can manage workspace and add/remove members' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onAddMember(formData);
      handleClose();
    } catch (error) {
      if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
      } else {
        setErrors({ submit: 'Failed to add member. Please try again.' });
      }
    }
  };

  const handleClose = () => {
    setFormData({ email: '', role: 'member' });
    setErrors({});
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (!isOpen) return null;

  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const textSecondaryClass = isDark ? 'text-slate-300' : 'text-gray-500';
  const glassCardClass = isDark ? 'bg-slate-900/90 backdrop-blur-xl border border-white/10' : 'bg-white/90 backdrop-blur-xl border border-white/20 shadow-xl';
  const inputClass = isDark
    ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-white/20 focus:ring-white/10'
    : 'bg-white/40 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`rounded-2xl ${glassCardClass} max-w-md w-full max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-blue-600/20' : 'bg-blue-100'}`}>
              <UserPlusIcon className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${textClass}`}>Add Member</h2>
              <p className={`text-sm ${textSecondaryClass}`}>Invite someone to join this workspace</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className={`block text-sm font-medium mb-2 ${textClass}`}>
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 transition-all ${
                  errors.email 
                    ? (isDark ? 'border-red-500/30 focus:ring-red-500/20' : 'border-red-300 focus:ring-red-500')
                    : inputClass
                }`}
              />
              {errors.email && (
                <div className="flex items-center space-x-1 mt-1">
                  <ExclamationCircleIcon className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                  <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>{errors.email}</p>
                </div>
              )}
              <p className={`text-xs mt-1 ${textSecondaryClass}`}>
                The user must have an account to be added to the workspace
              </p>
            </div>

            {/* Role Selection */}
            <div>
              <label htmlFor="role" className={`block text-sm font-medium mb-2 ${textClass}`}>
                Role
              </label>
              <div className="space-y-3">
                {roles.map((role) => (
                  <label key={role.value} className={`flex items-start space-x-3 cursor-pointer p-3 rounded-lg transition-all ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={formData.role === role.value}
                      onChange={handleChange}
                      className={`mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 ${isDark ? 'border-white/20' : 'border-gray-300'}`}
                    />
                    <div>
                      <div className={`font-medium ${textClass}`}>{role.label}</div>
                      <div className={`text-sm ${textSecondaryClass}`}>{role.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className={`flex items-center space-x-2 p-3 rounded-lg border ${isDark ? 'bg-red-900/30 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
                <ExclamationCircleIcon className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={`flex items-center justify-end space-x-3 mt-8 pt-6 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <button
              type="button"
              onClick={handleClose}
              className={`px-4 py-2 rounded-xl transition-all duration-300 disabled:opacity-50 ${isDark ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 flex items-center space-x-2 ${isDark ? 'shadow-[0_0_18px_rgba(59,130,246,0.3)]' : 'shadow-lg'}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <UserPlusIcon className="w-4 h-4" />
                  <span>Add Member</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;