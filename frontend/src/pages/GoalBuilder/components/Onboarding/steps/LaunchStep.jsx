/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import styles from '../OnboardingFlow.module.css';

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
    tactical: '⚡',
    balanced: '⚖️',
    gentle: '🌱'
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
            fontSize: 64,
            marginBottom: 16,
            filter: 'drop-shadow(0 0 20px rgba(200, 169, 110, 0.4))'
          }}>
            {themeImages[formData.theme]}
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
                  <div style={{ fontSize: 16, marginBottom: 4 }}>🤖</div>
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
                  <div style={{ fontSize: 16, marginBottom: 4 }}>🎤</div>
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
                <div style={{ fontSize: 16, marginBottom: 4 }}>📈</div>
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
              marginBottom: 8
            }}>
              ✨ Success Projection
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
                '🚀 Launch Your Transformation!'
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