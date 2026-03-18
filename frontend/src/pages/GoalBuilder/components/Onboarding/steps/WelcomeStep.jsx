/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from '../OnboardingFlow.module.css';

export default function WelcomeStep({ nextStep }) {
  useEffect(() => {
    // Auto-advance after 3 seconds
    const timer = setTimeout(() => {
      nextStep();
    }, 3000);

    return () => clearTimeout(timer);
  }, [nextStep]);

  return (
    <div className={styles.stepContent}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.4, 0.0, 0.2, 1] }}
      >
        <motion.div
          className={styles.stepTitle}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          style={{
            fontSize: 'clamp(32px, 6vw, 56px)',
            marginBottom: 24,
            animation: 'goldGlow 3s ease-in-out infinite'
          }}
        >
          Your Transformation
          <br />
          Journey Begins
        </motion.div>

        <motion.div
          className={styles.stepSubtitle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          style={{ fontSize: 18 }}
        >
          Design your perfect path to achievement with AI-powered scheduling
          and proven habit-building systems.
        </motion.div>

        {/* Animated orb/particle effect */}
        <motion.div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200, 169, 110, 0.1) 0%, transparent 70%)',
            zIndex: -1,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.2, 1],
            opacity: [0, 0.6, 0.3],
            rotate: 360
          }}
          transition={{
            duration: 2.5,
            ease: "easeOut",
            rotate: { duration: 20, repeat: Infinity, ease: "linear" }
          }}
        />

        {/* Progress dots */}
        <motion.div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            marginTop: 60,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'rgba(200, 169, 110, 0.4)',
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}