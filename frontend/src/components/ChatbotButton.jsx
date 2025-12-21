import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';

/**
 * Floating AI Chatbot Button - Festive Theme with Dark/Light mode
 * Can be used on any page
 */
const ChatbotButton = ({ onClick }) => {
  const { isDark } = useTheme();
  
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-40 p-4 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all transform hover:scale-110 group animate-bounce ${isDark ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700' : 'bg-gradient-to-r from-red-600 via-rose-500 to-pink-600 hover:from-red-700 hover:to-pink-700'}`}
      title={`${isDark ? '🌙' : '🎄'} Festive Suit Chatbot`}
      style={{ animationDuration: '3s' }}
    >
      <SparklesIcon className="w-7 h-7" />
      <span className="absolute -top-1 -right-1 flex h-4 w-4">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isDark ? 'bg-cyan-400' : 'bg-yellow-400'}`}></span>
        <span className={`relative inline-flex rounded-full h-4 w-4 border-2 border-white ${isDark ? 'bg-cyan-300' : 'bg-yellow-300'}`}></span>
      </span>
      
      {/* Tooltip */}
      <span className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {isDark ? '🌙' : '🎄'} Festive Suit Chatbot
      </span>
    </button>
  );
};

export default ChatbotButton;
