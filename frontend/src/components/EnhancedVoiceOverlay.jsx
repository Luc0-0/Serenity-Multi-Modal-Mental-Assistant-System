import React, { useRef, useEffect, useState } from 'react';
import { VoiceWaveform } from './VoiceWaveform';
import { VoiceMessageBubble } from './VoiceMessageBubble';
import { VoiceActivityIndicator } from './VoiceActivityIndicator';
import { VoiceParticles } from './VoiceParticles';
import { VoiceErrorRecovery } from './VoiceErrorRecovery';
import styles from './EnhancedVoiceOverlay.module.css';
import '../styles/voice-design.css';

/**
 * EnhancedVoiceOverlay - Tier S voice mode interface
 * Composes all voice sub-components. Parent controls visibility via conditional rendering.
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
}) {
  const messagesEndRef = useRef(null);
  const [particleTrigger, setParticleTrigger] = useState(0);
  const previousStatusRef = useRef(status);
  const overlayRef = useRef(null);
  const touchStartY = useRef(null);

  // Trigger particles on state transitions
  useEffect(() => {
    if (status !== previousStatusRef.current) {
      setParticleTrigger((t) => t + 1);
      previousStatusRef.current = status;
    }
  }, [status]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Swipe-down to exit (mobile)
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;

    const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
    const onTouchEnd = (e) => {
      if (touchStartY.current === null) return;
      const delta = e.changedTouches[0].clientY - touchStartY.current;
      if (delta > 100) onExit?.();
      touchStartY.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onExit]);

  const waveformActive = status === 'listening' || status === 'speaking';

  const getOrbClass = () => {
    switch (status) {
      case 'listening': return styles.orbListening;
      case 'processing': return styles.orbProcessing;
      case 'speaking': return styles.orbSpeaking;
      default: return styles.orbIdle;
    }
  };

  const getGlowClass = () => {
    switch (status) {
      case 'listening': return 'voiceOrbGlowListening';
      case 'processing': return 'voiceOrbGlowListening';
      case 'speaking': return 'voiceOrbGlowSpeaking';
      default: return 'voiceOrbGlowIdle';
    }
  };

  return (
    <div className={styles.overlayContainer} ref={overlayRef}>
      <VoiceParticles trigger={particleTrigger} count={12} status={status} />

      {/* Header */}
      <div className={styles.header}>
        <button className={styles.closeButton} onClick={onExit} aria-label="Exit voice mode">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <h2>Voice Session</h2>
        <div style={{ width: '20px' }} />
      </div>

      <div className={styles.content}>
        {/* Orb — tap to interrupt when speaking */}
        <div className={styles.orbSection}>
          <div
            className={`${styles.orb} ${getOrbClass()} ${getGlowClass()}`}
            onClick={status === 'speaking' ? onInterrupt : undefined}
            role={status === 'speaking' ? 'button' : undefined}
            aria-label={status === 'speaking' ? 'Tap to interrupt' : undefined}
            style={{ cursor: status === 'speaking' ? 'pointer' : 'default' }}
          />
          <VoiceActivityIndicator status={status} />
        </div>

        {/* Waveform */}
        {waveformActive && (
          <VoiceWaveform
            isActive={waveformActive}
            status={status}
            audioData={Array.from(frequencyData)}
          />
        )}

        {/* Live transcript */}
        {transcript && (
          <div className={styles.transcriptBox}>
            <p className={styles.transcriptText}>{transcript}</p>
            <div className={styles.cursor} />
          </div>
        )}

        {/* Conversation messages */}
        <div className={styles.messagesContainer}>
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
      </div>

      {/* Error recovery */}
      {error && (
        <VoiceErrorRecovery
          error={error}
          onRetry={onRetry}
          onClose={onExit}
        />
      )}
    </div>
  );
}
