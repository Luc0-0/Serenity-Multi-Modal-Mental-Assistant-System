import { useEffect, useState } from 'react';
import styles from './VoiceParticles.module.css';

/**
 * VoiceParticles - Animated particle effects for voice state transitions
 * Colors change based on voice status: amber (listening), blue (processing), white (speaking)
 */
export function VoiceParticles({ trigger, count = 8, status = 'idle' }) {
  const [particles, setParticles] = useState([]);

  const getColor = () => {
    switch (status) {
      case 'listening': return '#e8a84a';
      case 'processing': return '#7eb8da';
      case 'speaking': return '#ffffff';
      default: return '#e8a84a';
    }
  };

  useEffect(() => {
    if (!trigger) return;

    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: Math.random(),
      angle: (360 / count) * i,
      duration: 0.6 + Math.random() * 0.4,
      delay: Math.random() * 0.1,
    }));

    setParticles(newParticles);

    const timeout = setTimeout(
      () => setParticles([]),
      (Math.max(...newParticles.map((p) => p.duration)) + 0.2) * 1000
    );

    return () => clearTimeout(timeout);
  }, [trigger, count]);

  return (
    <div className={styles.particleContainer}>
      {particles.map((p) => (
        <div
          key={p.id}
          className={styles.particle}
          style={{
            '--angle': p.angle,
            '--duration': `${p.duration}s`,
            '--delay': `${p.delay}s`,
            '--color': getColor(),
          }}
        />
      ))}
    </div>
  );
}
