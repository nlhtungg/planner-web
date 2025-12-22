import React from 'react';
import { useLocation } from 'react-router-dom';
import ReindeerSanta from './ReindeerSanta';

// Component wrapper để chỉ hiển thị tuần lộc khi không phải trang login/register
const AuthenticatedReindeer = () => {
  const location = useLocation();
  
  // Ẩn tuần lộc ở các trang public
  const publicPages = ['/login', '/register', '/activate'];
  const isPublicPage = publicPages.includes(location.pathname);
  
  if (isPublicPage) {
    return null;
  }
  
  return <ReindeerSanta />;
};

export default AuthenticatedReindeer;
