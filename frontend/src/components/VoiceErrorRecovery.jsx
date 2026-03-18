import styles from './VoiceErrorRecovery.module.css';

/**
 * VoiceErrorRecovery - Advanced error handling with typed recovery suggestions
 * Accepts error as string (legacy) or { type, message, recoverable } object
 */
export function VoiceErrorRecovery({ error, onRetry, onClose }) {
  const errorMsg = typeof error === 'string' ? error : error?.message || 'Something went wrong';
  const errorType = typeof error === 'object' ? error?.type : null;
  const recoverable = typeof error === 'object' ? error?.recoverable !== false : true;

  const getErrorSuggestions = () => {
    switch (errorType) {
      case 'mic_denied':
        return [
          'Check microphone permissions in browser settings',
          'Try a different browser',
          'Ensure no other apps are using the microphone',
        ];
      case 'network':
        return [
          'Check your internet connection',
          'Refresh the page',
          'Try again in a moment',
        ];
      case 'speech_unrecognized':
        return [
          'Speak clearly and a bit louder',
          'Check for background noise',
          'Try speaking more slowly',
        ];
      case 'tts_failed':
        return [
          'Audio playback failed',
          'Check your device volume',
          'Response is shown as text above',
        ];
      default: {
        const msg = errorMsg.toLowerCase();
        if (msg.includes('microphone') || msg.includes('permission')) {
          return ['Check microphone permissions', 'Try a different browser'];
        }
        if (msg.includes('network') || msg.includes('connection')) {
          return ['Check your internet connection', 'Try again in a moment'];
        }
        return ['Check your connection', 'Refresh and try again'];
      }
    }
  };

  const suggestions = getErrorSuggestions();

  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorContent}>
        <div className={styles.iconContainer}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className={styles.icon}>
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
            <path d="M16 10V16M16 22H16.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <div className={styles.errorMessage}>
          <h3>Something went wrong</h3>
          <p>{errorMsg}</p>
        </div>

        {suggestions.length > 0 && (
          <div className={styles.suggestionsList}>
            <p className={styles.suggestionsTitle}>Try:</p>
            <ul>
              {suggestions.map((s, i) => (
                <li key={i}><span className={styles.bullet}>-</span>{s}</li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.buttonGroup}>
          {recoverable && (
            <button className={styles.retryButton} onClick={onRetry}>
              <span>Try Again</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8C2 4.68629 4.68629 2 8 2C10.5264 2 12.6877 3.4957 13.544 5.5M14 8C14 11.3137 11.3137 14 8 14C5.47363 14 3.31227 12.5043 2.456 10.5M2.456 10.5H5M2.456 10.5V13.5M13.544 5.5V2.5M13.544 5.5H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <button className={styles.closeButton} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
