import React from 'react';
import { useNotification } from '../../context/NotificationContext';
import { Toast } from './Toast';
import styles from './ToastContainer.module.css';

export function ToastContainer() {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className={styles.container}>
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}
