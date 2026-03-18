import React, { useEffect, useRef, useState } from 'react';
import styles from './VoiceWaveform.module.css';

/**
 * VoiceWaveform - Real-time audiovisual frequency analyzer
 * Displays animated frequency bars synchronized with voice activity
 */
export function VoiceWaveform({ isActive, status, audioData = [] }) {
  const canvasRef = useRef(null);
  const [bars, setBars] = useState(Array(16).fill(0));
  const animationRef = useRef(null);

  useEffect(() => {
    if (!isActive || !audioData.length) {
      setBars(Array(16).fill(0));
      return;
    }

    const updateBars = () => {
      const newBars = audioData.slice(0, 16).map((val, i) => {
        const decay = bars[i] * 0.92; // Smooth decay
        return Math.max(Math.floor(val * 1.2), decay);
      });
      setBars(newBars);
    };

    const interval = setInterval(updateBars, 30);
    return () => clearInterval(interval);
  }, [audioData, isActive, bars]);

  const getBarColor = (i) => {
    if (status === 'listening') return `hsl(43, 100%, ${50 + i * 2}%)`;
    if (status === 'speaking') return `hsl(0, 0%, ${70 - i * 2}%)`;
    return `hsl(43, 80%, 60%)`;
  };

  return (
    <div className={`${styles.waveformContainer} ${styles[status] || ''}`}>
      <div className={styles.bars}>
        {bars.map((height, i) => (
          <div
            key={i}
            className={styles.bar}
            style={{
              height: `${Math.max(height, 8)}%`,
              backgroundColor: getBarColor(i),
              opacity: isActive ? 1 : 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
}
