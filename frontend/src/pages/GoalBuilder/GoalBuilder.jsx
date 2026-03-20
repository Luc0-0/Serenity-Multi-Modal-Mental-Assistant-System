/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 * Licensed under the AGPLv3. See LICENSE file in the project root for details.
 *
 * GoalBuilder — Main goal page with hero arc, tabs, phase unlock detection,
 * pulse check trigger, streak recovery, back nav, and goal management menu.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('today');
  const [goalData, setGoalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingDraft, setOnboardingDraft] = useState(null);
  const [onboardingInitial, setOnboardingInitial] = useState({ step: 0, formData: null });

  // Phase unlock celebration
  const [phaseUnlock, setPhaseUnlock] = useState(null);
  const [showPhaseModal, setShowPhaseModal] = useState(false);

  // Pulse check
  const [showPulseCheck, setShowPulseCheck] = useState(false);

  // Goal management menu
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState('delete'); // 'delete' | 'restart'
  const [isDeleting, setIsDeleting] = useState(false);
  const optionsRef = useRef(null);

  useEffect(() => {
    checkUserGoals();
  }, []);

  // Close options menu on outside click
  useEffect(() => {
    if (!showOptionsMenu) return;
    const handler = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) {
        setShowOptionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showOptionsMenu]);

  const checkUserGoals = async () => {
    try {
      const goals = await apiClient.get('/api/goals');
      if (goals.length === 0) {
        try {
          const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
          if (raw) {
            const draft = JSON.parse(raw);
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

      if (goalData?.phases && data.phases) {
        const prevUnlocked = new Set(goalData.phases.filter((p) => p.is_unlocked).map((p) => p.id));
        const newlyUnlocked = data.phases.find((p) => p.is_unlocked && !prevUnlocked.has(p.id));
        if (newlyUnlocked) {
          setPhaseUnlock(newlyUnlocked);
          setShowPhaseModal(true);
        }
      }

      setGoalData(data);
      checkPulseCheck(goalId);
    } catch (error) {
      console.error('Failed to load goal details:', error);
    }
  }, [goalData]);

  const checkPulseCheck = async (goalId) => {
    try {
      const data = await apiClient.get(`/api/goals/${goalId}/pulse-check`);
      if (data.is_due) {
        setTimeout(() => setShowPulseCheck(true), 2000);
      }
    } catch {}
  };

  const handleOnboardingComplete = async (goalId) => {
    setShowOnboarding(false);
    await loadGoalDetails(goalId);
  };

  const handleDeleteGoal = async () => {
    if (!goalData?.goal?.id) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/goals/${goalData.goal.id}`);
      setGoalData(null);
      setShowDeleteConfirm(false);
      setShowOptionsMenu(false);
      if (deleteMode === 'restart') {
        try { localStorage.removeItem(ONBOARDING_DRAFT_KEY); } catch {}
        setOnboardingInitial({ step: 0, formData: null });
        setShowOnboarding(true);
      }
      // On plain delete, show empty state (goalData=null, showOnboarding=false)
    } catch (error) {
      console.error('Failed to delete goal:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteConfirm = (mode) => {
    setDeleteMode(mode);
    setShowOptionsMenu(false);
    setShowDeleteConfirm(true);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/check-in');
    }
  };

  // ── Loading ──
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

  // ── Draft resume prompt ──
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
          <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
            {STEP_NAMES.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i < onboardingDraft.step
                  ? '#C8A96E'
                  : i === onboardingDraft.step
                  ? 'rgba(200,169,110,0.4)'
                  : 'rgba(255,255,255,0.06)',
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
        <div className={styles.background}>
          <div className={styles.gradientOverlay} />
          <div className={styles.noiseTexture} />
        </div>
        {/* Back button on empty state */}
        <button className={styles.backButtonEmpty} onClick={handleBack} aria-label="Go back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <div className={styles.emptyStateIcon}>
              <SvgIcon name="target" size={56} color="#C8A96E" />
            </div>
            <div className={styles.emptyStateTitle}>No active goal</div>
            <div className={styles.emptyStateSubtitle}>
              Define your mission and Serenity will build a personalized roadmap for you.
            </div>
            <motion.button
              className={styles.createGoalButton}
              onClick={() => setShowOnboarding(true)}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              Create Your Goal
            </motion.button>
          </motion.div>
        </div>
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

  const dayNumber = Math.floor((new Date() - new Date(goal.start_date)) / 86400000) + 1;
  const daysRemaining = Math.max(goal.duration_days - dayNumber, 0);
  const overallProgress = Math.min((dayNumber / goal.duration_days) * 100, 100);

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
        {/* Back + Options row */}
        <div className={styles.headerTopRow}>
          <motion.button
            className={styles.backButton}
            onClick={handleBack}
            whileHover={{ x: -2, scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            aria-label="Go back"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Back</span>
          </motion.button>

          {/* Options menu */}
          <div className={styles.optionsWrapper} ref={optionsRef}>
            <motion.button
              className={styles.optionsButton}
              onClick={() => setShowOptionsMenu((v) => !v)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              aria-label="Goal options"
              aria-expanded={showOptionsMenu}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
              </svg>
            </motion.button>

            <AnimatePresence>
              {showOptionsMenu && (
                <motion.div
                  className={styles.optionsDropdown}
                  initial={{ opacity: 0, scale: 0.92, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -8 }}
                  transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <button
                    className={styles.optionsMenuItem}
                    onClick={() => openDeleteConfirm('restart')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Start New Journey
                  </button>
                  <div className={styles.optionsDivider} />
                  <button
                    className={`${styles.optionsMenuItem} ${styles.optionsMenuItemDanger}`}
                    onClick={() => openDeleteConfirm('delete')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Delete Goal
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Main header content */}
        <div className={styles.headerContent}>
          <div className={styles.goalInfo}>
            <div className={styles.goalTitle}>{goal.title}</div>
            <div className={styles.goalMeta}>
              <span style={{ textTransform: 'capitalize' }}>{goal.theme}</span>
              {' · '} Day {dayNumber} of {goal.duration_days}
            </div>
            {goal.total_completed_days > 0 && goal.current_streak < goal.total_completed_days && (
              <div style={{
                fontSize: 11, color: 'rgba(200,169,110,0.6)', marginTop: 4,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <SvgIcon name="chart" size={12} color="rgba(200,169,110,0.5)" />
                {goal.total_completed_days} total days completed
              </div>
            )}
          </div>

          <div className={styles.stats}>
            <motion.div className={styles.stat} whileHover={{ scale: 1.05 }}>
              <div className={styles.statValue}>
                <SvgIcon name="flame" size={14} color="#C8A96E" />
                {goal.current_streak}
              </div>
              <div className={styles.statLabel}>Streak</div>
            </motion.div>

            <motion.div className={styles.stat} whileHover={{ scale: 1.05 }}>
              <div className={styles.statValue}>
                <SvgIcon name="snowflake" size={14} color="#6CCDF0" />
                {goal.freezes_available || 0}
              </div>
              <div className={styles.statLabel}>Freezes</div>
            </motion.div>

            <div className={styles.progressRing}>
              <svg width="68" height="68" className={styles.progressSvg}>
                <circle cx="34" cy="34" r={arcRadius / 1.04}
                  strokeWidth="3.5" stroke="rgba(255,255,255,0.06)" fill="transparent"
                />
                <motion.circle
                  cx="34" cy="34" r={arcRadius / 1.04}
                  strokeWidth="3.5" stroke="url(#heroArcGradient)" fill="transparent"
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
        onClose={() => { setShowPhaseModal(false); setPhaseUnlock(null); }}
      />

      {/* ── Pulse Check Modal ── */}
      <PulseCheckModal
        isOpen={showPulseCheck}
        goalId={goal?.id}
        onClose={() => setShowPulseCheck(false)}
        onSubmit={() => loadGoalDetails(goal?.id)}
      />

      {/* ── Delete / Restart Confirmation Modal ── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.target === e.currentTarget && !isDeleting && setShowDeleteConfirm(false)}
          >
            <motion.div
              className={styles.modalCard}
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 24 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {/* Icon */}
              <div className={`${styles.modalIcon} ${deleteMode === 'delete' ? styles.modalIconDanger : styles.modalIconWarning}`}>
                {deleteMode === 'restart' ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
              </div>

              <div className={styles.modalTitle}>
                {deleteMode === 'restart' ? 'Start a new journey?' : 'Delete this goal?'}
              </div>
              <div className={styles.modalBody}>
                {deleteMode === 'restart'
                  ? `This will permanently delete "${goal.title}" — your streak, logs, and progress will be lost. You'll start fresh with a new goal setup.`
                  : `This will permanently delete "${goal.title}" including all your progress, streaks, and activity logs. This cannot be undone.`
                }
              </div>

              <div className={styles.modalStats}>
                <div className={styles.modalStat}>
                  <div className={styles.modalStatValue}>{goal.current_streak}</div>
                  <div className={styles.modalStatLabel}>day streak</div>
                </div>
                <div className={styles.modalStatDivider} />
                <div className={styles.modalStat}>
                  <div className={styles.modalStatValue}>{goal.total_completed_days || 0}</div>
                  <div className={styles.modalStatLabel}>days logged</div>
                </div>
                <div className={styles.modalStatDivider} />
                <div className={styles.modalStat}>
                  <div className={styles.modalStatValue}>{dayNumber}</div>
                  <div className={styles.modalStatLabel}>days into goal</div>
                </div>
              </div>

              <div className={styles.modalActions}>
                <motion.button
                  className={styles.modalCancel}
                  onClick={() => !isDeleting && setShowDeleteConfirm(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={isDeleting}
                >
                  Keep Going
                </motion.button>
                <motion.button
                  className={`${styles.modalConfirm} ${deleteMode === 'delete' ? styles.modalConfirmDanger : styles.modalConfirmWarning}`}
                  onClick={handleDeleteGoal}
                  whileHover={{ scale: isDeleting ? 1 : 1.02 }}
                  whileTap={{ scale: isDeleting ? 1 : 0.97 }}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <span className={styles.modalSpinner} />
                  ) : deleteMode === 'restart' ? (
                    'Yes, Start Fresh'
                  ) : (
                    'Delete Forever'
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
