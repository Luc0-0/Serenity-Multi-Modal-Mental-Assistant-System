/**
 * MeditationOrb.jsx
 * Core breathing orb component with rings and glow effects
 * Positioned at the center of OrbLayout
 */

import styles from "./MeditationOrb.module.css";

export function MeditationOrb({
  color = "rgba(110, 140, 215, 0.45)",
  scale = 1,
  isPlaying = false,
  isRunning = false,
  currentDuration = 0,
  currentLabel = "",
  orbTransition = "transform 6s ease-in-out",
  children,
  onClick,
  title,
}) {
  return (
    <div className={styles.orbWrapper}>
      {/* Flow container for orb rings and glow */}
      <div className={styles.flowContainer} onClick={onClick} title={title}>
        {/* Rotating ring */}
        <div className={styles.flowRing} />
        
        {/* Aurora ring */}
        <div className={styles.auroraRing} />
        
        {/* Texture ring */}
        <div className={styles.textureRing} />
        
        {/* Static glow */}
        <div className={styles.staticGlow} />
        
        {/* Core glow pulse */}
        <div className={styles.coreGlow} />

        {/* Main breathing orb (animated) */}
        <div
          className={styles.breathingOrb}
          style={{
            transform: `scale(${scale})`,
            transition: orbTransition,
            background: `radial-gradient(circle, ${color} 0%, rgba(255,255,255,0.08) 60%, transparent 100%)`,
            boxShadow: `0 0 40px 10px ${color}`,
          }}
        />

        {/* Children (icons, text, loading spinners) */}
        {children}
      </div>
    </div>
  );
}

export default MeditationOrb;
