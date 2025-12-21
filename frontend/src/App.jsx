import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConnectionProvider } from './context/ConnectionContext';
import ProtectedRoute from './components/ProtectedRoute';
import ChatbotProvider from './components/ChatbotProvider';
import Login from './pages/Login';
import Register from './pages/Register';
import ActivateAccount from './pages/ActivateAccount';
import Home from './pages/Home';
import Workspaces from './pages/Workspaces';
import WorkspaceDetail from './pages/WorkspaceDetail';
import TaskDetail from './pages/TaskDetail';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import DocumentEditor from './pages/DocumentEditor';
import Messages from './pages/Messages';
import ChatRoom from './pages/ChatRoom';
import Connections from './pages/Connections';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ConnectionProvider>
          <ToastProvider>
            <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/activate" element={<ActivateAccount />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <ChatbotProvider>
                    <Home />
                  </ChatbotProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspaces"
              element={
                <ProtectedRoute>
                  <ChatbotProvider>
                    <Workspaces />
                  </ChatbotProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspace/:workspaceId"
              element={
                <ProtectedRoute>
                  <ChatbotProvider>
                    <WorkspaceDetail />
                  </ChatbotProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ChatbotProvider>
                    <Profile />
                  </ChatbotProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/:userId"
              element={
                <ProtectedRoute>
                  <ChatbotProvider>
                    <UserProfile />
                  </ChatbotProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <ChatbotProvider>
                    <Dashboard />
                  </ChatbotProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <ChatbotProvider>
                    <Calendar />
                  </ChatbotProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks/:id"
              element={
                <ProtectedRoute>
                  <ChatbotProvider>
                    <TaskDetail />
                  </ChatbotProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents/:id"
              element={
                <ProtectedRoute>
                  <ChatbotProvider>
                    <DocumentEditor />
                  </ChatbotProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <ChatbotProvider>
                    <Messages />
                  </ChatbotProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/connections"
              element={
                <ProtectedRoute>
                  <ChatbotProvider>
                    <Connections />
                  </ChatbotProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages/:userId"
              element={
                <ProtectedRoute>
                  <ChatbotProvider>
                    <ChatRoom />
                  </ChatbotProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </ToastProvider>
        </ConnectionProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
