/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 * Licensed under the AGPLv3. See LICENSE file in the project root for details.
 *
 * GoalBuilder — Main goal page with hero arc, tabs, phase unlock detection,
 * pulse check trigger, and streak recovery display.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { SvgIcon } from '../../components/icons/SvgIcon';
import { apiClient } from '../../services/apiClient';
import { MomentumBar } from '../../components/MomentumBar/MomentumBar';
import { PhaseUnlockModal } from '../../components/PhaseUnlockModal/PhaseUnlockModal';
import { PulseCheckModal } from '../../components/PulseCheckModal/PulseCheckModal';
import OnboardingFlow, { ONBOARDING_DRAFT_KEY } from './components/Onboarding/OnboardingFlow';
import styles from './GoalBuilder.module.css';

const STEP_NAMES = ['Welcome', 'Your Goal', 'Personalization', 'Schedule', 'Launch'];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TodayTab = React.lazy(() => import('./components/Tabs/TodayTab'));
const PhasesTab = React.lazy(() => import('./components/Tabs/PhasesTab'));
const LogTab = React.lazy(() => import('./components/Tabs/LogTab'));
const RulesTab = React.lazy(() => import('./components/Tabs/RulesTab'));

const TABS = [
  { id: 'today', label: 'Today', icon: 'calendar' },
  { id: 'phases', label: 'Phases', icon: 'target' },
  { id: 'log', label: 'Progress', icon: 'chart' },
  { id: 'rules', label: 'Rules', icon: 'compass' },
];

export default function GoalBuilder() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('today');
  const [goalData, setGoalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingDraft, setOnboardingDraft] = useState(null); // { step, formData, savedAt }
  const [onboardingInitial, setOnboardingInitial] = useState({ step: 0, formData: null });

  // Phase unlock celebration
  const [phaseUnlock, setPhaseUnlock] = useState(null);
  const [showPhaseModal, setShowPhaseModal] = useState(false);

  // Pulse check
  const [showPulseCheck, setShowPulseCheck] = useState(false);

  useEffect(() => {
    checkUserGoals();
  }, []);

  const checkUserGoals = async () => {
    try {
      const goals = await apiClient.get('/api/goals');
      if (goals.length === 0) {
        // Check for an in-progress draft before launching fresh onboarding
        try {
          const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
          if (raw) {
            const draft = JSON.parse(raw);
            // Only offer resume if they got past the welcome step (have a goal title)
            if (draft?.step > 0 && draft?.formData?.goal?.title) {
              setOnboardingDraft(draft);
              setIsLoading(false);
              return;
            }
          }
        } catch {}
        setShowOnboarding(true);
      } else {
        const activeGoal = goals.find((g) => g.is_active) || goals[0];
        await loadGoalDetails(activeGoal.id);
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error);
      setShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGoalDetails = useCallback(async (goalId) => {
    try {
      const data = await apiClient.get(`/api/goals/${goalId}`);

      // Detect newly unlocked phases (compare with previous state)
      if (goalData?.phases && data.phases) {
        const prevUnlocked = new Set(goalData.phases.filter((p) => p.is_unlocked).map((p) => p.id));
        const newlyUnlocked = data.phases.find((p) => p.is_unlocked && !prevUnlocked.has(p.id));
        if (newlyUnlocked) {
          setPhaseUnlock(newlyUnlocked);
          setShowPhaseModal(true);
        }
      }

      setGoalData(data);

      // Check if pulse check is due
      checkPulseCheck(goalId);
    } catch (error) {
      console.error('Failed to load goal details:', error);
    }
  }, [goalData]);

  const checkPulseCheck = async (goalId) => {
    try {
      const data = await apiClient.get(`/api/goals/${goalId}/pulse-check`);
      if (data.is_due) {
        setTimeout(() => setShowPulseCheck(true), 2000); // Slight delay for UX
      }
    } catch {
      // Silent fail
    }
  };

  const handleOnboardingComplete = async (goalId) => {
    setShowOnboarding(false);
    await loadGoalDetails(goalId);
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <motion.div
          className={styles.loadingSpinner}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <div className={styles.loadingText}>Loading your journey...</div>
      </div>
    );
  }

  // Draft resume prompt
  if (onboardingDraft) {
    const stepName = STEP_NAMES[onboardingDraft.step] || `Step ${onboardingDraft.step + 1}`;
    const goalTitle = onboardingDraft.formData?.goal?.title;
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0A0A0F', padding: '24px',
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            width: '100%', maxWidth: 440,
            background: 'rgba(15,15,20,0.95)',
            border: '1px solid rgba(200,169,110,0.2)',
            borderRadius: 24, padding: '36px 32px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}
        >
          {/* Icon */}
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'rgba(200,169,110,0.1)',
            border: '1px solid rgba(200,169,110,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
          }}>
            <SvgIcon name="target" size={26} color="#C8A96E" />
          </div>

          <div style={{ fontSize: 22, fontWeight: 700, color: '#F5F0E8', marginBottom: 8 }}>
            Pick up where you left off
          </div>
          <div style={{ fontSize: 14, color: 'rgba(245,240,232,0.5)', marginBottom: 24, lineHeight: 1.6 }}>
            You were setting up{goalTitle ? ` "${goalTitle}"` : ' a goal'} and stopped at{' '}
            <span style={{ color: '#C8A96E', fontWeight: 600 }}>{stepName}</span>
            {onboardingDraft.savedAt && (
              <span style={{ color: 'rgba(245,240,232,0.35)' }}> · {timeAgo(onboardingDraft.savedAt)}</span>
            )}
          </div>

          {/* Step progress dots */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
            {STEP_NAMES.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i < onboardingDraft.step
                  ? '#C8A96E'
                  : i === onboardingDraft.step
                  ? 'rgba(200,169,110,0.4)'
                  : 'rgba(255,255,255,0.06)',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => {
                setOnboardingInitial({ step: onboardingDraft.step, formData: onboardingDraft.formData });
                setOnboardingDraft(null);
                setShowOnboarding(true);
              }}
              style={{
                padding: '14px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #C8A96E, #A8874E)',
                color: '#0A0A0F', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
              }}
            >
              Continue from {stepName}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              onClick={() => {
                try { localStorage.removeItem(ONBOARDING_DRAFT_KEY); } catch {}
                setOnboardingDraft(null);
                setOnboardingInitial({ step: 0, formData: null });
                setShowOnboarding(true);
              }}
              style={{
                padding: '12px 20px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(245,240,232,0.5)', fontSize: 14, fontWeight: 500,
              }}
            >
              Start fresh
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingFlow
        initialStep={onboardingInitial.step}
        initialFormData={onboardingInitial.formData}
        onComplete={handleOnboardingComplete}
        onSkip={() => {
          setShowOnboarding(false);
          setIsLoading(false);
        }}
      />
    );
  }

  if (!goalData) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateIcon}>
          <SvgIcon name="clipboard" size={64} color="#C8A96E" />
        </div>
        <div className={styles.emptyStateTitle}>No active goals found</div>
        <div className={styles.emptyStateSubtitle}>
          Create your first goal to begin your transformation journey
        </div>
        <button className={styles.createGoalButton} onClick={() => setShowOnboarding(true)}>
          Create Goal
        </button>
      </div>
    );
  }

  const goal = goalData.goal;
  const todayLog = goalData.recent_logs?.[0] || {};
  const completedItems = todayLog.completed_items
    ? typeof todayLog.completed_items === 'string'
      ? JSON.parse(todayLog.completed_items)
      : todayLog.completed_items
    : {};
  const completedToday = Object.values(completedItems).filter(Boolean).length;
  const totalSchedule = goalData.schedule?.length || 0;
  const completionPct = totalSchedule > 0 ? (completedToday / totalSchedule) * 100 : 0;

  // Hero arc calculations
  const dayNumber = Math.floor((new Date() - new Date(goal.start_date)) / 86400000) + 1;
  const daysRemaining = Math.max(goal.duration_days - dayNumber, 0);
  const overallProgress = Math.min((dayNumber / goal.duration_days) * 100, 100);

  // Arc SVG parameters
  const arcRadius = 52;
  const arcCircumference = 2 * Math.PI * arcRadius;
  const arcStroke = arcCircumference * (1 - overallProgress / 100);

  return (
    <div className={styles.container}>
      {/* Background */}
      <div className={styles.background}>
        <div className={styles.gradientOverlay} />
        <div className={styles.noiseTexture} />
      </div>

      {/* ── Hero Header ── */}
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className={styles.headerContent}>
          <div className={styles.goalInfo}>
            <div className={styles.goalTitle}>{goal.title}</div>
            <div className={styles.goalMeta}>
              <span style={{ textTransform: 'capitalize' }}>{goal.theme}</span>
              {' '} Day {dayNumber} of {goal.duration_days}
            </div>

            {/* Streak recovery: show total completed if streak broke */}
            {goal.total_completed_days > 0 && goal.current_streak < goal.total_completed_days && (
              <div style={{
                fontSize: 11,
                color: 'rgba(200,169,110,0.6)',
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <SvgIcon name="chart" size={12} color="rgba(200,169,110,0.5)" />
                {goal.total_completed_days} total days completed
              </div>
            )}
          </div>

          <div className={styles.stats}>
            {/* Streak */}
            <motion.div className={styles.stat} whileHover={{ scale: 1.05 }}>
              <div className={styles.statValue}>
                <SvgIcon name="flame" size={14} color="#C8A96E" />
                {goal.current_streak}
              </div>
              <div className={styles.statLabel}>Streak</div>
            </motion.div>

            {/* Freezes */}
            <motion.div className={styles.stat} whileHover={{ scale: 1.05 }}>
              <div className={styles.statValue}>
                <SvgIcon name="snowflake" size={14} color="#6CCDF0" />
                {goal.freezes_available || 0}
              </div>
              <div className={styles.statLabel}>Freezes</div>
            </motion.div>

            {/* Hero Arc — Days Remaining */}
            <div className={styles.progressRing}>
              <svg width="68" height="68" className={styles.progressSvg}>
                {/* Track */}
                <circle
                  cx="34"
                  cy="34"
                  r={arcRadius / 1.04}
                  strokeWidth="3.5"
                  stroke="rgba(255,255,255,0.06)"
                  fill="transparent"
                />
                {/* Progress arc */}
                <motion.circle
                  cx="34"
                  cy="34"
                  r={arcRadius / 1.04}
                  strokeWidth="3.5"
                  stroke="url(#heroArcGradient)"
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={arcCircumference / 1.04}
                  initial={{ strokeDashoffset: arcCircumference / 1.04 }}
                  animate={{ strokeDashoffset: arcStroke / 1.04 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                />
                <defs>
                  <linearGradient id="heroArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#C8A96E" />
                    <stop offset="100%" stopColor="#6EE7B7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className={styles.progressText}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#F5F0E8', lineHeight: 1 }}>
                  {daysRemaining}
                </div>
                <div style={{ fontSize: 8, color: 'rgba(245,240,232,0.45)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  days left
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Momentum Bar */}
        <div style={{ marginTop: 12, padding: '0 4px' }}>
          <MomentumBar percentage={completionPct} />
        </div>
      </motion.div>

      {/* ── Tab Navigation ── */}
      <motion.div
        className={styles.tabNav}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className={styles.tabContainer}>
          {TABS.map((tab, index) => (
            <motion.button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.2 + index * 0.05 }}
            >
              <span className={styles.tabIcon}>
                <SvgIcon name={tab.icon} size={16} color="currentColor" />
              </span>
              <span className={styles.tabLabel}>{tab.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── Tab Content ── */}
      <div className={styles.content}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={styles.tabContent}
          >
            <React.Suspense
              fallback={
                <div className={styles.tabLoading}>
                  <div className={styles.loadingSpinner} />
                </div>
              }
            >
              {activeTab === 'today' && <TodayTab goalData={goalData} onUpdate={loadGoalDetails} />}
              {activeTab === 'phases' && <PhasesTab goalData={goalData} onUpdate={loadGoalDetails} />}
              {activeTab === 'log' && <LogTab goalData={goalData} />}
              {activeTab === 'rules' && <RulesTab goalData={goalData} />}
            </React.Suspense>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Phase Unlock Celebration ── */}
      <PhaseUnlockModal
        isOpen={showPhaseModal}
        phase={phaseUnlock}
        onClose={() => {
          setShowPhaseModal(false);
          setPhaseUnlock(null);
        }}
      />

      {/* ── Pulse Check Modal ── */}
      <PulseCheckModal
        isOpen={showPulseCheck}
        goalId={goal?.id}
        onClose={() => setShowPulseCheck(false)}
        onSubmit={() => loadGoalDetails(goal?.id)}
      />
    </div>
  );
}
