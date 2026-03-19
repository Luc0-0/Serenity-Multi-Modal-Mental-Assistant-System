/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../OnboardingFlow.module.css';

const spring = { type: 'spring', stiffness: 350, damping: 30 };

const PHASE_COLORS = ['#3182CE', '#F59E0B', '#9F7AEA'];

export default function ScheduleStep({ formData, updateFormData, nextStep, prevStep }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [generated, setGenerated] = useState(null);
  const [activeView, setActiveView] = useState('schedule'); // 'schedule' | 'phases'
  const hasGenerated = useRef(false);

  useEffect(() => {
    if (!hasGenerated.current && formData.goal.title) {
      hasGenerated.current = true;
      generatePersonalizedPlan();
    }
  }, []);

  const generatePersonalizedPlan = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/goals/generate-schedule-from-answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          title: formData.goal.title,
          description: formData.goal.description,
          theme: formData.theme,
          duration_days: formData.timeline.duration_days,
          answers: formData.aiQuestions.answers,
        }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();
      const schedule = data.daily_schedule || [];
      const phases = data.phases || [];

      if (schedule.length === 0) throw new Error('Empty schedule returned');

      setGenerated({ schedule, phases });
      updateFormData({
        schedule: { items: schedule, ai_generated: true, templates_used: [] },
        phases,
      });
    } catch (err) {
      console.error('Personalized plan generation failed:', err);
      setError(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const answeredCount = Object.keys(formData.aiQuestions.answers || {}).reduce(
    (sum, catId) => sum + Object.keys(formData.aiQuestions.answers[catId] || {}).length,
    0
  );

  /* ─── Loading State ─── */
  if (isGenerating) {
    return (
      <div className={styles.stepContent}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <motion.div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(200,169,110,0.3), rgba(159,122,234,0.3))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            animate={{
              scale: [1, 1.15, 1],
              boxShadow: [
                '0 0 0 0 rgba(200,169,110,0)',
                '0 0 40px 10px rgba(200,169,110,0.2)',
                '0 0 0 0 rgba(200,169,110,0)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <motion.div
              style={{
                width: 28,
                height: 28,
                border: '3px solid transparent',
                borderTop: '3px solid #C8A96E',
                borderRight: '3px solid #9F7AEA',
                borderRadius: '50%',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: '#F5F0E8', marginBottom: 12 }}>
              Crafting your personalized plan
            </div>
            <div style={{ fontSize: 14, color: 'rgba(245,240,232,0.55)', lineHeight: 1.6 }}>
              Analyzing {answeredCount} answers to build your optimal schedule,
              <br />
              phases, domains, and task breakdown...
            </div>
          </motion.div>

          <motion.div
            style={{ marginTop: 40, display: 'flex', justifyContent: 'center', gap: 6 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#C8A96E',
                }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  /* ─── Error State ─── */
  if (error && !generated) {
    return (
      <div className={styles.stepContent}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: '0 auto 24px',
              borderRadius: '50%',
              background: 'rgba(229,62,62,0.15)',
              border: '1px solid rgba(229,62,62,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E53E3E" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#F5F0E8', marginBottom: 8 }}>
            Generation encountered an issue
          </div>
          <div style={{ fontSize: 14, color: 'rgba(245,240,232,0.5)', marginBottom: 32 }}>
            {error}
          </div>
          <motion.button
            type="button"
            onClick={generatePersonalizedPlan}
            style={{
              padding: '14px 32px',
              background: 'linear-gradient(135deg, rgba(200,169,110,0.2), rgba(200,169,110,0.1))',
              border: '2px solid rgba(200,169,110,0.4)',
              borderRadius: 12,
              color: '#C8A96E',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Retry Generation
          </motion.button>
        </div>

        <div className={styles.buttonContainer}>
          <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={prevStep}>
            &larr; Back
          </button>
        </div>
      </div>
    );
  }

  /* ─── Generated Plan View ─── */
  const schedule = generated?.schedule || formData.schedule?.items || [];
  const phases = generated?.phases || formData.phases || [];

  return (
    <div className={styles.stepContent}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className={styles.stepTitle}>Your personalized plan</div>
        <div className={styles.stepSubtitle}>
          Built from your {answeredCount} answers using AI analysis — review and continue.
        </div>

        {/* View Toggle */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 24,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 12,
            padding: 4,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {[
            { id: 'schedule', label: `Daily Schedule (${schedule.length})` },
            { id: 'phases', label: `Phases (${phases.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 10,
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeView === tab.id ? 'rgba(200,169,110,0.15)' : 'transparent',
                color: activeView === tab.id ? '#C8A96E' : 'rgba(245,240,232,0.5)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.glassCard}>
          <AnimatePresence mode="wait">
            {activeView === 'schedule' ? (
              <motion.div
                key="schedule"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Schedule Timeline */}
                <div
                  style={{
                    display: 'grid',
                    gap: 8,
                    maxHeight: 380,
                    overflowY: 'auto',
                    paddingRight: 8,
                  }}
                >
                  {schedule.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      style={{
                        display: 'flex',
                        gap: 14,
                        padding: '12px 14px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.04)',
                        alignItems: 'flex-start',
                      }}
                    >
                      {/* Time */}
                      <div
                        style={{
                          minWidth: 52,
                          fontSize: 12,
                          fontWeight: 650,
                          color: '#C8A96E',
                          fontFamily: "'JetBrains Mono', monospace",
                          background: 'rgba(200,169,110,0.08)',
                          padding: '3px 8px',
                          borderRadius: 5,
                          border: '1px solid rgba(200,169,110,0.12)',
                          textAlign: 'center',
                        }}
                      >
                        {item.time}
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F0E8', marginBottom: 2 }}>
                          {item.activity}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.5)', lineHeight: 1.4 }}>
                          {item.description}
                        </div>
                        {item.tags && item.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                            {item.tags.map((tag, ti) => (
                              <span
                                key={ti}
                                style={{
                                  fontSize: 10,
                                  fontWeight: 550,
                                  color: 'rgba(245,240,232,0.6)',
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.03em',
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="phases"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Phase Cards */}
                <div style={{ display: 'grid', gap: 14 }}>
                  {phases.map((phase, pIdx) => {
                    const color = PHASE_COLORS[pIdx] || PHASE_COLORS[0];
                    const domains = phase.domains || [];
                    const totalTasks = domains.reduce((s, d) => s + (d.tasks || []).length, 0);

                    return (
                      <motion.div
                        key={pIdx}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: pIdx * 0.1 }}
                        style={{
                          padding: 18,
                          background: `linear-gradient(135deg, ${color}08, ${color}04)`,
                          border: `1px solid ${color}25`,
                          borderRadius: 14,
                        }}
                      >
                        {/* Phase Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: `linear-gradient(135deg, ${color}, ${color}aa)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 13,
                              fontWeight: 700,
                              color: '#fff',
                            }}
                          >
                            {pIdx + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 15, fontWeight: 650, color: '#F5F0E8' }}>
                              {phase.title}
                            </div>
                            <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.45)' }}>
                              {phase.unlock_streak_required === 0
                                ? 'Starts immediately'
                                : `Unlocks at ${phase.unlock_streak_required}-day streak`}
                              {' \u00B7 '}
                              {totalTasks} tasks across {domains.length} domains
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <div
                          style={{
                            fontSize: 13,
                            color: 'rgba(245,240,232,0.55)',
                            lineHeight: 1.5,
                            marginBottom: 12,
                          }}
                        >
                          {phase.description}
                        </div>

                        {/* Domains Preview */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {domains.map((domain, dIdx) => (
                            <span
                              key={dIdx}
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color,
                                background: `${color}12`,
                                border: `1px solid ${color}20`,
                                padding: '3px 8px',
                                borderRadius: 6,
                              }}
                            >
                              {domain.name} ({(domain.tasks || []).length})
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Badge */}
          <div
            style={{
              marginTop: 20,
              padding: 14,
              background: 'rgba(110,231,183,0.08)',
              border: '1px solid rgba(110,231,183,0.15)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6EE7B7" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span style={{ fontSize: 12, color: '#6EE7B7', fontWeight: 600 }}>
              Personalized from your answers using AI &mdash; not a template
            </span>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          <motion.button
            type="button"
            onClick={() => {
              hasGenerated.current = false;
              setGenerated(null);
              generatePersonalizedPlan();
            }}
            style={{
              padding: '8px 20px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: 'rgba(245,240,232,0.55)',
              fontSize: 12,
              fontWeight: 550,
              cursor: 'pointer',
            }}
            whileHover={{ scale: 1.03, borderColor: 'rgba(200,169,110,0.3)' }}
          >
            Regenerate plan
          </motion.button>
        </div>

        <div className={styles.buttonContainer}>
          <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={prevStep}>
            &larr; Back
          </button>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={nextStep}
            disabled={schedule.length === 0}
          >
            Continue &rarr;
          </button>
        </div>
      </motion.div>
    </div>
  );
}
