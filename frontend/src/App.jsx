/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 * Licensed under the AGPLv3. See LICENSE file in the project root for details.
 *
 * This software is the confidential and proprietary information of Nipun Sujesh.
 */

import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import {
  Landing,
  CheckIn,
  Journal,
  Login,
  Signup,
  Profile,
  Insights,
  Meditate,
} from "./pages";
import ErrorBoundary from "./components/ErrorBoundary";
import { ChatProvider } from "./contexts/ChatContext";
import { ConversationRefreshProvider } from "./contexts/ConversationRefreshContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ToastContainer } from "./components/Toast";
import { SerenityLoader } from "./components/SerenityLoader";
import "./App.css";

import { Navbar } from "./components/Navbar";
import { CustomCursor } from "./components/CustomCursor";
import { PageTransition } from "./components/PageTransition";

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, token } = useAuth();

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  const isAuthed = isAuthenticated || !!token;

  const handleToggleSidebar = () => {
    // Dispatch custom event that CheckIn/page components can listen to
    window.dispatchEvent(new CustomEvent("toggleSidebar"));
  };

  return isAuthed ? (
    <>
      <Navbar onToggleSidebar={handleToggleSidebar} />
      {children}
    </>
  ) : (
    <Navigate to="/login" replace />
  );
}

function AppRoutes() {
  const location = useLocation();

  return (
    <>
      <PageTransition location={location} />
      <Routes location={location}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <NotificationProvider>
            <ConversationRefreshProvider>
              <ChatProvider>
                <div className="app">
                  <SerenityLoader visible={loading} />
                  <CustomCursor />
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
