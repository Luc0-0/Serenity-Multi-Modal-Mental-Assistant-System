/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 *
 * GoalStep — Title, short hint, theme selection, and duration picker.
 * Timeline step merged here as duration pill selector.
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SvgIcon } from '../../../../../components/icons/SvgIcon';
import styles from '../OnboardingFlow.module.css';

const THEMES = [
  { id: 'tactical', name: 'Tactical', description: 'High-intensity, mission-focused', color: '#E05252', icon: 'lightning' },
  { id: 'balanced', name: 'Balanced', description: 'Sustainable progress with wellness', color: '#5A9CF5', icon: 'compass' },
  { id: 'gentle', name: 'Gentle', description: 'Mindful, stress-free transformation', color: '#52A97A', icon: 'leaf' },
];

const DURATIONS = [
  { days: 30, label: '30 days', sub: 'Sprint' },
  { days: 90, label: '90 days', sub: 'Quarter' },
  { days: 180, label: '180 days', sub: 'Half year' },
  { days: 365, label: '365 days', sub: 'Full year' },
];

export default function GoalStep({ formData, updateFormData, nextStep, prevStep }) {
  const [isListening, setIsListening] = useState(false);
  const [hasVoiceSupport, setHasVoiceSupport] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setHasVoiceSupport(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript || '';
        if (transcript) {
          updateFormData({ goal: { ...formData.goal, title: transcript.trim(), voice_input: true } });
        }
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
    return () => recognitionRef.current?.stop();
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) { recognitionRef.current.stop(); }
    else { setIsListening(true); recognitionRef.current.start(); }
  };

  const handleInput = (field, value) => updateFormData({ goal: { ...formData.goal, [field]: value } });
  const handleTheme = (id) => updateFormData({ theme: id });
  const handleDuration = (days) => updateFormData({ timeline: { ...formData.timeline, duration_days: days } });
  const canProceed = formData.goal.title.trim().length >= 3;

  return (
    <div className={styles.stepContent}>
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={styles.stepTitle}
        >
          Define your mission
        </motion.div>
        <motion.div
          className={styles.stepSubtitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Give your transformation a name and shape
        </motion.div>

        <div className={styles.glassCard}>

          {/* Goal Title */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Goal Title</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="e.g., Complete Health Transformation"
                value={formData.goal.title}
                onChange={(e) => handleInput('title', e.target.value)}
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderBottomColor = 'rgba(201,168,76,0.5)';
                  e.target.style.background = 'rgba(201,168,76,0.03)';
                }}
                onBlur={(e) => {
                  e.target.style.borderBottomColor = 'rgba(237,229,212,0.1)';
                  e.target.style.background = 'rgba(237,229,212,0.02)';
                }}
              />
              {hasVoiceSupport && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: isListening ? 'rgba(224,82,82,0.1)' : 'rgba(201,168,76,0.08)',
                    border: `1px solid ${isListening ? 'rgba(224,82,82,0.25)' : 'rgba(201,168,76,0.2)'}`,
                    borderRadius: 6, padding: '5px 7px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {isListening ? (
                    <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }} style={{ display: 'flex', color: '#E05252' }}>
                      <SvgIcon name="microphone" size={13} color="#E05252" />
                    </motion.span>
                  ) : (
                    <SvgIcon name="microphone" size={13} color="#C9A84C" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Short Hint */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Context Hint</label>
              <span style={{ fontSize: 10, color: 'rgba(237,229,212,0.28)', fontWeight: 400, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Raleway, sans-serif' }}>Optional</span>
            </div>
            <input
              type="text"
              placeholder="Brief context for AI personalization"
              value={formData.goal.description}
              onChange={(e) => { if (e.target.value.length <= 80) handleInput('description', e.target.value); }}
              maxLength={80}
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderBottomColor = 'rgba(201,168,76,0.5)';
                e.target.style.background = 'rgba(201,168,76,0.03)';
              }}
              onBlur={(e) => {
                e.target.style.borderBottomColor = 'rgba(237,229,212,0.1)';
                e.target.style.background = 'rgba(237,229,212,0.02)';
              }}
            />
            <div style={{ textAlign: 'right', marginTop: 5, fontSize: 10, color: 'rgba(237,229,212,0.25)', fontFamily: 'Raleway, sans-serif' }}>
              {formData.goal.description.length}/80
            </div>
          </div>

          {/* Approach / Theme */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Approach</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {THEMES.map((t) => {
                const active = formData.theme === t.id;
                return (
                  <motion.button
                    key={t.id}
                    type="button"
                    onClick={() => handleTheme(t.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: '20px 12px 16px',
                      background: active ? `${t.color}12` : 'rgba(237,229,212,0.02)',
                      border: active ? `1px solid ${t.color}45` : '1px solid rgba(237,229,212,0.07)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.25s',
                      position: 'relative',
                    }}
                  >
                    {active && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                        background: `linear-gradient(90deg, transparent, ${t.color}80, transparent)`,
                        borderRadius: '12px 12px 0 0',
                      }} />
                    )}
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                      <SvgIcon name={t.icon} size={20} color={active ? t.color : 'rgba(237,229,212,0.4)'} />
                    </div>
                    <div style={{
                      fontFamily: 'Cormorant Garamond, Georgia, serif',
                      fontSize: 16, fontWeight: 600, marginBottom: 4,
                      color: active ? t.color : 'rgba(237,229,212,0.85)',
                    }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(237,229,212,0.4)', lineHeight: 1.4, fontFamily: 'Raleway, sans-serif' }}>
                      {t.description}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label style={labelStyle}>Duration</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {DURATIONS.map((d) => {
                const active = formData.timeline.duration_days === d.days;
                return (
                  <motion.button
                    key={d.days}
                    type="button"
                    onClick={() => handleDuration(d.days)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: '14px 6px 12px',
                      background: active ? 'rgba(201,168,76,0.1)' : 'rgba(237,229,212,0.02)',
                      border: active ? '1px solid rgba(201,168,76,0.35)' : '1px solid rgba(237,229,212,0.07)',
                      borderRadius: 10,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      fontFamily: 'Cormorant Garamond, Georgia, serif',
                      fontSize: 16, fontWeight: 600, marginBottom: 3,
                      color: active ? '#C9A84C' : 'rgba(237,229,212,0.75)',
                    }}>
                      {d.label}
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(237,229,212,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Raleway, sans-serif' }}>
                      {d.sub}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Navigation */}
        <div className={styles.buttonContainer}>
          <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={prevStep}>
            <SvgIcon name="chevronLeft" size={13} color="currentColor" /> Back
          </button>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={nextStep}
            disabled={!canProceed}
            style={{ opacity: canProceed ? 1 : 0.45, cursor: canProceed ? 'pointer' : 'not-allowed' }}
          >
            Continue <SvgIcon name="chevronRight" size={13} color="currentColor" />
          </button>
        </div>

      </motion.div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  fontFamily: 'Raleway, sans-serif',
  color: 'rgba(237,229,212,0.5)',
  marginBottom: 10,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
};

const inputStyle = {
  width: '100%',
  padding: '13px 44px 13px 0',
  background: 'rgba(237,229,212,0.02)',
  border: 'none',
  borderBottom: '1px solid rgba(237,229,212,0.1)',
  color: '#EDE5D4',
  fontSize: 15,
  fontFamily: 'Raleway, sans-serif',
  fontWeight: 400,
  outline: 'none',
  transition: 'all 0.25s ease',
  boxSizing: 'border-box',
};
