import React from 'react';
import styles from './VoiceMessageBubble.module.css';

/**
 * VoiceMessageBubble - Premium message display with avatars, timestamps, and confidence
 */
export function VoiceMessageBubble({ message, role, timestamp, confidence = null, index = 0 }) {
  const isUser = role === 'user';
  const initials = isUser ? 'YOU' : 'AI';

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div
      className={`${styles.messageBubble} ${styles[role]}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className={styles.avatar}>
        <span>{initials}</span>
      </div>

      <div className={styles.content}>
        <div className={styles.bubbleWrapper}>
          <div className={styles.bubble}>
            {message}
          </div>
          {confidence && (
            <div className={styles.confidence}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              </svg>
              {Math.round(confidence * 100)}%
            </div>
          )}
        </div>

        <div className={styles.metadata}>
          {timestamp && <span className={styles.time}>{formatTime(timestamp)}</span>}
        </div>
      </div>
    </div>
  );
}
