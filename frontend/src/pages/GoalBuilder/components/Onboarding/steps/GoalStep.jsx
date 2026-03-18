/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import React, { useState, useRef, useEffect } from 'react';
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
    microphone: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="8" y1="22" x2="16" y2="22"/>
      </svg>
    )
  };
  return iconMap[iconType] || iconMap.lightning;
};

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
      icon: 'lightning'
    },
    {
      id: 'balanced',
      name: 'Balanced',
      description: 'Sustainable progress with wellness focus',
      color: '#3182CE',
      icon: 'balance'
    },
    {
      id: 'gentle',
      name: 'Gentle',
      description: 'Mindful, stress-free transformation',
      color: '#38A169',
      icon: 'sprout'
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
                        style={{ display: 'flex', color: 'inherit' }}
                      >
                        {getSvgIcon('microphone', 14)}
                      </motion.span>
                      Stop
                    </>
                  ) : (
                    <>
                      <span style={{ display: 'flex', color: 'inherit' }}>{getSvgIcon('microphone', 14)}</span>
                      Voice Input
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
                  <div style={{
                    marginBottom: 8,
                    display: 'flex',
                    justifyContent: 'center',
                    color: 'inherit'
                  }}>
                    {getSvgIcon(theme.icon, 24)}
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