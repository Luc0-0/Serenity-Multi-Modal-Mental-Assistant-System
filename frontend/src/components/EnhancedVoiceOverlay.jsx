import { useRef, useEffect, useState } from 'react';
import { VoiceMessageBubble } from './VoiceMessageBubble';
import { VoiceParticles } from './VoiceParticles';
import { VoiceErrorRecovery } from './VoiceErrorRecovery';
import styles from './EnhancedVoiceOverlay.module.css';

/**
 * EnhancedVoiceOverlay - Full-screen immersive voice mode
 * Cinematic dark canvas with reactive orb, waveform bars, and ambient effects
 */
export function EnhancedVoiceOverlay({
  status = 'idle',
  messages = [],
  transcript = '',
  error = null,
  frequencyData = new Uint8Array(16),
  onExit,
  onRetry,
  onInterrupt,
  onOpenInChat,
}) {
  const messagesEndRef = useRef(null);
  const overlayRef = useRef(null);
  const touchStartY = useRef(null);
  const [particleTrigger, setParticleTrigger] = useState(0);
  const prevStatus = useRef(status);

  // Trigger particles on state transitions
  useEffect(() => {
    if (status !== prevStatus.current) {
      setParticleTrigger((t) => t + 1);
      prevStatus.current = status;
    }
  }, [status]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Swipe-down to exit on mobile
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const onStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
    };
    const onEnd = (e) => {
      if (touchStartY.current !== null) {
        if (e.changedTouches[0].clientY - touchStartY.current > 120) onExit?.();
        touchStartY.current = null;
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
    };
  }, [onExit]);

  // Lock body scroll while overlay is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const statusLabel = {
    idle: 'Ready',
    listening: 'Listening\u2026',
    processing: 'Thinking\u2026',
    speaking: 'Speaking\u2026',
  }[status] || 'Ready';

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const orbStateClass = styles[`orb${cap(status)}`] || styles.orbIdle;
  const statusClass = styles[`status${cap(status)}`] || '';
  const barClass = styles[`bar${cap(status)}`] || '';

  return (
    <div className={styles.overlay} ref={overlayRef}>
      {/* Ambient particle effects */}
      <VoiceParticles trigger={particleTrigger} count={10} status={status} />

      {/* Close button — glassmorphism circle */}
      <button className={styles.closeBtn} onClick={onExit} aria-label="Exit voice mode">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Central content */}
      <div className={styles.center}>
        {/* The Orb */}
        <div className={styles.orbWrap}>
          <div
            className={`${styles.orb} ${orbStateClass}`}
            onClick={status === 'speaking' ? onInterrupt : undefined}
            role={status === 'speaking' ? 'button' : undefined}
            aria-label={status === 'speaking' ? 'Tap to interrupt' : undefined}
          />
          <div className={`${styles.orbRing} ${status === 'listening' ? styles.ringActive : ''}`} />
        </div>

        {/* Status label */}
        <p className={`${styles.statusText} ${statusClass}`}>{statusLabel}</p>

        {/* Waveform / Processing dots */}
        {status === 'processing' ? (
          <div className={styles.processingDots}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
        ) : (
          <div className={styles.waveform}>
            {Array.from(frequencyData).map((val, i) => (
              <div
                key={i}
                className={`${styles.bar} ${barClass}`}
                style={{ height: `${Math.max(3, (val / 100) * 44)}px` }}
              />
            ))}
          </div>
        )}

        {/* Live transcript */}
        {transcript && (
          <div className={styles.transcript}>
            <p className={styles.transcriptText}>{transcript}</p>
            <span className={styles.cursor} />
          </div>
        )}

        {/* Conversation history */}
        {messages.length > 0 && (
          <div className={styles.messages}>
            {messages.map((msg, i) => (
              <VoiceMessageBubble
                key={msg.timestamp?.getTime?.() || i}
                message={msg.content}
                role={msg.role}
                timestamp={msg.timestamp}
                confidence={msg.confidence}
                index={i}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className={styles.bottomActions}>
        {onOpenInChat && (
          <button className={styles.openChatBtn} onClick={onOpenInChat}>
            Continue in chat
          </button>
        )}
        <p className={styles.hint}>
          {status === 'speaking' ? 'Tap the orb to interrupt' : 'Swipe down to exit'}
        </p>
      </div>

      {/* Error recovery */}
      {error && <VoiceErrorRecovery error={error} onRetry={onRetry} onClose={onExit} />}
    </div>
  );
}
