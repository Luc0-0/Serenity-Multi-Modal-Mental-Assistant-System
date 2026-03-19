/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../../../services/apiClient';
import styles from './PhasesTab.module.css';

const PHASE_THEMES = [
  {
    color: '#3182CE',
    light: '#63B3ED',
    bg: 'rgba(49, 130, 206, 0.08)',
    activeBg: 'rgba(49, 130, 206, 0.14)',
    border: 'rgba(49, 130, 206, 0.18)',
    activeBorder: 'rgba(49, 130, 206, 0.4)',
    gradient: 'linear-gradient(135deg, #3182CE, #63B3ED)',
  },
  {
    color: '#F59E0B',
    light: '#FBBF24',
    bg: 'rgba(245, 158, 11, 0.08)',
    activeBg: 'rgba(245, 158, 11, 0.14)',
    border: 'rgba(245, 158, 11, 0.18)',
    activeBorder: 'rgba(245, 158, 11, 0.4)',
    gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
  },
  {
    color: '#9F7AEA',
    light: '#B794F4',
    bg: 'rgba(159, 122, 234, 0.08)',
    activeBg: 'rgba(159, 122, 234, 0.14)',
    border: 'rgba(159, 122, 234, 0.18)',
    activeBorder: 'rgba(159, 122, 234, 0.4)',
    gradient: 'linear-gradient(135deg, #9F7AEA, #B794F4)',
  },
];

const spring = { type: 'spring', stiffness: 350, damping: 30 };

/* ─── Animated SVG Checkmark ─── */
function AnimatedCheck({ checked, dark }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M20 6L9 17L4 12"
        stroke={dark ? '#0A0A0F' : 'rgba(255,255,255,0.3)'}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      />
    </svg>
  );
}

/* ─── Gold Particle Burst ─── */
function GoldBurst({ trigger }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!trigger) return;
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      angle: (i / 8) * 360,
      distance: 20 + Math.random() * 16,
      size: 3 + Math.random() * 3,
      delay: Math.random() * 0.1,
    }));
    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 600);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div className={styles.burstContainer}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={styles.goldParticle}
          style={{ width: p.size, height: p.size }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
            y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.5, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/* ─── Phase Stats Helper ─── */
function getPhaseStats(phase) {
  const domains = phase.domains || [];
  let total = 0, completed = 0;
  domains.forEach((d) =>
    (d.tasks || []).forEach((t) => {
      total++;
      if (t.is_completed) completed++;
    })
  );
  return { total, completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

/* ─── Domain Progress Ring (small) ─── */
function MiniRing({ completed, total, color }) {
  const r = 13;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? completed / total : 0;

  return (
    <svg width="32" height="32" viewBox="0 0 32 32" className={styles.miniRing}>
      <circle cx="16" cy="16" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
      <motion.circle
        cx="16" cy="16" r={r}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct) }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        transform="rotate(-90 16 16)"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function PhasesTab({ goalData, onUpdate }) {
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [justCompleted, setJustCompleted] = useState(null);
  const detailRef = useRef(null);

  const phases = goalData?.phases || [];
  const goal = goalData?.goal;
  const streak = goal?.current_streak || 0;

  /* Auto-expand first unlocked phase on mount */
  useEffect(() => {
    const firstUnlocked = phases.find((p) => p.is_unlocked);
    if (firstUnlocked && phases.some((p) => (p.domains || []).length > 0)) {
      setExpandedPhase(firstUnlocked.phase_number);
    }
  }, []);

  const handlePhaseClick = useCallback((phaseNum, unlocked) => {
    if (!unlocked) return;
    setExpandedPhase((prev) => (prev === phaseNum ? null : phaseNum));
  }, []);

  const handleTaskComplete = useCallback(
    async (phaseId, taskId) => {
      setJustCompleted(taskId);
      setTimeout(() => setJustCompleted(null), 600);

      try {
        await apiClient.post(`/api/goals/${goal.id}/phases/${phaseId}/tasks/${taskId}/complete`);
        if (onUpdate) onUpdate(goal.id);
      } catch (err) {
        console.error('Task toggle failed:', err);
      }
    },
    [goal?.id, onUpdate]
  );

  const toggleTaskExpand = useCallback((taskId) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  }, []);

  /* Scroll expanded detail into view */
  useEffect(() => {
    if (expandedPhase !== null && detailRef.current) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    }
  }, [expandedPhase]);

  const unlockedCount = phases.filter((p) => p.is_unlocked).length;

  return (
    <div className={styles.container}>
      {/* ─── Section Header ─── */}
      <motion.div
        className={styles.sectionHeader}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0 }}
      >
        <h2 className={styles.title}>Your Journey</h2>
        <p className={styles.subtitle}>
          {streak > 0 && <span className={styles.streakPill}>{streak}-day streak</span>}
          {unlockedCount} of {phases.length} phases unlocked
        </p>
      </motion.div>

      {/* ─── Phase Timeline Track ─── */}
      <div className={styles.timelineWrapper}>
        <div className={styles.timelineTrack} aria-hidden="true">
          <motion.div
            className={styles.timelineFill}
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedCount / Math.max(phases.length, 1)) * 100}%` }}
            transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
          />
        </div>
      </div>

      {/* ─── Phase Cards ─── */}
      <div className={styles.phaseCards}>
        {phases.map((phase, idx) => {
          const theme = PHASE_THEMES[phase.phase_number] || PHASE_THEMES[0];
          const stats = getPhaseStats(phase);
          const isExpanded = expandedPhase === phase.phase_number;
          const gap = Math.max(0, phase.unlock_streak_required - streak);

          return (
            <motion.div
              key={phase.id || phase.phase_number}
              className={[
                styles.phaseCard,
                phase.is_unlocked ? styles.unlocked : styles.locked,
                isExpanded ? styles.expanded : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                '--pc': theme.color,
                '--pl': theme.light,
                '--pbg': isExpanded ? theme.activeBg : theme.bg,
                '--pbd': isExpanded ? theme.activeBorder : theme.border,
                '--pgr': theme.gradient,
              }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: idx * 0.1 + 0.05 }}
              onClick={() => handlePhaseClick(phase.phase_number, phase.is_unlocked)}
              whileHover={phase.is_unlocked ? { y: -3, transition: { duration: 0.2 } } : undefined}
              whileTap={phase.is_unlocked ? { scale: 0.98 } : undefined}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              aria-label={`Phase ${phase.phase_number + 1}: ${phase.title}${phase.is_unlocked ? '' : ', locked'}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePhaseClick(phase.phase_number, phase.is_unlocked);
                }
              }}
            >
              {/* Phase Number Badge */}
              <div className={styles.phaseBadge}>
                <span className={styles.phaseNum}>{phase.phase_number + 1}</span>
              </div>

              {/* Content */}
              <div className={styles.phaseBody}>
                <div className={styles.phaseTop}>
                  <h3 className={styles.phaseName}>{phase.title}</h3>
                  {phase.is_unlocked ? (
                    <span className={styles.activeBadge}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                      </svg>
                      Active
                    </span>
                  ) : (
                    <span className={styles.lockBadge}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      {gap}d left
                    </span>
                  )}
                </div>

                <p className={styles.phaseDesc}>{phase.description}</p>

                {/* Progress for unlocked */}
                {phase.is_unlocked && stats.total > 0 && (
                  <div className={styles.phaseProgress}>
                    <div className={styles.progressTrack}>
                      <motion.div
                        className={styles.progressFill}
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.pct}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.1 + 0.3 }}
                      />
                    </div>
                    <span className={styles.progressLabel}>
                      {stats.completed}/{stats.total}
                    </span>
                  </div>
                )}

                {/* Expand chevron */}
                {phase.is_unlocked && (phase.domains || []).length > 0 && (
                  <motion.div
                    className={styles.chevron}
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    aria-hidden="true"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </motion.div>
                )}
              </div>

              {/* Locked Overlay */}
              {!phase.is_unlocked && (
                <div className={styles.lockedOverlay}>
                  <div className={styles.lockIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--pc)" strokeWidth="1.5" opacity="0.6">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <span className={styles.lockLabel}>
                    Unlocks at {phase.unlock_streak_required}-day streak
                  </span>
                  <span className={styles.lockCount}>
                    {streak}/{phase.unlock_streak_required} days
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ─── Expanded Phase Detail ─── */}
      <AnimatePresence mode="wait">
        {expandedPhase !== null &&
          (() => {
            const phase = phases.find((p) => p.phase_number === expandedPhase);
            if (!phase?.is_unlocked) return null;
            const theme = PHASE_THEMES[phase.phase_number] || PHASE_THEMES[0];
            const domains = phase.domains || [];

            return (
              <motion.div
                ref={detailRef}
                key={`detail-${expandedPhase}`}
                className={styles.detail}
                style={{ '--pc': theme.color, '--pgr': theme.gradient }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 250, damping: 28 }}
              >
                <div className={styles.detailInner}>
                  {domains.length === 0 ? (
                    <div className={styles.emptyDomains}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      <p>Domain tasks will appear here once generated.</p>
                    </div>
                  ) : (
                    domains.map((domain, dIdx) => {
                      const tasks = domain.tasks || [];
                      const doneCount = tasks.filter((t) => t.is_completed).length;

                      return (
                        <motion.div
                          key={domain.name || dIdx}
                          className={styles.domainCard}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ ...spring, delay: dIdx * 0.07 }}
                        >
                          {/* Domain Header */}
                          <div className={styles.domainHead}>
                            <div className={styles.domainLeft}>
                              <div className={styles.domainDot} />
                              <h4 className={styles.domainName}>{domain.name}</h4>
                            </div>
                            <div className={styles.domainRight}>
                              <span className={styles.domainCount}>
                                {doneCount}/{tasks.length}
                              </span>
                              <MiniRing completed={doneCount} total={tasks.length} color={theme.color} />
                            </div>
                          </div>

                          {/* Tasks */}
                          <div className={styles.taskList}>
                            {tasks.map((task, tIdx) => {
                              const done = task.is_completed;
                              const isOpen = expandedTasks.has(task.id);
                              const subs = task.subtasks || [];

                              return (
                                <div key={task.id || tIdx} className={styles.taskWrap}>
                                  <div className={`${styles.taskRow} ${done ? styles.taskDone : ''}`}>
                                    {/* Checkbox */}
                                    <button
                                      className={`${styles.checkbox} ${done ? styles.checked : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTaskComplete(phase.id, task.id);
                                      }}
                                      aria-label={`Mark "${task.title}" as ${done ? 'incomplete' : 'complete'}`}
                                    >
                                      <AnimatedCheck checked={done} dark={done} />
                                      <GoldBurst trigger={justCompleted === task.id} />
                                    </button>

                                    {/* Title + expand */}
                                    <div
                                      className={styles.taskBody}
                                      onClick={() => subs.length > 0 && toggleTaskExpand(task.id)}
                                      role={subs.length > 0 ? 'button' : undefined}
                                      tabIndex={subs.length > 0 ? 0 : undefined}
                                      onKeyDown={(e) => {
                                        if (subs.length > 0 && (e.key === 'Enter' || e.key === ' ')) {
                                          e.preventDefault();
                                          toggleTaskExpand(task.id);
                                        }
                                      }}
                                    >
                                      <span className={`${styles.taskTitle} ${done ? styles.taskTitleDone : ''}`}>
                                        {task.title}
                                      </span>
                                      {subs.length > 0 && (
                                        <motion.span
                                          className={styles.taskChevron}
                                          animate={{ rotate: isOpen ? 180 : 0 }}
                                          transition={{ duration: 0.2 }}
                                        >
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M6 9l6 6 6-6" />
                                          </svg>
                                        </motion.span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Subtasks */}
                                  <AnimatePresence>
                                    {isOpen && subs.length > 0 && (
                                      <motion.div
                                        className={styles.subtasks}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                                      >
                                        <div className={styles.subtaskInner}>
                                          {subs.map((sub, sIdx) => (
                                            <motion.div
                                              key={sIdx}
                                              className={styles.subtaskRow}
                                              initial={{ opacity: 0, x: -6 }}
                                              animate={{ opacity: 1, x: 0 }}
                                              transition={{ delay: sIdx * 0.04 }}
                                            >
                                              <span className={styles.subtaskDot} />
                                              <span className={styles.subtaskText}>
                                                {typeof sub === 'string' ? sub : sub.title || sub}
                                              </span>
                                            </motion.div>
                                          ))}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            );
          })()}
      </AnimatePresence>
    </div>
  );
}
