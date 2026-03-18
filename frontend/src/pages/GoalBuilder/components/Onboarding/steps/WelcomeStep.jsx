/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from '../OnboardingFlow.module.css';

export default function WelcomeStep({ nextStep }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      nextStep();
    }, 4000);

    return () => clearTimeout(timer);
  }, [nextStep]);

  return (
    <div className={styles.stepContent}>
      {/* Multi-layer cinematic background orbs */}
      <motion.div
        style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200, 169, 110, 0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
          zIndex: -1,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 1.1, 1],
          opacity: [0, 0.5, 0.25],
        }}
        transition={{
          duration: 3,
          ease: "easeOut",
        }}
      />

      <motion.div
        style={{
          position: 'absolute',
          top: '60%',
          right: '15%',
          width: 250,
          height: 250,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(110, 231, 183, 0.06) 0%, transparent 70%)',
          filter: 'blur(50px)',
          zIndex: -1,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 1.15, 1],
          opacity: [0, 0.4, 0.2],
        }}
        transition={{
          duration: 3.5,
          ease: "easeOut",
          delay: 0.3,
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.4, 0.0, 0.2, 1] }}
      >
        {/* Main title with staggered character animation */}
        <motion.div
          className={styles.stepTitle}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            fontSize: 'clamp(40px, 7vw, 62px)',
            marginBottom: 28,
            fontWeight: 800,
            letterSpacing: -1,
            lineHeight: 1.15,
            background: 'linear-gradient(135deg, #F5F0E8 0%, rgba(200, 169, 110, 1) 60%, rgba(245, 240, 232, 0.95) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Your Transformation
          <br />
          Journey Begins
        </motion.div>

        {/* Subtitle with delayed entrance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            fontSize: 'clamp(16px, 3vw, 20px)',
            fontWeight: 400,
            lineHeight: 1.7,
            color: 'rgba(245, 240, 232, 0.85)',
            marginBottom: 64,
            maxWidth: 560,
            margin: '0 auto 64px',
          }}
        >
          Design your perfect path to achievement with AI-powered scheduling
          and proven habit-building systems.
        </motion.div>

        {/* Center orb with multi-ring effect */}
        <motion.div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 80,
            height: 180,
          }}
        >
          {/* Outer ring */}
          <motion.div
            style={{
              position: 'absolute',
              width: 220,
              height: 220,
              borderRadius: '50%',
              border: '1px solid rgba(200, 169, 110, 0.15)',
              zIndex: 1,
            }}
            animate={{
              rotate: 360,
              scale: [0.95, 1.05, 0.95],
            }}
            transition={{
              rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
              scale: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
            }}
          />

          {/* Middle ring */}
          <motion.div
            style={{
              position: 'absolute',
              width: 160,
              height: 160,
              borderRadius: '50%',
              border: '1px solid rgba(200, 169, 110, 0.25)',
              zIndex: 2,
            }}
            animate={{
              rotate: -360,
              scale: [1, 0.98, 1],
            }}
            transition={{
              rotate: { duration: 25, repeat: Infinity, ease: 'linear' },
              scale: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
            }}
          />

          {/* Core orb */}
          <motion.div
            style={{
              position: 'relative',
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, rgba(200, 169, 110, 0.4) 0%, rgba(200, 169, 110, 0.15) 50%, transparent 100%)',
              boxShadow: '0 0 40px rgba(200, 169, 110, 0.25), inset -10px -10px 40px rgba(0, 0, 0, 0.2)',
              zIndex: 3,
            }}
            animate={{
              scale: [1, 1.15, 1],
              boxShadow: [
                '0 0 40px rgba(200, 169, 110, 0.25), inset -10px -10px 40px rgba(0, 0, 0, 0.2)',
                '0 0 60px rgba(200, 169, 110, 0.4), inset -10px -10px 40px rgba(0, 0, 0, 0.2)',
                '0 0 40px rgba(200, 169, 110, 0.25), inset -10px -10px 40px rgba(0, 0, 0, 0.2)',
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>

        {/* Enhanced progress indicator with dots */}
        <motion.div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            marginTop: 48,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              style={{
                width: i === 0 ? 28 : 8,
                height: 8,
                borderRadius: '4px',
                background: i === 0 ? 'rgba(200, 169, 110, 0.8)' : 'rgba(200, 169, 110, 0.2)',
                transition: 'all 0.3s ease',
              }}
              animate={i === 0 ? {
                boxShadow: [
                  '0 0 0 rgba(200, 169, 110, 0.5)',
                  '0 0 12px rgba(200, 169, 110, 0.5)',
                  '0 0 0 rgba(200, 169, 110, 0.5)',
                ],
              } : {}}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}