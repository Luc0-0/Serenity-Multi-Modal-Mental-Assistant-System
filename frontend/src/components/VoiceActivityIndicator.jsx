import React from 'react';
import styles from './VoiceActivityIndicator.module.css';

/**
 * VoiceActivityIndicator - Real-time voice activity visualization
 * Shows listening status, processing, and confidence levels
 */
export function VoiceActivityIndicator({ status, confidence = null }) {
  const getStatusLabel = () => {
    switch (status) {
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'speaking':
        return 'Speaking...';
      default:
        return 'Ready';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'listening':
        return '#e8a84a';
      case 'processing':
        return '#f5c87a';
      case 'speaking':
        return '#ffffff';
      default:
        return 'rgba(232, 168, 74, 0.3)';
    }
  };

  return (
    <div className={`${styles.indicator} ${styles[status] || ''}`}>
      <div className={styles.dotContainer}>
        <div
          className={styles.dot}
          style={{ backgroundColor: getStatusColor() }}
        />
        {status === 'listening' && <div className={styles.pulseRing} />}
        {status === 'speaking' && (
          <>
            <div className={styles.pulseRing} style={{ animationDelay: '0s' }} />
            <div className={styles.pulseRing} style={{ animationDelay: '0.3s' }} />
          </>
        )}
      </div>

      <div className={styles.info}>
        <span className={styles.label}>{getStatusLabel()}</span>
        {confidence && status === 'listening' && (
          <span className={styles.confidence}>
            Confidence: {Math.round(confidence * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
