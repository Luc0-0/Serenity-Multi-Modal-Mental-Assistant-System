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
  {
    id: 'tactical',
    name: 'Tactical',
    description: 'High-intensity, mission-focused',
    color: '#E53E3E',
    icon: 'lightning',
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Sustainable progress with wellness',
    color: '#3182CE',
    icon: 'compass',
  },
  {
    id: 'gentle',
    name: 'Gentle',
    description: 'Mindful, stress-free transformation',
    color: '#38A169',
    icon: 'leaf',
  },
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
          updateFormData({
            goal: {
              ...formData.goal,
              title: transcript.trim(),
              voice_input: true,
            },
          });
        }
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }

    return () => recognitionRef.current?.stop();
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleInput = (field, value) => {
    updateFormData({ goal: { ...formData.goal, [field]: value } });
  };

  const handleTheme = (id) => updateFormData({ theme: id });

  const handleDuration = (days) => {
    updateFormData({ timeline: { ...formData.timeline, duration_days: days } });
  };

  const canProceed = formData.goal.title.trim().length >= 3;

  return (
    <div className={styles.stepContent}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <motion.div
          className={styles.stepTitle}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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
          {/* ── Goal Title ── */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Goal Title</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="e.g., Complete Health Transformation"
                value={formData.goal.title}
                onChange={(e) => handleInput('title', e.target.value)}
                style={inputStyle}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
              {hasVoiceSupport && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: isListening ? 'rgba(239,68,68,0.15)' : 'rgba(200,169,110,0.1)',
                    border: `1px solid ${isListening ? 'rgba(239,68,68,0.3)' : 'rgba(200,169,110,0.2)'}`,
                    borderRadius: 8,
                    padding: '6px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {isListening ? (
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      style={{ display: 'flex', color: '#EF4444' }}
                    >
                      <SvgIcon name="microphone" size={14} color="#EF4444" />
                    </motion.span>
                  ) : (
                    <SvgIcon name="microphone" size={14} color="#C8A96E" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* ── Short Hint (optional) ── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Short Hint</label>
              <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.35)', fontWeight: 400 }}>Optional</span>
            </div>
            <input
              type="text"
              placeholder="Brief context for AI personalization"
              value={formData.goal.description}
              onChange={(e) => {
                if (e.target.value.length <= 80) handleInput('description', e.target.value);
              }}
              maxLength={80}
              style={inputStyle}
              onFocus={focusHandler}
              onBlur={blurHandler}
            />
            <div style={{ textAlign: 'right', marginTop: 4, fontSize: 11, color: 'rgba(245,240,232,0.3)' }}>
              {formData.goal.description.length}/80
            </div>
          </div>

          {/* ── Theme Selection ── */}
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
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: '18px 10px 14px',
                      background: active ? `${t.color}18` : 'rgba(255,255,255,0.02)',
                      border: active ? `2px solid ${t.color}55` : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 14,
                      color: active ? t.color : '#F5F0E8',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
                      <SvgIcon name={t.icon} size={22} color={active ? t.color : 'rgba(245,240,232,0.6)'} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{t.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.3 }}>{t.description}</div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ── Duration Pills (merged from Timeline) ── */}
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
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      padding: '14px 6px 10px',
                      background: active ? 'rgba(200,169,110,0.12)' : 'rgba(255,255,255,0.02)',
                      border: active ? '2px solid rgba(200,169,110,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      color: active ? '#C8A96E' : '#F5F0E8',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{d.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.55, textTransform: 'uppercase', letterSpacing: 0.5 }}>
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
            <SvgIcon name="chevronLeft" size={14} color="currentColor" /> Back
          </button>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={nextStep}
            disabled={!canProceed}
            style={{ opacity: canProceed ? 1 : 0.5, cursor: canProceed ? 'pointer' : 'not-allowed' }}
          >
            Continue <SvgIcon name="chevronRight" size={14} color="currentColor" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Shared inline styles ── */
const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'rgba(245, 240, 232, 0.7)',
  marginBottom: 10,
  letterSpacing: '1px',
  textTransform: 'uppercase',
};

const inputStyle = {
  width: '100%',
  padding: '14px 18px',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 12,
  color: '#F5F0E8',
  fontSize: 15,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'all 0.2s ease',
};

const focusHandler = (e) => {
  e.target.style.borderColor = 'rgba(200, 169, 110, 0.35)';
  e.target.style.background = 'rgba(255, 255, 255, 0.06)';
};

const blurHandler = (e) => {
  e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
  e.target.style.background = 'rgba(255, 255, 255, 0.04)';
};
