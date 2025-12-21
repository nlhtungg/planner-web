import React, { useState } from 'react';
import ChatbotButton from '../components/ChatbotButton';
import ChatbotModal from '../components/ChatbotModal';

/**
 * Chatbot Provider
 * Wraps protected routes to add floating chatbot button
 */
const ChatbotProvider = ({ children }) => {
  const [chatbotOpen, setChatbotOpen] = useState(false);

  return (
    <>
      {children}
      <ChatbotButton onClick={() => setChatbotOpen(true)} />
      <ChatbotModal isOpen={chatbotOpen} onClose={() => setChatbotOpen(false)} />
    </>
  );
};

export default ChatbotProvider;
