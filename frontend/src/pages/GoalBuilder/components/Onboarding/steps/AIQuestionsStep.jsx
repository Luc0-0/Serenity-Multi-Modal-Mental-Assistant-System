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

const GROUP_COLORS = ['#C9A84C', '#5A9CF5', '#52A97A', '#E05252', '#A855F7', '#F59E0B'];
const GROUP_ICONS = ['⚡', '🧠', '🌿', '🎯', '💡', '📊'];

// View states: 'loading' | 'question' | 'group-summary' | 'final-summary'
export default function AIQuestionsStep({ formData, updateFormData, nextStep, prevStep }) {
  const [view, setView] = useState('loading');
  const [categories, setCategories] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showTooltip, setShowTooltip] = useState(null);
  const [groupMeta, setGroupMeta] = useState({});
  const containerRef = useRef(null);

  useEffect(() => {
    fetchAllQuestions();
  }, []);

  const fetchAllQuestions = async () => {
    try {
      const data = await apiClient.post('/api/goals/generate-questions', {
        title: formData.goal?.title || '',
        description: formData.goal?.description || '',
        theme: formData.theme || 'balanced',
        domains: formData.goalProfile?.domains || [],
        domain_priorities: formData.goalProfile?.domain_priorities || {},
        motivation: formData.goalProfile?.motivation || '',
        baselines: formData.goalProfile?.baselines || {},
        goal_type: formData.goalProfile?.goal_type || null,
      });
      if (data.categories?.length > 0) {
        setCategories(data.categories);
        // Build dynamic group meta from API response
        const dynamicGroupMeta = {};
        (data.categories || []).forEach((cat, i) => {
          dynamicGroupMeta[cat.id] = {
            label: cat.name,
            description: cat.description || '',
            color: GROUP_COLORS[i % GROUP_COLORS.length],
            icon: GROUP_ICONS[i % GROUP_ICONS.length],
          };
        });
        setGroupMeta(dynamicGroupMeta);
      } else {
        throw new Error('Invalid structure');
      }
    } catch {
      setCategories(getMinimalFallback());
    } finally {
      setView('question');
    }
  };


  const activeGroupMeta = Object.keys(groupMeta).length > 0
    ? categories.map((cat, i) => ({
        id: cat.id,
        name: groupMeta[cat.id]?.label || cat.name,
        icon: cat.icon || 'sparkle',
        color: groupMeta[cat.id]?.color || GROUP_COLORS[i % GROUP_COLORS.length],
        description: groupMeta[cat.id]?.description || '',
      }))
    : GROUP_META;

  const group = activeGroupMeta[currentGroup] || GROUP_META[currentGroup];
  const category = categories[currentGroup];
  const questions = category?.questions || [];
  const question = questions[currentQ];
  const totalGroups = activeGroupMeta.length || GROUP_META.length;

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

  const fetchSmartQuestions = async (groupIndex) => {
    const groupId = (activeGroupMeta[groupIndex] || GROUP_META[groupIndex])?.id;
    try {
      const data = await apiClient.post('/api/goals/generate-category-questions', {
        title: formData.goal.title,
        theme: formData.theme,
        category: groupId,
        previous_answers: answers,
      });
      if (data.questions?.length > 0) {
        setCategories((prev) => {
          const updated = [...prev];
          const catIndex = updated.findIndex((c) => c.id === groupId);
          if (catIndex !== -1) updated[catIndex] = { ...updated[catIndex], questions: data.questions };
          return updated;
        });
      }
    } catch {
      // Keep existing questions for this category
    }
  };

  const handleGroupSummaryNext = useCallback(async () => {
    if (currentGroup < totalGroups - 1) {
      const nextGroupIdx = currentGroup + 1;
      setCurrentGroup(nextGroupIdx);
      setCurrentQ(0);
      setView('loading');
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
    return <AILoadingScreen groupIndex={currentGroup} goalTitle={formData.goal?.title || ''} groupMeta={activeGroupMeta} />;
  }

  /* ════════════════════════════════════════════
   *  GROUP SUMMARY VIEW
   * ════════════════════════════════════════════ */
  if (view === 'group-summary') {
    const summaryAnswers = answers[group.id] || {};
    const catQuestions = category?.questions || [];

    return (
      <div className={styles.stepContent} style={{ maxWidth: 500 }}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

          {/* Group header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12,
              background: `${group.color}10`,
              border: `1px solid ${group.color}28`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <SvgIcon name={group.icon} size={20} color={group.color} />
            </div>
            <div>
              <div style={{
                fontSize: 9, fontFamily: 'Raleway, sans-serif', fontWeight: 600,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: group.color, marginBottom: 4,
              }}>
                Group {currentGroup + 1} of {totalGroups} — Complete
              </div>
              <div style={{
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                fontSize: 22, fontWeight: 600, color: '#EDE5D4',
              }}>
                {group.name}
              </div>
            </div>
          </div>

          {/* Thin divider */}
          <div style={{ height: 1, background: 'rgba(237,229,212,0.06)', marginBottom: 20 }} />

          {/* Answer list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 28 }}>
            {catQuestions.map((q, qi) => {
              const a = summaryAnswers[q.id];
              if (a === undefined) return null;

              let displayValue = '';
              if (Array.isArray(a)) {
                const labels = a.map((v) => q.options?.find((o) => o.value === v)?.label || v);
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
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: qi * 0.07, duration: 0.4 }}
                  style={{
                    padding: '14px 0',
                    borderBottom: '1px solid rgba(237,229,212,0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
                  }}
                >
                  <div style={{
                    fontSize: 12, fontFamily: 'Raleway, sans-serif',
                    color: 'rgba(237,229,212,0.4)', lineHeight: 1.5, flex: 1,
                  }}>
                    {q.question}
                  </div>
                  <div style={{
                    fontFamily: 'Raleway, sans-serif', fontSize: 13, fontWeight: 600,
                    color: group.color, textAlign: 'right', flexShrink: 0, maxWidth: '45%',
                  }}>
                    {displayValue}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Next button */}
          <motion.button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleGroupSummaryNext}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {currentGroup < totalGroups - 1 ? (
              <>Next: {(activeGroupMeta[currentGroup + 1] || GROUP_META[currentGroup + 1])?.name} <SvgIcon name="chevronRight" size={13} color="currentColor" /></>
            ) : (
              <>Review All Answers <SvgIcon name="chevronRight" size={13} color="currentColor" /></>
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
      <div className={styles.stepContent} ref={containerRef} style={{ maxWidth: 560, overflowY: 'auto', maxHeight: '78vh', textAlign: 'left' }}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              fontSize: 9, fontFamily: 'Raleway, sans-serif', fontWeight: 600,
              letterSpacing: '0.3em', textTransform: 'uppercase',
              color: 'rgba(201,168,76,0.5)', marginBottom: 10,
            }}>
              Personalization Profile
            </div>
            <div style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 600, color: '#EDE5D4',
            }}>
              Here's what AI knows about you
            </div>
            <div style={{
              fontSize: 13, fontFamily: 'Raleway, sans-serif',
              color: 'rgba(237,229,212,0.4)', marginTop: 8, lineHeight: 1.6,
            }}>
              Ready to generate your personalized plan?
            </div>
          </div>

          {/* Category sections */}
          {activeGroupMeta.map((gm, gi) => {
            const ga = answers[gm.id] || {};
            const cat = categories[gi];
            if (!cat) return null;

            return (
              <motion.div
                key={gm.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.08 }}
                style={{
                  marginBottom: 14,
                  background: 'rgba(14,12,10,0.5)',
                  border: '1px solid rgba(237,229,212,0.06)',
                  borderLeft: `3px solid ${gm.color}50`,
                  borderRadius: '0 14px 14px 0',
                  padding: '16px 18px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Category header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                  <SvgIcon name={gm.icon} size={15} color={gm.color} />
                  <span style={{
                    fontSize: 12, fontWeight: 600, fontFamily: 'Raleway, sans-serif',
                    letterSpacing: '0.06em', textTransform: 'uppercase', color: gm.color,
                  }}>
                    {gm.name}
                  </span>
                  <span style={{
                    fontSize: 10, color: 'rgba(237,229,212,0.25)',
                    marginLeft: 'auto', fontFamily: 'Raleway, sans-serif',
                  }}>
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
                    <div key={q.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                      gap: 12, padding: '8px 0',
                      borderBottom: '1px solid rgba(237,229,212,0.04)',
                    }}>
                      <div style={{
                        fontSize: 11, fontFamily: 'Raleway, sans-serif',
                        color: 'rgba(237,229,212,0.35)', flex: 1, lineHeight: 1.5,
                      }}>
                        {q.question}
                      </div>
                      <div style={{
                        fontSize: 12, fontWeight: 500, fontFamily: 'Raleway, sans-serif',
                        color: '#EDE5D4', textAlign: 'right', flexShrink: 0, maxWidth: '48%',
                      }}>
                        {display}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            );
          })}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => { setCurrentGroup(0); setCurrentQ(0); setView('question'); }}
              style={{ flex: 1 }}
            >
              <SvgIcon name="chevronLeft" size={13} color="currentColor" /> Edit
            </button>
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={handleComplete}
              style={{ flex: 2.5 }}
            >
              Generate My Plan <SvgIcon name="sparkle" size={13} color="currentColor" />
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
    <div className={styles.stepContent} ref={containerRef} style={{ maxWidth: 540 }}>

      {/* Top: progress segments + Q counter */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
          {activeGroupMeta.map((gm, i) => (
            <div key={gm.id} style={{
              flex: 1, height: 2, borderRadius: 1,
              background: i < currentGroup ? gm.color : i === currentGroup ? `${gm.color}55` : 'rgba(237,229,212,0.05)',
              transition: 'all 0.5s',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 3, height: 18, background: group.color, borderRadius: 2, flexShrink: 0 }} />
          <div style={{
            fontSize: 10, fontFamily: 'Raleway, sans-serif', fontWeight: 600,
            letterSpacing: '0.14em', textTransform: 'uppercase', color: group.color,
            flex: 1,
          }}>
            {group.name}
          </div>
          <div style={{
            fontSize: 10, fontFamily: 'Raleway, sans-serif', fontWeight: 500,
            letterSpacing: '0.08em', color: 'rgba(237,229,212,0.3)',
          }}>
            {currentQ + 1} / {questions.length}
          </div>
        </div>
      </motion.div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        {question && (
          <motion.div
            key={`${group.id}-${question.id}`}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            style={{ marginBottom: 24 }}
          >
            {/* Question text — Cormorant large italic */}
            <div style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontStyle: 'italic', fontWeight: 500,
              fontSize: 'clamp(20px, 3.2vw, 27px)',
              color: '#EDE5D4', lineHeight: 1.45,
              marginBottom: 22, letterSpacing: '-0.1px',
            }}>
              {question.question}
            </div>

            {/* Thin divider */}
            <div style={{ height: 1, background: 'rgba(237,229,212,0.06)', marginBottom: 16 }} />

            {/* Options by type */}
            {question.type === 'radio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {question.options?.map((opt) => (
                  <OptionButton
                    key={opt.value}
                    opt={opt}
                    selected={groupAnswers[question.id] === opt.value}
                    color={group.color}
                    onClick={() => handleAnswer(opt.value)}
                    showTooltip={showTooltip}
                    setShowTooltip={setShowTooltip}
                    tooltipKey={`${group.id}-${question.id}-${opt.value}`}
                  />
                ))}
              </div>
            )}

            {question.type === 'checkbox' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {question.options?.map((opt) => {
                  const vals = groupAnswers[question.id] || [];
                  return (
                    <OptionButton
                      key={opt.value}
                      opt={opt}
                      selected={vals.includes(opt.value)}
                      color={group.color}
                      checkbox
                      onClick={() => handleAnswer(opt.value, true)}
                      showTooltip={showTooltip}
                      setShowTooltip={setShowTooltip}
                      tooltipKey={`${group.id}-${question.id}-${opt.value}`}
                    />
                  );
                })}
                {(groupAnswers[question.id]?.length > 0) && (
                  <motion.button
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={advanceQuestion}
                    style={{
                      marginTop: 6, padding: '10px 18px',
                      background: 'rgba(201,168,76,0.08)',
                      border: '1px solid rgba(201,168,76,0.22)',
                      borderRadius: 8, color: '#C9A84C',
                      fontSize: 11, fontFamily: 'Raleway, sans-serif', fontWeight: 600,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      cursor: 'pointer', alignSelf: 'flex-end',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    Next <SvgIcon name="chevronRight" size={11} color="#C9A84C" />
                  </motion.button>
                )}
              </div>
            )}

            {question.type === 'slider' && (
              <SliderQuestion
                question={question} value={groupAnswers[question.id]}
                color={group.color} onChange={(v) => handleAnswer(v)} onNext={advanceQuestion}
                showTooltip={showTooltip} setShowTooltip={setShowTooltip}
                tooltipKey={`${group.id}-${question.id}-slider`}
              />
            )}

            {question.type === 'time' && (
              <TimeQuestion
                question={question} value={groupAnswers[question.id]}
                color={group.color} onChange={(v) => handleAnswer(v)} onNext={advanceQuestion}
                showTooltip={showTooltip} setShowTooltip={setShowTooltip}
                tooltipKey={`${group.id}-${question.id}-time`}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className={styles.buttonContainer} style={{ justifyContent: 'space-between', marginTop: 16 }}>
        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={() => {
            if (currentQ > 0) { setCurrentQ((q) => q - 1); }
            else if (currentGroup > 0) {
              setCurrentGroup((g) => g - 1);
              const prevCat = categories[currentGroup - 1];
              setCurrentQ((prevCat?.questions?.length || 1) - 1);
            } else { prevStep(); }
          }}
        >
          <SvgIcon name="chevronLeft" size={13} color="currentColor" /> Back
        </button>

        {answeredInGroup >= 1 && currentQ < questions.length - 1 && (
          <button
            onClick={() => setView('group-summary')}
            style={{
              padding: '8px 14px', background: 'transparent',
              border: '1px solid rgba(237,229,212,0.08)',
              borderRadius: 6, color: 'rgba(237,229,212,0.3)',
              fontSize: 10, fontFamily: 'Raleway, sans-serif', fontWeight: 500,
              letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
            }}
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
      whileTap={{ scale: 0.997 }}
      style={{
        width: '100%',
        padding: '13px 14px 13px 16px',
        background: selected ? `${color}08` : 'rgba(237,229,212,0.015)',
        border: `1px solid ${selected ? color + '30' : 'rgba(237,229,212,0.07)'}`,
        borderLeft: selected ? `3px solid ${color}` : '3px solid transparent',
        borderRadius: 10,
        color: '#EDE5D4',
        fontSize: 14,
        fontFamily: 'Raleway, sans-serif',
        fontWeight: selected ? 500 : 400,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        textAlign: 'left',
        transition: 'all 0.2s',
        position: 'relative',
      }}
    >
      <span style={{ flex: 1 }}>{opt.label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {opt.recommended && (
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setShowTooltip(tooltipKey)}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <span style={{
              fontSize: 8, fontFamily: 'Raleway, sans-serif', fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#C9A84C', border: '1px solid rgba(201,168,76,0.28)',
              borderRadius: 3, padding: '2px 5px',
            }}>
              Pick
            </span>
            {showTooltip === tooltipKey && (
              <div style={tooltipStyle}>AI: {opt.reason}</div>
            )}
          </div>
        )}
        <div style={{
          width: 17, height: 17,
          borderRadius: checkbox ? 4 : '50%',
          border: `1.5px solid ${selected ? color : 'rgba(237,229,212,0.18)'}`,
          background: selected ? color : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s', flexShrink: 0,
        }}>
          {selected && !checkbox && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#080706' }} />}
          {selected && checkbox && <SvgIcon name="check" size={10} color="#080706" strokeWidth={3} />}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontFamily: 'Raleway, sans-serif', color: 'rgba(237,229,212,0.35)', letterSpacing: '0.06em' }}>
          {question.min}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontSize: 28, fontWeight: 600, color,
          }}>
            {v}
          </span>
          <span style={{ fontSize: 13, fontFamily: 'Raleway, sans-serif', color: 'rgba(237,229,212,0.45)' }}>
            {question.unit}
          </span>
          {question.recommended === v && (
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => setShowTooltip(tooltipKey)}
              onMouseLeave={() => setShowTooltip(null)}
            >
              <span style={{
                fontSize: 8, fontFamily: 'Raleway, sans-serif', fontWeight: 600,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#C9A84C', border: '1px solid rgba(201,168,76,0.28)',
                borderRadius: 3, padding: '2px 5px',
              }}>Pick</span>
              {showTooltip === tooltipKey && <div style={tooltipStyle}>AI: {question.reason}</div>}
            </div>
          )}
        </div>
        <span style={{ fontSize: 12, fontFamily: 'Raleway, sans-serif', color: 'rgba(237,229,212,0.35)', letterSpacing: '0.06em' }}>
          {question.max}
        </span>
      </div>
      <input
        type="range"
        min={question.min} max={question.max} step={question.step} value={v}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{
          width: '100%', height: 4, borderRadius: 2,
          background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, rgba(237,229,212,0.07) ${pct}%, rgba(237,229,212,0.07) 100%)`,
          outline: 'none', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onNext}
          style={{
            padding: '9px 18px',
            background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.22)',
            borderRadius: 8, color: '#C9A84C',
            fontSize: 11, fontFamily: 'Raleway, sans-serif', fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          Next <SvgIcon name="chevronRight" size={11} color="#C9A84C" />
        </motion.button>
      </div>
    </div>
  );
}

/* ── Time Question ── */
function TimeQuestion({ question, value, color, onChange, onNext, showTooltip, setShowTooltip, tooltipKey }) {
  const v = value || question.defaultValue;

  const handleConfirm = () => {
    onChange(v);
    onNext();
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <input
          type="time"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1, padding: '13px 16px',
            background: 'rgba(237,229,212,0.02)',
            border: '1px solid rgba(237,229,212,0.08)',
            borderRadius: 10, color: '#EDE5D4',
            fontSize: 18,
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontWeight: 500,
            outline: 'none', cursor: 'pointer',
          }}
        />
        {question.recommended === v && (
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setShowTooltip(tooltipKey)}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <span style={{
              fontSize: 8, fontFamily: 'Raleway, sans-serif', fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#C9A84C', border: '1px solid rgba(201,168,76,0.28)',
              borderRadius: 3, padding: '3px 6px',
            }}>Pick</span>
            {showTooltip === tooltipKey && <div style={tooltipStyle}>AI: {question.reason}</div>}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleConfirm}
          style={{
            padding: '9px 18px',
            background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.22)',
            borderRadius: 8, color: '#C9A84C',
            fontSize: 11, fontFamily: 'Raleway, sans-serif', fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          Confirm <SvgIcon name="chevronRight" size={11} color="#C9A84C" />
        </motion.button>
      </div>
    </div>
  );
}

/* ── AI Loading Screen ── */
const INITIAL_STAGES = [
  { label: 'Reading your goal', sub: 'Understanding what you want to achieve' },
  { label: 'Mapping your context', sub: 'Identifying key factors for your journey' },
  { label: 'Crafting Physical questions', sub: 'Energy, routines, and body readiness' },
  { label: 'Crafting Mental questions', sub: 'Focus, clarity, and cognitive patterns' },
  { label: 'Crafting Lifestyle questions', sub: 'Schedule, constraints, and resources' },
  { label: 'Crafting Preferences questions', sub: 'Intensity, tracking, and motivation style' },
];

const BETWEEN_STAGES = [
  { label: 'Analyzing your answers', sub: 'Building a picture of your patterns' },
  { label: 'Adapting next questions', sub: 'Tailoring based on what you shared' },
  { label: 'Almost ready', sub: 'Personalizing for your exact situation' },
];

function AILoadingScreen({ groupIndex, goalTitle, groupMeta: passedGroupMeta }) {
  const displayMeta = (passedGroupMeta && passedGroupMeta.length > 0) ? passedGroupMeta : GROUP_META;
  const [stageIdx, setStageIdx] = useState(0);
  const stages = groupIndex === 0 ? INITIAL_STAGES : BETWEEN_STAGES;

  useEffect(() => {
    setStageIdx(0);
    const interval = setInterval(() => {
      setStageIdx((i) => (i < stages.length - 1 ? i + 1 : i));
    }, groupIndex === 0 ? 5500 : 2200);
    return () => clearInterval(interval);
  }, [groupIndex]);

  const progress = Math.min(((stageIdx + 1) / stages.length) * 100, 95);

  return (
    <div className={styles.stepContent} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '70vh', position: 'relative',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none',
      }} />

      {/* Brand mark */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        style={{
          fontSize: 9, fontFamily: 'Raleway, sans-serif', fontWeight: 600,
          letterSpacing: '0.4em', textTransform: 'uppercase',
          color: 'rgba(201,168,76,0.4)', marginBottom: 24,
        }}
      >
        Serenity AI
      </motion.div>

      {/* Expanding line */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
        style={{
          width: 200, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)',
          marginBottom: 36, transformOrigin: 'center',
        }}
      />

      {/* Stage text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stageIdx}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ textAlign: 'center', marginBottom: 12 }}
        >
          <div style={{
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontStyle: 'italic', fontWeight: 500,
            fontSize: 'clamp(26px, 4.5vw, 40px)',
            color: '#EDE5D4', lineHeight: 1.25, marginBottom: 10,
          }}>
            {stages[stageIdx]?.label}
          </div>
          <div style={{
            fontSize: 12, fontFamily: 'Raleway, sans-serif',
            color: 'rgba(237,229,212,0.38)', letterSpacing: '0.06em',
          }}>
            {stages[stageIdx]?.sub}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Progress line */}
      <div style={{
        width: 200, height: 1, background: 'rgba(237,229,212,0.06)',
        marginTop: 28, marginBottom: 36, position: 'relative', overflow: 'hidden',
      }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          style={{
            height: '100%', position: 'absolute', top: 0, left: 0,
            background: 'linear-gradient(90deg, rgba(201,168,76,0.4), #C9A84C)',
            boxShadow: '0 0 8px rgba(201,168,76,0.4)',
          }}
        />
      </div>

      {/* Category icons — initial load only */}
      {groupIndex === 0 && (
        <div style={{ display: 'flex', gap: 24 }}>
          {displayMeta.map((gm, i) => {
            const lit = stageIdx >= i + 2;
            return (
              <motion.div
                key={gm.id}
                animate={{ opacity: lit ? 1 : 0.18 }}
                transition={{ duration: 0.9 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: lit ? `${gm.color}12` : 'rgba(237,229,212,0.02)',
                  border: `1px solid ${lit ? gm.color + '35' : 'rgba(237,229,212,0.05)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.9s ease',
                }}>
                  {gm.icon && gm.icon.length <= 2
                    ? <span style={{ fontSize: 15 }}>{gm.icon}</span>
                    : <SvgIcon name={gm.icon} size={15} color={lit ? gm.color : 'rgba(237,229,212,0.15)'} />
                  }
                </div>
                <div style={{
                  fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase',
                  fontFamily: 'Raleway, sans-serif', fontWeight: 600,
                  color: lit ? 'rgba(201,168,76,0.55)' : 'rgba(237,229,212,0.15)',
                  transition: 'color 0.9s ease',
                }}>
                  {gm.name.split(' ')[0]}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
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
  bottom: 'calc(100% + 6px)',
  padding: '6px 10px',
  background: 'rgba(8,7,6,0.96)',
  border: '1px solid rgba(201,168,76,0.22)',
  borderRadius: 6,
  fontSize: 11,
  fontFamily: 'Raleway, sans-serif',
  color: '#C9A84C',
  whiteSpace: 'nowrap',
  zIndex: 100,
  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
};
