import React, { createContext, useState, useCallback } from 'react';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const notification = { id, message, type };

    setNotifications((prev) => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const success = useCallback((message, duration) => {
    return showNotification(message, 'success', duration);
  }, [showNotification]);

  const error = useCallback((message, duration) => {
    return showNotification(message, 'error', duration);
  }, [showNotification]);

  const warning = useCallback((message, duration) => {
    return showNotification(message, 'warning', duration);
  }, [showNotification]);

  const info = useCallback((message, duration) => {
    return showNotification(message, 'info', duration);
  }, [showNotification]);

  const value = {
    notifications,
    showNotification,
    removeNotification,
    success,
    error,
    warning,
    info,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
