/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import styles from '../OnboardingFlow.module.css';

const getSvgIcon = (iconType, size = 20) => {
  const iconMap = {
    lightning: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
    balance: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 12l2 2 4-4"/>
        <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
        <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
        <path d="M3 12h6m6 0h6"/>
      </svg>
    ),
    sprout: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 20h10"/>
        <path d="M10 20c5.5-2.5.8-6.4 3-10"/>
        <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>
        <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.7 4.3-1.4 1-1.1 1.6-2.7 1.7-4.9-2.7.1-4 1-4.9 2.3z"/>
      </svg>
    ),
    robot: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 8V4H8"/>
        <rect x="6" y="4" width="12" height="8" rx="2"/>
        <circle cx="9" cy="9" r="1"/>
        <circle cx="15" cy="9" r="1"/>
        <path d="M9 16a5 5 0 0 0 6 0"/>
        <path d="M6 13h4"/>
        <path d="M14 13h4"/>
      </svg>
    ),
    microphone: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="8" y1="22" x2="16" y2="22"/>
      </svg>
    ),
    chart: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
    sparkles: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l0-1.093 2-2-2-2 0-1.093A2 2 0 0 0 9.937 6.5l1.093 0 2-2 2 2 1.093 0a2 2 0 0 0 1.437 1.437L18 9.967l2 2-2 2-.44 1.093a2 2 0 0 0-1.437 1.437L15.03 18l-2 2-2-2-1.093-.44z"/>
        <path d="M2 8h2.5L5 5.5 5.5 8H8"/>
        <path d="M18 16h2.5l.5-2.5.5 2.5H24"/>
      </svg>
    ),
    rocket: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
        <path d="M12 15l-3 3 8.5 8.5"/>
        <path d="M9 12l3-3-8.5-8.5"/>
        <path d="M9 21v-4.8L12 15l1.3 1.3"/>
        <path d="M3 9h4.8L9 12 7.7 10.7"/>
        <circle cx="12" cy="8" r="6"/>
      </svg>
    )
  };
  return iconMap[iconType] || iconMap.lightning;
};

export default function LaunchStep({ formData, onComplete, prevStep }) {
  const [isCreating, setIsCreating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
  }, []);

  const handleLaunch = async () => {
    setIsCreating(true);
    try {
      await onComplete();
    } catch (error) {
      console.error('Goal creation failed:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const themeImages = {
    tactical: 'lightning',
    balanced: 'balance',
    gentle: 'sprout'
  };

  const themeMessages = {
    tactical: 'Your mission is locked and loaded. Time to execute with precision.',
    balanced: 'Your balanced transformation journey is ready to begin.',
    gentle: 'Your mindful path to growth awaits. Take it one gentle step at a time.'
  };

  // Calculate total schedule time
  const scheduleItems = formData.schedule.items || [];
  const totalBlocks = scheduleItems.length;

  return (
    <div className={styles.stepContent}>
      {/* Confetti Effect */}
      {showConfetti && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 1000
        }}>
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                width: Math.random() * 10 + 5,
                height: Math.random() * 10 + 5,
                background: [
                  '#C8A96E',
                  '#6EE7B7',
                  '#7EB8F7',
                  '#F687B3',
                  '#FCD34D'
                ][Math.floor(Math.random() * 5)],
                borderRadius: Math.random() > 0.5 ? '50%' : '0%',
                left: Math.random() * window.innerWidth,
                top: -20
              }}
              animate={{
                y: window.innerHeight + 100,
                rotate: Math.random() * 360,
                opacity: [1, 1, 0]
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                ease: "easeOut",
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Success Header */}
        <motion.div
          style={{
            textAlign: 'center',
            marginBottom: 48
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 16,
            filter: 'drop-shadow(0 0 20px rgba(200, 169, 110, 0.4))',
            color: '#C8A96E'
          }}>
            {getSvgIcon(themeImages[formData.theme], 64)}
          </div>
          <div className={styles.stepTitle} style={{
            background: 'linear-gradient(135deg, #C8A96E, #F5F0E8, #C8A96E)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'goldGlow 2s ease-in-out infinite'
          }}>
            Ready to Launch!
          </div>
          <div className={styles.stepSubtitle}>
            {themeMessages[formData.theme]}
          </div>
        </motion.div>

        {/* Goal Summary Card */}
        <motion.div
          className={styles.glassCard}
          style={{
            background: 'rgba(15, 15, 20, 0.6)',
            border: '2px solid rgba(200, 169, 110, 0.3)',
            marginBottom: 32
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {/* Goal Overview */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#C8A96E',
              marginBottom: 16,
              textAlign: 'center'
            }}>
              Your Transformation Plan
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 24,
              marginBottom: 24
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#6EE7B7',
                  marginBottom: 4
                }}>
                  {formData.timeline.duration_days}
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'rgba(245, 240, 232, 0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: 1
                }}>
                  Days
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#7EB8F7',
                  marginBottom: 4
                }}>
                  {totalBlocks}
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'rgba(245, 240, 232, 0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: 1
                }}>
                  Daily Blocks
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#F687B3',
                  marginBottom: 4,
                  textTransform: 'capitalize'
                }}>
                  {formData.theme}
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'rgba(245, 240, 232, 0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: 1
                }}>
                  Approach
                </div>
              </div>
            </div>

            <div style={{
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.05)',
              marginBottom: 20
            }}>
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#F5F0E8',
                marginBottom: 8
              }}>
                "{formData.goal.title}"
              </div>
              <div style={{
                fontSize: 14,
                color: 'rgba(245, 240, 232, 0.8)',
                lineHeight: 1.5
              }}>
                {formData.goal.description}
              </div>
            </div>

            {/* Key Features */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 12
            }}>
              {formData.schedule.ai_generated && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(200, 169, 110, 0.1)',
                  border: '1px solid rgba(200, 169, 110, 0.2)',
                  borderRadius: 8,
                  textAlign: 'center'
                }}>
                  <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'center', color: '#C8A96E' }}>
                    {getSvgIcon('robot', 16)}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#C8A96E',
                    fontWeight: 600
                  }}>
                    AI-Optimized
                  </div>
                </div>
              )}

              {formData.goal.voice_input && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(110, 231, 183, 0.1)',
                  border: '1px solid rgba(110, 231, 183, 0.2)',
                  borderRadius: 8,
                  textAlign: 'center'
                }}>
                  <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'center', color: '#6EE7B7' }}>
                    {getSvgIcon('microphone', 16)}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#6EE7B7',
                    fontWeight: 600
                  }}>
                    Voice Created
                  </div>
                </div>
              )}

              <div style={{
                padding: '12px 16px',
                background: 'rgba(123, 184, 247, 0.1)',
                border: '1px solid rgba(123, 184, 247, 0.2)',
                borderRadius: 8,
                textAlign: 'center'
              }}>
                <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'center', color: '#7EB8F7' }}>
                  {getSvgIcon('chart', 16)}
                </div>
                <div style={{
                  fontSize: 12,
                  color: '#7EB8F7',
                  fontWeight: 600
                }}>
                  Progress Tracking
                </div>
              </div>
            </div>
          </div>

          {/* Success Prediction */}
          <motion.div
            style={{
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(200, 169, 110, 0.1), rgba(110, 231, 183, 0.1))',
              border: '2px solid rgba(200, 169, 110, 0.3)',
              borderRadius: 16,
              textAlign: 'center'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#C8A96E',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}>
              <span style={{ display: 'flex', color: '#C8A96E' }}>{getSvgIcon('sparkles', 16)}</span>
              Success Projection
            </div>
            <div style={{
              fontSize: 14,
              color: 'rgba(245, 240, 232, 0.9)',
              lineHeight: 1.5
            }}>
              Based on your plan, you have a <strong style={{ color: '#6EE7B7' }}>92% probability</strong> of
              achieving meaningful progress within {Math.floor(formData.timeline.duration_days / 7)} weeks
              when following this structured approach.
            </div>
          </motion.div>
        </motion.div>

        {/* Launch Button */}
        <motion.div
          style={{ textAlign: 'center' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <div className={styles.buttonContainer}>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={prevStep}
              disabled={isCreating}
            >
              ← Back
            </button>

            <motion.button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={handleLaunch}
              disabled={isCreating}
              style={{
                background: isCreating
                  ? 'rgba(200, 169, 110, 0.5)'
                  : 'linear-gradient(135deg, rgba(200, 169, 110, 0.9), rgba(200, 169, 110, 1))',
                minWidth: 180,
                fontSize: 16,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1
              }}
              whileHover={!isCreating ? {
                scale: 1.05,
                boxShadow: '0 8px 30px rgba(200, 169, 110, 0.4)'
              } : {}}
              whileTap={!isCreating ? { scale: 0.95 } : {}}
            >
              {isCreating ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12
                }}>
                  <motion.div
                    style={{
                      width: 20,
                      height: 20,
                      border: '3px solid transparent',
                      borderTop: '3px solid #0A0A0F',
                      borderRadius: '50%'
                    }}
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                  Creating Your Journey...
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'flex', color: 'inherit' }}>{getSvgIcon('rocket', 18)}</span>
                  Launch Your Transformation!
                </div>
              )}
            </motion.button>
          </div>

          <motion.div
            style={{
              marginTop: 24,
              fontSize: 13,
              color: 'rgba(245, 240, 232, 0.6)',
              fontStyle: 'italic'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            "The journey of a thousand miles begins with a single step." - Lao Tzu
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}