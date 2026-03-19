/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from '../OnboardingFlow.module.css';

export default function WelcomeStep({ nextStep }) {
  useEffect(() => {
    const timer = setTimeout(() => nextStep(), 4500);
    return () => clearTimeout(timer);
  }, [nextStep]);

  return (
    <div className={styles.stepContent} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '75vh', userSelect: 'none' }}>

      {/* Ambient background glow — two offset blobs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.5 }}
          style={{
            position: 'absolute', top: '30%', left: '15%',
            width: 360, height: 360, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 3, delay: 0.4 }}
          style={{
            position: 'absolute', top: '55%', right: '10%',
            width: 280, height: 280, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* Brand mark */}
      <motion.div
        initial={{ opacity: 0, letterSpacing: '0.6em' }}
        animate={{ opacity: 1, letterSpacing: '0.35em' }}
        transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          fontSize: 10,
          fontFamily: 'Raleway, sans-serif',
          fontWeight: 600,
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: 'rgba(201,168,76,0.5)',
          marginBottom: 28,
        }}
      >
        Serenity
      </motion.div>

      {/* Expanding horizontal line */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
        style={{
          width: 220,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)',
          marginBottom: 36,
          transformOrigin: 'center',
        }}
      />

      {/* Main heading — Cormorant Garamond large italic */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: [0.34, 1.56, 0.64, 1], delay: 0.7 }}
        style={{
          fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontSize: 'clamp(36px, 6vw, 58px)',
          fontStyle: 'italic',
          fontWeight: 500,
          lineHeight: 1.15,
          color: '#EDE5D4',
          textAlign: 'center',
          letterSpacing: '-0.3px',
          marginBottom: 20,
        }}
      >
        Your Transformation<br />Journey Begins
      </motion.div>

      {/* Subtitle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.3 }}
        style={{
          fontFamily: 'Raleway, sans-serif',
          fontSize: 14,
          fontWeight: 400,
          color: 'rgba(237,229,212,0.45)',
          letterSpacing: '0.08em',
          textAlign: 'center',
          maxWidth: 380,
          lineHeight: 1.75,
          marginBottom: 56,
        }}
      >
        AI-powered goal building, built around how you actually live
      </motion.div>

      {/* Thin expanding bottom line */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1.8, ease: [0.25, 0.46, 0.45, 0.94], delay: 1.5 }}
        style={{
          width: 120,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)',
          marginBottom: 28,
          transformOrigin: 'center',
        }}
      />

      {/* Progress dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.8 }}
        style={{ display: 'flex', gap: 8, alignItems: 'center' }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            animate={i === 0 ? {
              opacity: [0.7, 1, 0.7],
              scaleX: [1, 1.4, 1],
            } : {}}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: i === 0 ? 22 : 6,
              height: 6,
              borderRadius: 3,
              background: i === 0 ? '#C9A84C' : 'rgba(201,168,76,0.18)',
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
