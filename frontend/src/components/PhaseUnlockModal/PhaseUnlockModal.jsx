/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 *
 * Full-screen phase unlock celebration — triggered when streak hits
 * a phase threshold (14, 42 days).
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SvgIcon } from '../icons/SvgIcon';
import styles from './PhaseUnlockModal.module.css';

const PHASE_COLORS = ['#3182CE', '#F59E0B', '#9F7AEA'];

function Confetti({ count = 40, colors }) {
  const [particles] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 1.5 + Math.random() * 1.5,
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)],
      drift: (Math.random() - 0.5) * 60,
    }))
  );

  return (
    <div className={styles.confettiContainer} aria-hidden="true">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={styles.confettiPiece}
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            borderRadius: p.size > 7 ? '50%' : '1px',
          }}
          initial={{ y: -20, x: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            y: [0, window.innerHeight * 0.8],
            x: [0, p.drift],
            opacity: [1, 1, 0],
            rotate: [0, p.rotation * 3],
            scale: [1, 0.5],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

export function PhaseUnlockModal({ isOpen, phase, onClose }) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 400);
      return () => clearTimeout(timer);
    }
    setShowContent(false);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setShowContent(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  if (!phase) return null;

  const color = PHASE_COLORS[phase.phase_number] || '#C8A96E';
  const confettiColors = [color, '#C8A96E', '#F5F0E8', '#6EE7B7'];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleClose}
        >
          <Confetti count={50} colors={confettiColors} />

          <motion.div
            className={styles.backdrop}
            initial={{ backdropFilter: 'blur(0px)' }}
            animate={{ backdropFilter: 'blur(20px)' }}
            exit={{ backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.5 }}
          />

          <motion.div
            className={styles.card}
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.6, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.2 }}
            style={{ '--phase-color': color }}
          >
            {/* Phase Badge */}
            <motion.div
              className={styles.badge}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.5 }}
            >
              <span className={styles.badgeNumber}>{phase.phase_number + 1}</span>
            </motion.div>

            {/* Unlock Icon */}
            <motion.div
              className={styles.unlockIcon}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22, delay: 0.6 }}
            >
              <SvgIcon name="unlock" size={28} color={color} strokeWidth={1.5} />
            </motion.div>

            {/* Title */}
            <AnimatePresence>
              {showContent && (
                <>
                  <motion.div
                    className={styles.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    Phase Unlocked
                  </motion.div>

                  <motion.h2
                    className={styles.title}
                    style={{ color }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {phase.title}
                  </motion.h2>

                  <motion.p
                    className={styles.description}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    {phase.description}
                  </motion.p>

                  <motion.div
                    className={styles.streakInfo}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <SvgIcon name="flame" size={16} color="#C8A96E" />
                    <span>{phase.unlock_streak_required}-day streak achieved</span>
                  </motion.div>

                  <motion.button
                    className={styles.continueButton}
                    onClick={handleClose}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Continue
                  </motion.button>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PhaseUnlockModal;
