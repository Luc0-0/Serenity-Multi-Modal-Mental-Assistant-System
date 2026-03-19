/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 *
 * Weekly Pulse Check Modal — triggered on Sundays.
 * 3 quick questions that feed back into LLM for schedule refinement.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SvgIcon } from '../icons/SvgIcon';
import { apiClient } from '../../services/apiClient';
import styles from './PulseCheckModal.module.css';

const PULSE_QUESTIONS = [
  {
    id: 'energy',
    question: 'How was your energy this week?',
    icon: 'lightning',
    options: [
      { value: 'low', label: 'Running on empty', color: '#E53E3E' },
      { value: 'moderate', label: 'Steady but tired', color: '#F59E0B' },
      { value: 'good', label: 'Solid energy', color: '#38A169' },
      { value: 'great', label: 'Fully charged', color: '#6EE7B7' },
    ],
  },
  {
    id: 'consistency',
    question: 'How consistent were you with your schedule?',
    icon: 'flame',
    options: [
      { value: 'missed_most', label: 'Missed most days', color: '#E53E3E' },
      { value: 'half', label: 'About half', color: '#F59E0B' },
      { value: 'mostly', label: 'Mostly on track', color: '#38A169' },
      { value: 'perfect', label: 'Nailed every day', color: '#6EE7B7' },
    ],
  },
  {
    id: 'challenge',
    question: 'Biggest challenge this week?',
    icon: 'mountain',
    options: [
      { value: 'motivation', label: 'Staying motivated', color: '#9F7AEA' },
      { value: 'time', label: 'Finding time', color: '#3182CE' },
      { value: 'energy', label: 'Physical energy', color: '#E53E3E' },
      { value: 'none', label: 'Smooth sailing', color: '#6EE7B7' },
    ],
  },
];

export function PulseCheckModal({ isOpen, goalId, onClose, onSubmit }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [insights, setInsights] = useState(null);

  const question = PULSE_QUESTIONS[currentQ];
  const totalQ = PULSE_QUESTIONS.length;
  const isLast = currentQ === totalQ - 1;
  const allAnswered = Object.keys(answers).length === totalQ;

  const handleSelect = useCallback((value) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));

    if (!isLast) {
      setTimeout(() => setCurrentQ((q) => q + 1), 350);
    }
  }, [question, isLast]);

  const handleSubmit = useCallback(async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);

    try {
      const data = await apiClient.post(`/api/goals/${goalId}/pulse-check`, { answers });
      if (data.insights) {
        setInsights(data.insights);
      } else {
        onSubmit?.();
        onClose();
      }
    } catch (err) {
      console.error('Pulse check submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  }, [answers, allAnswered, submitting, goalId, onClose, onSubmit]);

  const handleDismissInsights = useCallback(() => {
    setInsights(null);
    onSubmit?.();
    onClose();
  }, [onClose, onSubmit]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className={styles.backdrop}
            initial={{ backdropFilter: 'blur(0px)' }}
            animate={{ backdropFilter: 'blur(16px)' }}
            exit={{ backdropFilter: 'blur(0px)' }}
          />

          <motion.div
            className={styles.card}
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            {/* Close button */}
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <SvgIcon name="x" size={18} color="rgba(255,255,255,0.4)" />
            </button>

            {insights ? (
              /* ── Insights View ── */
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.insightsView}
              >
                <div className={styles.insightsIcon}>
                  <SvgIcon name="sparkle" size={28} color="#C8A96E" />
                </div>
                <div className={styles.insightsLabel}>Weekly Insights</div>

                <p className={styles.encouragement}>{insights.encouragement}</p>

                {insights.adjustment_tip && (
                  <div className={styles.tipCard}>
                    <SvgIcon name="lightbulb" size={16} color="#F59E0B" />
                    <span>{insights.adjustment_tip}</span>
                  </div>
                )}

                {insights.focus_area && (
                  <div className={styles.focusBadge}>
                    Focus this week: <strong>{insights.focus_area}</strong>
                  </div>
                )}

                <motion.button
                  className={styles.doneButton}
                  onClick={handleDismissInsights}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Got it
                </motion.button>
              </motion.div>
            ) : (
              /* ── Questions View ── */
              <>
                {/* Header */}
                <div className={styles.header}>
                  <div className={styles.headerIcon}>
                    <SvgIcon name="pulse" size={20} color="#C8A96E" />
                  </div>
                  <div className={styles.headerLabel}>Weekly Pulse</div>
                  <div className={styles.headerProgress}>
                    {currentQ + 1} / {totalQ}
                  </div>
                </div>

                {/* Progress dots */}
                <div className={styles.dots}>
                  {PULSE_QUESTIONS.map((_, i) => (
                    <div
                      key={i}
                      className={`${styles.dot} ${i < currentQ ? styles.dotDone : ''} ${i === currentQ ? styles.dotActive : ''}`}
                    />
                  ))}
                </div>

                {/* Question */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQ}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25 }}
                    className={styles.questionArea}
                  >
                    <div className={styles.questionIcon}>
                      <SvgIcon name={question.icon} size={24} color="#C8A96E" />
                    </div>
                    <h3 className={styles.questionText}>{question.question}</h3>

                    <div className={styles.options}>
                      {question.options.map((opt) => {
                        const selected = answers[question.id] === opt.value;
                        return (
                          <motion.button
                            key={opt.value}
                            className={`${styles.option} ${selected ? styles.optionSelected : ''}`}
                            style={{
                              '--opt-color': opt.color,
                              borderColor: selected ? opt.color + '80' : undefined,
                              background: selected ? opt.color + '15' : undefined,
                            }}
                            onClick={() => handleSelect(opt.value)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            <span className={styles.optionLabel}>{opt.label}</span>
                            <div
                              className={styles.optionRadio}
                              style={{ borderColor: selected ? opt.color : undefined }}
                            >
                              {selected && (
                                <motion.div
                                  className={styles.optionDot}
                                  style={{ background: opt.color }}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                />
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Submit button (appears after last question answered) */}
                <AnimatePresence>
                  {allAnswered && (
                    <motion.button
                      className={styles.submitButton}
                      onClick={handleSubmit}
                      disabled={submitting}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {submitting ? 'Analyzing...' : 'Submit Pulse Check'}
                    </motion.button>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PulseCheckModal;
