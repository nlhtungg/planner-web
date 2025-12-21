import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';

/**
 * Floating AI Chatbot Button
 * Can be used on any page
 */
const ChatbotButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 p-4 text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full shadow-2xl hover:shadow-3xl transition-all transform hover:scale-110 group"
      title="AI Chatbot Assistant"
    >
      <SparklesIcon className="w-7 h-7 animate-pulse" />
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-ping"></span>
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></span>
      
      {/* Tooltip */}
      <span className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        AI Chatbot Assistant
      </span>
    </button>
  );
};

export default ChatbotButton;
