import React, { useState } from "react";
import styles from "./Meditate.module.css";

// Meditation page with animated flow visualization
export function Meditate() {
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className={styles.container}>
      <div className={styles.backgroundImage} />
      <div className={styles.overlay} />

      <div
        className={styles.flowContainer}
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause meditation" : "Start meditation"}
        role="button"
      >
        <div className={styles.flowRing} />
        <div className={styles.auroraRing} />
        <div className={styles.textureRing} />
        <div className={styles.staticGlow} />
        <div className={styles.coreGlow} />

        <div className={styles.playButtonWrapper}>
          <div
            className={styles.playIcon}
            style={{
              opacity: isPlaying ? 0.6 : 1,
              transform: isPlaying ? "scale(0.9)" : "scale(1)",
            }}
          />
        </div>
      </div>

      <nav className={styles.bottomNav}>
        <button className={styles.navBtn}>
          <span className={styles.navIcon}>🌿</span>
          Guided Relaxation
        </button>

        <button className={styles.navBtn}>
          <span className={styles.navIcon}>≋</span>
          Breathing Exercise
        </button>

        <button className={styles.navBtn}>
          <span className={styles.navIcon}>✨</span>
          Visuals
        </button>
      </nav>
    </div>
  );
}

export default Meditate;
