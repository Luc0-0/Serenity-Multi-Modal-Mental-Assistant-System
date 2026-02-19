import React, { useState } from "react";
import styles from "./Meditate.module.css";

/**
 * Meditate Page
 * Features "The Ethereal Flow" animation.
 * Optimized for performance using CSS gradients instead of particles.
 * Represents a smooth, continuous flow of energy without "breathing" motion.
 */
export function Meditate() {
    const [isPlaying, setIsPlaying] = useState(false);

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    return (
        <div className={styles.container}>
            {/* Background & Overlay */}
            <div className={styles.backgroundImage} />
            <div className={styles.overlay} />

            {/* Ethereal Flow Core */}
            <div
                className={styles.flowContainer}
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause meditation" : "Start meditation"}
                role="button"
            >
                {/* Layer 1: The Liquid Flow (Conic Gradient) */}
                <div className={styles.flowRing} />

                {/* Layer 1.5: Aurora Touch */}
                <div className={styles.auroraRing} />

                {/* Layer 2: The Texture (Dashed Ring) */}
                <div className={styles.textureRing} />

                {/* Layer 3: Static Volume (Outer Glow) */}
                <div className={styles.staticGlow} />

                {/* Central Light/Glow */}
                <div className={styles.coreGlow} />

                {/* Central Play Button */}
                <div className={styles.playButtonWrapper}>
                    <div className={styles.playIcon} style={{
                        opacity: isPlaying ? 0.6 : 1,
                        transform: isPlaying ? 'scale(0.9)' : 'scale(1)'
                    }} />
                </div>
            </div>

            {/* Bottom Navigation */}
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
