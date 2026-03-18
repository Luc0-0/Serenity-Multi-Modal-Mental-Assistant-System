/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from '../OnboardingFlow.module.css';

export default function GoalStep({ formData, updateFormData, nextStep, prevStep }) {
  const [isListening, setIsListening] = useState(false);
  const [hasVoiceSupport, setHasVoiceSupport] = useState(false);
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    // Check for Web Speech API support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setHasVoiceSupport(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          updateFormData({
            goal: {
              ...formData.goal,
              description: formData.goal.description + ' ' + finalTranscript.trim(),
              voice_input: true
            }
          });
        }
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [formData.goal, updateFormData]);

  const startVoiceInput = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current && isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
    }
  };

  const handleInputChange = (field, value) => {
    updateFormData({
      goal: {
        ...formData.goal,
        [field]: value
      }
    });
  };

  const handleThemeSelect = (theme) => {
    updateFormData({ theme });
  };

  const canProceed = formData.goal.title.trim() && formData.goal.description.trim();

  const themes = [
    {
      id: 'tactical',
      name: 'Tactical',
      description: 'High-intensity, mission-focused approach',
      color: '#E53E3E',
      icon: '⚡'
    },
    {
      id: 'balanced',
      name: 'Balanced',
      description: 'Sustainable progress with wellness focus',
      color: '#3182CE',
      icon: '⚖️'
    },
    {
      id: 'gentle',
      name: 'Gentle',
      description: 'Mindful, stress-free transformation',
      color: '#38A169',
      icon: '🌱'
    }
  ];

  return (
    <div className={styles.stepContent}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className={styles.stepTitle}>
          What's your ultimate goal?
        </div>
        <div className={styles.stepSubtitle}>
          Describe your transformation vision. What do you want to achieve?
        </div>

        <div className={styles.glassCard}>
          {/* Goal Title Input */}
          <div style={{ marginBottom: 32 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(245, 240, 232, 0.8)',
              marginBottom: 12,
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Goal Title
            </label>
            <input
              type="text"
              placeholder="e.g., Complete Health Transformation"
              value={formData.goal.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              style={{
                width: '100%',
                padding: '16px 20px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
                color: '#F5F0E8',
                fontSize: 16,
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(200, 169, 110, 0.4)';
                e.target.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            />
          </div>

          {/* Goal Description with Voice Input */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12
            }}>
              <label style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(245, 240, 232, 0.8)',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                Description
              </label>
              {hasVoiceSupport && (
                <button
                  type="button"
                  onClick={isListening ? stopVoiceInput : startVoiceInput}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 16px',
                    background: isListening
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(200, 169, 110, 0.2)',
                    border: `1px solid ${isListening
                      ? 'rgba(239, 68, 68, 0.4)'
                      : 'rgba(200, 169, 110, 0.4)'}`,
                    borderRadius: 8,
                    color: isListening ? '#EF4444' : '#C8A96E',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isListening ? (
                    <>
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        🎤
                      </motion.span>
                      Stop
                    </>
                  ) : (
                    <>
                      🎤 Voice Input
                    </>
                  )}
                </button>
              )}
            </div>
            <textarea
              ref={textareaRef}
              placeholder="Describe your goal in detail. What specific outcomes do you want? What will success look like?"
              value={formData.goal.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '16px 20px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
                color: '#F5F0E8',
                fontSize: 15,
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
                lineHeight: 1.6,
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(200, 169, 110, 0.4)';
                e.target.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            />
          </div>

          {/* Theme Selection */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(245, 240, 232, 0.8)',
              marginBottom: 16,
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Choose Your Approach
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12
            }}>
              {themes.map((theme) => (
                <motion.button
                  key={theme.id}
                  type="button"
                  onClick={() => handleThemeSelect(theme.id)}
                  style={{
                    padding: '20px 16px',
                    background: formData.theme === theme.id
                      ? `${theme.color}20`
                      : 'rgba(255, 255, 255, 0.03)',
                    border: formData.theme === theme.id
                      ? `2px solid ${theme.color}60`
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 12,
                    color: formData.theme === theme.id ? theme.color : '#F5F0E8',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center'
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>
                    {theme.icon}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    {theme.name}
                  </div>
                  <div style={{
                    fontSize: 12,
                    opacity: 0.8,
                    lineHeight: 1.3
                  }}>
                    {theme.description}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={prevStep}
          >
            ← Back
          </button>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={nextStep}
            disabled={!canProceed}
            style={{
              opacity: canProceed ? 1 : 0.5,
              cursor: canProceed ? 'pointer' : 'not-allowed'
            }}
          >
            Continue →
          </button>
        </div>
      </motion.div>
    </div>
  );
}