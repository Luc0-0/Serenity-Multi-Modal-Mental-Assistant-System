/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 *
 * AIQuestionsStep — 4-group sequential question flow.
 * Each group: questions → summary card → next group.
 * Final: full summary of all answers → proceed to schedule generation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SvgIcon } from '../../../../../components/icons/SvgIcon';
import { apiClient } from '../../../../../services/apiClient';
import styles from '../OnboardingFlow.module.css';

const GROUP_META = [
  { id: 'physical', name: 'Physical & Energy', icon: 'dumbbell', color: '#E53E3E', description: 'Your body, energy levels, and physical routines' },
  { id: 'mental', name: 'Mental & Focus', icon: 'brain', color: '#3182CE', description: 'Focus patterns, cognitive peaks, and clarity' },
  { id: 'lifestyle', name: 'Lifestyle & Constraints', icon: 'home', color: '#38A169', description: 'Schedule, obligations, and available resources' },
  { id: 'preferences', name: 'Preferences & Approach', icon: 'settings', color: '#9F7AEA', description: 'Intensity, tracking style, and motivation' },
];

// View states: 'loading' | 'question' | 'group-summary' | 'final-summary'
export default function AIQuestionsStep({ formData, updateFormData, nextStep, prevStep }) {
  const [view, setView] = useState('loading');
  const [categories, setCategories] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showTooltip, setShowTooltip] = useState(null);
  const containerRef = useRef(null);

  // Fetch questions on mount
  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setView('loading');
    try {
      const data = await apiClient.post('/api/goals/generate-questions', {
        title: formData.goal.title,
        description: formData.goal.description,
        theme: formData.theme,
      });

      if (data.categories?.length === 4) {
        setCategories(data.categories);
      } else {
        throw new Error('Invalid structure');
      }
    } catch {
      // Use smart branching: fetch first group, then generate follow-ups
      setCategories(getMinimalFallback());
    } finally {
      setView('question');
    }
  };

  // Try smart branching for next group based on previous answers
  const fetchSmartQuestions = async (groupIndex) => {
    const groupId = GROUP_META[groupIndex].id;

    try {
      const data = await apiClient.post('/api/goals/generate-category-questions', {
        title: formData.goal.title,
        theme: formData.theme,
        category: groupId,
        previous_answers: answers,
      });

      if (data.questions?.length > 0) {
        // Merge smart questions into the category
        setCategories((prev) => {
          const updated = [...prev];
          const catIndex = updated.findIndex((c) => c.id === groupId);
          if (catIndex !== -1) {
            updated[catIndex] = { ...updated[catIndex], questions: data.questions };
          }
          return updated;
        });
      }
    } catch {
      // Keep existing fallback questions for this category
    }
  };

  const group = GROUP_META[currentGroup];
  const category = categories[currentGroup];
  const questions = category?.questions || [];
  const question = questions[currentQ];
  const totalGroups = GROUP_META.length;

  const handleAnswer = useCallback(
    (value, multiSelect = false) => {
      if (!question) return;
      const groupId = group.id;

      setAnswers((prev) => {
        const groupAnswers = prev[groupId] || {};

        if (multiSelect) {
          const current = groupAnswers[question.id] || [];
          const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
          return { ...prev, [groupId]: { ...groupAnswers, [question.id]: next } };
        }

        return { ...prev, [groupId]: { ...groupAnswers, [question.id]: value } };
      });

      // Auto-advance for radio only — slider/time have their own Next buttons
      if (!multiSelect && question.type !== 'slider' && question.type !== 'time') {
        setTimeout(() => advanceQuestion(), 400);
      }
    },
    [question, group],
  );

  const advanceQuestion = useCallback(() => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((q) => q + 1);
      scrollTop();
    } else {
      // Group complete → show group summary
      setView('group-summary');
    }
  }, [currentQ, questions.length]);

  const handleGroupSummaryNext = useCallback(async () => {
    if (currentGroup < totalGroups - 1) {
      const nextGroupIdx = currentGroup + 1;
      setCurrentGroup(nextGroupIdx);
      setCurrentQ(0);
      setView('loading');

      // Try to fetch smart questions for next group
      await fetchSmartQuestions(nextGroupIdx);
      setView('question');
    } else {
      setView('final-summary');
    }
  }, [currentGroup, totalGroups, answers]);

  const handleComplete = useCallback(() => {
    updateFormData({
      aiQuestions: { categories, answers },
    });
    nextStep();
  }, [categories, answers, updateFormData, nextStep]);

  const scrollTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Count answered in current group
  const groupAnswers = answers[group?.id] || {};
  const answeredInGroup = Object.keys(groupAnswers).filter((k) => {
    const v = groupAnswers[k];
    return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== '';
  }).length;

  // Overall progress
  const totalQCount = categories.reduce((s, c) => s + (c.questions?.length || 0), 0);
  const totalAnswered = Object.values(answers).reduce((s, ga) => {
    return s + Object.keys(ga).filter((k) => {
      const v = ga[k];
      return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== '';
    }).length;
  }, 0);

  /* ════════════════════════════════════════════
   *  LOADING VIEW
   * ════════════════════════════════════════════ */
  if (view === 'loading') {
    return (
      <div className={styles.stepContent} style={{ textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            style={{ display: 'inline-flex', marginBottom: 28, color: '#C8A96E' }}
          >
            <SvgIcon name="sparkle" size={48} color="#C8A96E" />
          </motion.div>

          <div className={styles.stepTitle} style={{ fontSize: 'clamp(24px, 5vw, 36px)', marginBottom: 12 }}>
            {currentGroup === 0 ? 'Crafting Your Path' : `Preparing ${GROUP_META[currentGroup]?.name}...`}
          </div>
          <div className={styles.stepSubtitle} style={{ marginBottom: 0 }}>
            {currentGroup === 0
              ? 'AI is analyzing your goal to create personalized questions...'
              : 'Adapting questions based on your previous answers...'}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 40 }}>
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(200,169,110,0.4)' }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
   *  GROUP SUMMARY VIEW
   * ════════════════════════════════════════════ */
  if (view === 'group-summary') {
    const summaryAnswers = answers[group.id] || {};
    const catQuestions = category?.questions || [];

    return (
      <div className={styles.stepContent} style={{ maxWidth: 520 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Group badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `${group.color}15`,
                border: `1px solid ${group.color}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SvgIcon name={group.icon} size={22} color={group.color} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: group.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Group {currentGroup + 1} of {totalGroups} Complete
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#F5F0E8' }}>{group.name}</div>
            </div>
          </div>

          {/* Answer summary cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {catQuestions.map((q) => {
              const a = summaryAnswers[q.id];
              if (a === undefined) return null;

              let displayValue = '';
              if (Array.isArray(a)) {
                const labels = a.map((v) => {
                  const opt = q.options?.find((o) => o.value === v);
                  return opt?.label || v;
                });
                displayValue = labels.join(', ');
              } else if (q.options) {
                displayValue = q.options.find((o) => o.value === a)?.label || String(a);
              } else if (q.unit) {
                displayValue = `${a} ${q.unit}`;
              } else {
                displayValue = String(a);
              }

              return (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * catQuestions.indexOf(q) }}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 12,
                  }}
                >
                  <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.45)', marginBottom: 4 }}>
                    {q.question}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: group.color }}>{displayValue}</div>
                </motion.div>
              );
            })}
          </div>

          {/* Next button */}
          <motion.button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleGroupSummaryNext}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ width: '100%' }}
          >
            {currentGroup < totalGroups - 1 ? (
              <>Next: {GROUP_META[currentGroup + 1].name} <SvgIcon name="chevronRight" size={14} color="currentColor" /></>
            ) : (
              <>Review All Answers <SvgIcon name="chevronRight" size={14} color="currentColor" /></>
            )}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
   *  FINAL SUMMARY VIEW
   * ════════════════════════════════════════════ */
  if (view === 'final-summary') {
    return (
      <div className={styles.stepContent} ref={containerRef} style={{ maxWidth: 560, overflowY: 'auto', maxHeight: '75vh' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className={styles.stepTitle} style={{ fontSize: 'clamp(24px, 4vw, 34px)', marginBottom: 8 }}>
            Your Personalization Profile
          </div>
          <div className={styles.stepSubtitle} style={{ marginBottom: 28 }}>
            Here's everything AI knows about you. Ready to generate your plan?
          </div>

          {GROUP_META.map((gm, gi) => {
            const ga = answers[gm.id] || {};
            const cat = categories[gi];
            if (!cat) return null;

            return (
              <motion.div
                key={gm.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.1 }}
                style={{
                  marginBottom: 16,
                  padding: '16px 18px',
                  background: 'rgba(15,15,20,0.4)',
                  border: `1px solid ${gm.color}20`,
                  borderRadius: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <SvgIcon name={gm.icon} size={18} color={gm.color} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: gm.color }}>{gm.name}</span>
                  <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.35)', marginLeft: 'auto' }}>
                    {Object.keys(ga).length} answers
                  </span>
                </div>

                {cat.questions?.map((q) => {
                  const a = ga[q.id];
                  if (a === undefined) return null;

                  let display = '';
                  if (Array.isArray(a)) {
                    display = a.map((v) => q.options?.find((o) => o.value === v)?.label || v).join(', ');
                  } else if (q.options) {
                    display = q.options.find((o) => o.value === a)?.label || String(a);
                  } else if (q.unit) {
                    display = `${a} ${q.unit}`;
                  } else {
                    display = String(a);
                  }

                  return (
                    <div key={q.id} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)' }}>{q.question}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#F5F0E8' }}>{display}</div>
                    </div>
                  );
                })}
              </motion.div>
            );
          })}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => {
                setCurrentGroup(0);
                setCurrentQ(0);
                setView('question');
              }}
              style={{ flex: 1 }}
            >
              <SvgIcon name="chevronLeft" size={14} color="currentColor" /> Edit
            </button>
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={handleComplete}
              style={{ flex: 2 }}
            >
              Generate My Plan <SvgIcon name="sparkle" size={14} color="currentColor" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
   *  QUESTION VIEW (default)
   * ════════════════════════════════════════════ */
  return (
    <div className={styles.stepContent} ref={containerRef} style={{ maxWidth: 560 }}>
      {/* Top bar: group indicator + overall progress */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24 }}
      >
        {/* Group chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {GROUP_META.map((gm, i) => {
            const isActive = i === currentGroup;
            const isDone = i < currentGroup;
            return (
              <div
                key={gm.id}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: isDone ? gm.color : isActive ? `${gm.color}80` : 'rgba(255,255,255,0.06)',
                  transition: 'all 0.4s',
                }}
              />
            );
          })}
        </div>

        {/* Group header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `${group.color}12`,
              border: `1px solid ${group.color}25`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SvgIcon name={group.icon} size={20} color={group.color} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F5F0E8' }}>{group.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.45)' }}>{group.description}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: group.color }}>
              {currentQ + 1}/{questions.length}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        {question && (
          <motion.div
            key={`${group.id}-${question.id}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{
              background: 'rgba(15,15,20,0.35)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 20,
              padding: '28px 24px',
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, color: '#F5F0E8', marginBottom: 20, lineHeight: 1.5 }}>
              {question.question}
            </div>

            {/* Render by type */}
            {question.type === 'radio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {question.options?.map((opt) => {
                  const selected = groupAnswers[question.id] === opt.value;
                  return (
                    <OptionButton
                      key={opt.value}
                      opt={opt}
                      selected={selected}
                      color={group.color}
                      onClick={() => handleAnswer(opt.value)}
                      showTooltip={showTooltip}
                      setShowTooltip={setShowTooltip}
                      tooltipKey={`${group.id}-${question.id}-${opt.value}`}
                    />
                  );
                })}
              </div>
            )}

            {question.type === 'checkbox' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {question.options?.map((opt) => {
                  const vals = groupAnswers[question.id] || [];
                  const selected = vals.includes(opt.value);
                  return (
                    <OptionButton
                      key={opt.value}
                      opt={opt}
                      selected={selected}
                      color={group.color}
                      checkbox
                      onClick={() => handleAnswer(opt.value, true)}
                      showTooltip={showTooltip}
                      setShowTooltip={setShowTooltip}
                      tooltipKey={`${group.id}-${question.id}-${opt.value}`}
                    />
                  );
                })}
                {/* Next button for checkbox (multi-select needs manual advance) */}
                {(groupAnswers[question.id]?.length > 0) && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={advanceQuestion}
                    style={{
                      marginTop: 8,
                      padding: '10px 20px',
                      background: 'rgba(200,169,110,0.12)',
                      border: '1px solid rgba(200,169,110,0.25)',
                      borderRadius: 10,
                      color: '#C8A96E',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      alignSelf: 'flex-end',
                    }}
                  >
                    Next <SvgIcon name="chevronRight" size={12} color="#C8A96E" />
                  </motion.button>
                )}
              </div>
            )}

            {question.type === 'slider' && (
              <SliderQuestion
                question={question}
                value={groupAnswers[question.id]}
                color={group.color}
                onChange={(v) => handleAnswer(v)}
                onNext={advanceQuestion}
                showTooltip={showTooltip}
                setShowTooltip={setShowTooltip}
                tooltipKey={`${group.id}-${question.id}-slider`}
              />
            )}

            {question.type === 'time' && (
              <TimeQuestion
                question={question}
                value={groupAnswers[question.id]}
                color={group.color}
                onChange={(v) => handleAnswer(v)}
                onNext={advanceQuestion}
                showTooltip={showTooltip}
                setShowTooltip={setShowTooltip}
                tooltipKey={`${group.id}-${question.id}-time`}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className={styles.buttonContainer}>
        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={() => {
            if (currentQ > 0) {
              setCurrentQ((q) => q - 1);
            } else if (currentGroup > 0) {
              setCurrentGroup((g) => g - 1);
              const prevCat = categories[currentGroup - 1];
              setCurrentQ((prevCat?.questions?.length || 1) - 1);
            } else {
              prevStep();
            }
          }}
        >
          <SvgIcon name="chevronLeft" size={14} color="currentColor" /> Back
        </button>

        {/* Skip group button */}
        {answeredInGroup >= 1 && currentQ < questions.length - 1 && (
          <button
            style={{
              padding: '8px 16px',
              background: 'none',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              color: 'rgba(245,240,232,0.4)',
              fontSize: 12,
              cursor: 'pointer',
            }}
            onClick={() => setView('group-summary')}
          >
            Skip to summary
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Option Button (radio/checkbox) ── */
function OptionButton({ opt, selected, color, checkbox, onClick, showTooltip, setShowTooltip, tooltipKey }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      style={{
        padding: '13px 16px',
        background: selected ? `${color}12` : 'rgba(255,255,255,0.02)',
        border: `1px solid ${selected ? color + '50' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 12,
        color: '#F5F0E8',
        fontSize: 14,
        fontFamily: 'inherit',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        textAlign: 'left',
        transition: 'all 0.2s',
      }}
    >
      <span>{opt.label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {opt.recommended && (
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setShowTooltip(tooltipKey)}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <SvgIcon name="sparkle" size={14} color="#FCD34D" />
            {showTooltip === tooltipKey && (
              <div style={tooltipStyle}>AI Pick: {opt.reason}</div>
            )}
          </div>
        )}
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: checkbox ? 5 : '50%',
            border: `2px solid ${selected ? color : 'rgba(255,255,255,0.15)'}`,
            background: selected ? color : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          {selected && !checkbox && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#0A0A0F' }} />}
          {selected && checkbox && <SvgIcon name="check" size={12} color="#0A0A0F" strokeWidth={3} />}
        </div>
      </div>
    </motion.button>
  );
}

/* ── Slider Question ── */
function SliderQuestion({ question, value, color, onChange, onNext, showTooltip, setShowTooltip, tooltipKey }) {
  const v = value !== undefined ? value : question.defaultValue;
  const pct = ((v - question.min) / (question.max - question.min)) * 100;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: 'rgba(245,240,232,0.5)' }}>{question.min}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color }}>{v} {question.unit}</span>
          {question.recommended === v && (
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => setShowTooltip(tooltipKey)}
              onMouseLeave={() => setShowTooltip(null)}
            >
              <SvgIcon name="sparkle" size={14} color="#FCD34D" />
              {showTooltip === tooltipKey && <div style={tooltipStyle}>AI Pick: {question.reason}</div>}
            </div>
          )}
        </div>
        <span style={{ fontSize: 13, color: 'rgba(245,240,232,0.5)' }}>{question.max}</span>
      </div>
      <input
        type="range"
        min={question.min}
        max={question.max}
        step={question.step}
        value={v}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{
          width: '100%',
          height: 6,
          borderRadius: 3,
          background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`,
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          cursor: 'pointer',
        }}
      />
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onNext}
        style={{
          marginTop: 16,
          padding: '10px 20px',
          background: 'rgba(200,169,110,0.12)',
          border: '1px solid rgba(200,169,110,0.25)',
          borderRadius: 10,
          color: '#C8A96E',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          float: 'right',
        }}
      >
        Next <SvgIcon name="chevronRight" size={12} color="#C8A96E" />
      </motion.button>
      <div style={{ clear: 'both' }} />
    </div>
  );
}

/* ── Time Question ── */
function TimeQuestion({ question, value, color, onChange, onNext, showTooltip, setShowTooltip, tooltipKey }) {
  const v = value || question.defaultValue;

  const handleConfirm = () => {
    // Ensure current value (even unchanged default) is saved before advancing
    onChange(v);
    onNext();
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <input
          type="time"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            padding: '14px 18px',
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 12,
            color: '#F5F0E8',
            fontSize: 16,
            fontFamily: 'inherit',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
        {question.recommended === v && (
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setShowTooltip(tooltipKey)}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <SvgIcon name="sparkle" size={18} color="#FCD34D" />
            {showTooltip === tooltipKey && <div style={tooltipStyle}>AI Pick: {question.reason}</div>}
          </div>
        )}
      </div>
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={handleConfirm}
        style={{
          padding: '10px 20px',
          background: 'rgba(200,169,110,0.12)',
          border: '1px solid rgba(200,169,110,0.25)',
          borderRadius: 10,
          color: '#C8A96E',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          float: 'right',
        }}
      >
        Confirm <SvgIcon name="chevronRight" size={12} color="#C8A96E" />
      </motion.button>
      <div style={{ clear: 'both' }} />
    </div>
  );
}

/* ── Minimal fallback categories ── */
function getMinimalFallback() {
  return GROUP_META.map((gm) => ({
    id: gm.id,
    name: gm.name,
    icon: gm.icon,
    color: gm.color,
    description: gm.description,
    questions: getFallbackQuestions(gm.id),
  }));
}

function getFallbackQuestions(catId) {
  const fallbacks = {
    physical: [
      { id: 'wake_time', type: 'radio', question: 'What time can you realistically wake up?', options: [
        { value: '05:00', label: '5:00 AM - Early Bird', recommended: false },
        { value: '06:30', label: '6:30 AM - Balanced', recommended: true, reason: 'Most sustainable for long-term habits' },
        { value: '08:00', label: '8:00 AM - Flexible', recommended: false },
        { value: '09:00', label: '9:00 AM - Late Start', recommended: false },
      ]},
      { id: 'exercise_freq', type: 'radio', question: 'How many days per week can you exercise?', options: [
        { value: '3', label: '3 days/week', recommended: false },
        { value: '5', label: '5 days/week', recommended: true, reason: 'Optimal for building habits' },
        { value: '6', label: '6 days/week', recommended: false },
        { value: '7', label: 'Daily', recommended: false },
      ]},
      { id: 'energy_peak', type: 'radio', question: 'When is your peak energy?', options: [
        { value: 'morning', label: 'Morning', recommended: true, reason: 'Aligned with productivity research' },
        { value: 'afternoon', label: 'Afternoon', recommended: false },
        { value: 'evening', label: 'Evening', recommended: false },
      ]},
    ],
    mental: [
      { id: 'focus_duration', type: 'slider', question: 'Max focused work session (without break)?', min: 25, max: 120, step: 5, unit: 'min', defaultValue: 50, recommended: 50, reason: 'Pomodoro-inspired focus blocks' },
      { id: 'distractions', type: 'checkbox', question: 'Biggest distractions?', options: [
        { value: 'social_media', label: 'Social media', recommended: false },
        { value: 'notifications', label: 'Phone notifications', recommended: false },
        { value: 'multitasking', label: 'Task switching', recommended: false },
        { value: 'environment', label: 'Noisy environment', recommended: false },
      ]},
      { id: 'learning_style', type: 'radio', question: 'How do you learn best?', options: [
        { value: 'reading', label: 'Reading / Writing', recommended: false },
        { value: 'visual', label: 'Visual / Video', recommended: false },
        { value: 'practice', label: 'Hands-on practice', recommended: true, reason: 'Active learning yields best retention' },
        { value: 'discussion', label: 'Discussion / Teaching', recommended: false },
      ]},
    ],
    lifestyle: [
      { id: 'work_schedule', type: 'radio', question: 'Your primary schedule type?', options: [
        { value: '9to5', label: '9-5 Full-time', recommended: false },
        { value: 'flexible', label: 'Flexible hours', recommended: true, reason: 'Allows schedule optimization' },
        { value: 'student', label: 'Student', recommended: false },
        { value: 'shift', label: 'Shift/Irregular', recommended: false },
      ]},
      { id: 'resources', type: 'checkbox', question: 'What resources do you have?', options: [
        { value: 'gym', label: 'Gym access', recommended: false },
        { value: 'quiet_space', label: 'Quiet workspace', recommended: true, reason: 'Essential for deep focus' },
        { value: 'partner', label: 'Accountability partner', recommended: false },
        { value: 'equipment', label: 'Home equipment', recommended: false },
      ]},
      { id: 'sleep_time', type: 'time', question: 'Target bedtime for 7-8 hours sleep?', defaultValue: '22:30', recommended: '22:30', reason: 'Ensures quality rest' },
    ],
    preferences: [
      { id: 'intensity', type: 'slider', question: 'Schedule intensity (1 gentle ... 10 extreme)?', min: 1, max: 10, step: 1, unit: '', defaultValue: 6, recommended: 6, reason: 'Sustainable long-term intensity' },
      { id: 'tracking', type: 'radio', question: 'Preferred tracking detail?', options: [
        { value: 'minimal', label: 'Minimal - Just checkboxes', recommended: false },
        { value: 'moderate', label: 'Moderate - Time + completion', recommended: true, reason: 'Balance of effort vs insight' },
        { value: 'detailed', label: 'Detailed - Full journaling', recommended: false },
      ]},
      { id: 'motivation', type: 'checkbox', question: 'What motivates you most?', options: [
        { value: 'streaks', label: 'Streak tracking', recommended: true, reason: 'Proven consistency booster' },
        { value: 'badges', label: 'Achievement badges', recommended: false },
        { value: 'progress', label: 'Progress visualization', recommended: false },
        { value: 'rewards', label: 'Milestone rewards', recommended: false },
      ]},
    ],
  };

  return fallbacks[catId] || [];
}

/* ── Shared styles ── */
const tooltipStyle = {
  position: 'absolute',
  right: 0,
  bottom: '100%',
  marginBottom: 8,
  padding: '6px 12px',
  background: 'rgba(10,10,15,0.95)',
  border: '1px solid rgba(252,211,77,0.3)',
  borderRadius: 8,
  fontSize: 11,
  color: '#FCD34D',
  whiteSpace: 'nowrap',
  zIndex: 100,
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
};
