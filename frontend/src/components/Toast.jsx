import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const Toast = ({ message, type = 'info', onClose, duration = 4000 }) => {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const typeStyles = {
        success: {
            bg: 'bg-green-50 border-green-200',
            icon: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
            text: 'text-green-800'
        },
        error: {
            bg: 'bg-red-50 border-red-200',
            icon: <XCircleIcon className="h-5 w-5 text-red-500" />,
            text: 'text-red-800'
        },
        warning: {
            bg: 'bg-yellow-50 border-yellow-200',
            icon: <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />,
            text: 'text-yellow-800'
        },
        info: {
            bg: 'bg-blue-50 border-blue-200',
            icon: <InformationCircleIcon className="h-5 w-5 text-blue-500" />,
            text: 'text-blue-800'
        }
    };

    const style = typeStyles[type] || typeStyles.info;

    return (
        <div className={`${style.bg} border ${style.text} px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 min-w-[300px] max-w-md animate-slide-in`}>
            <div className="flex-shrink-0">
                {style.icon}
            </div>
            <div className="flex-1">
                <p className="text-sm font-medium">{message}</p>
            </div>
            <button
                onClick={onClose}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <XMarkIcon className="h-5 w-5" />
            </button>
        </div>
    );
};

export default Toast;
