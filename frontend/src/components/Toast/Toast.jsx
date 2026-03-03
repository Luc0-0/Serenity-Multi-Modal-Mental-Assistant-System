import React from 'react';
import styles from './Toast.module.css';

const typeStyles = {
  success: styles.success,
  error: styles.error,
  warning: styles.warning,
  info: styles.info,
};

export function Toast({ message, type = 'info', onClose }) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`${styles.toast} ${typeStyles[type]}`}>
      <span>{message}</span>
      <button
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}
