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
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import styles from './GoalBuilder.module.css';

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
      const goals = await apiClient.get('/goals');
      if (goals.length === 0) {
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
      const data = await apiClient.get(`/goals/${goalId}`);

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
      const data = await apiClient.get(`/goals/${goalId}/pulse-check`);
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

  if (showOnboarding) {
    return (
      <OnboardingFlow
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
