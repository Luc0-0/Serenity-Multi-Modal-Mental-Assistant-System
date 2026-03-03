/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 * Licensed under the AGPLv3. See LICENSE file in the project root for details.
 *
 * This software is the confidential and proprietary information of Nipun Sujesh.
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Landing, CheckIn, Journal, Login, Signup, Profile, Insights, Meditate } from "./pages";
import ErrorBoundary from "./components/ErrorBoundary";
import { ChatProvider } from "./contexts/ChatContext";
import { ConversationRefreshProvider } from "./contexts/ConversationRefreshContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ToastContainer } from "./components/Toast";
import "./App.css";

import { Navbar } from "./components/Navbar";

// Auth wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, token } = useAuth();

  // Debug check
  if (!isAuthenticated && token) {
    console.warn("Token exists but isAuthenticated is false. Forcing authentication check.");
  }

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  // Fallback check
  const isAuthed = isAuthenticated || !!token;

  return isAuthed ? (
    <>
      <Navbar />
      {children}
    </>
  ) : (
    <Navigate to="/login" replace />
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected Routes */}
      <Route
        path="/check-in"
        element={
          <ProtectedRoute>
            <CheckIn />
          </ProtectedRoute>
        }
      />
      <Route
        path="/journal"
        element={
          <ProtectedRoute>
            <Journal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/insights"
        element={
          <ProtectedRoute>
            <Insights />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meditate"
        element={
          <ProtectedRoute>
            <Meditate />
          </ProtectedRoute>
        }
      />


      {/* Catch-all redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <NotificationProvider>
            <ConversationRefreshProvider>
              <ChatProvider>
                <div className="app">
                  <AppRoutes />
                  <ToastContainer />
                </div>
              </ChatProvider>
            </ConversationRefreshProvider>
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
