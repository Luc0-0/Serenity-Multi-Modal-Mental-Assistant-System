/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 * Licensed under the AGPLv3. See LICENSE file in the project root for details.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import styles from './GoalBuilder.module.css';

// Tab Components (will create these next)
const TodayTab = React.lazy(() => import('./components/Tabs/TodayTab'));
const PhasesTab = React.lazy(() => import('./components/Tabs/PhasesTab'));
const LogTab = React.lazy(() => import('./components/Tabs/LogTab'));
const RulesTab = React.lazy(() => import('./components/Tabs/RulesTab'));

export default function GoalBuilder() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('today');
  const [goalData, setGoalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    checkUserGoals();
  }, []);

  const checkUserGoals = async () => {
    try {
      const response = await fetch('/api/goals', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const goals = await response.json();
        if (goals.length === 0) {
          setShowOnboarding(true);
        } else {
          // Load the active goal (most recent)
          const activeGoal = goals.find(g => g.is_active) || goals[0];
          await loadGoalDetails(activeGoal.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error);
      setShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGoalDetails = async (goalId) => {
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGoalData(data);
      }
    } catch (error) {
      console.error('Failed to load goal details:', error);
    }
  };

  const handleOnboardingComplete = async (goalId) => {
    setShowOnboarding(false);
    await loadGoalDetails(goalId);
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <motion.div
          className={styles.loadingSpinner}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <div className={styles.loadingText}>Loading your journey...</div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingFlow
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  if (!goalData) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateIcon}>📋</div>
        <div className={styles.emptyStateTitle}>No active goals found</div>
        <div className={styles.emptyStateSubtitle}>
          Create your first goal to begin your transformation journey
        </div>
        <button
          className={styles.createGoalButton}
          onClick={() => setShowOnboarding(true)}
        >
          Create Goal
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'today', label: 'Today', icon: '📅' },
    { id: 'phases', label: 'Phases', icon: '🎯' },
    { id: 'log', label: 'Progress', icon: '📈' },
    { id: 'rules', label: 'Rules', icon: '⚖️' }
  ];

  const goal = goalData.goal;
  const todayLog = goalData.recent_logs?.[0] || {};
  const completedToday = Object.values(todayLog.completed_items || {}).filter(Boolean).length;
  const totalSchedule = goalData.schedule?.length || 0;
  const completionPercentage = totalSchedule > 0 ? (completedToday / totalSchedule) * 100 : 0;

  return (
    <div className={styles.container}>
      {/* Background */}
      <div className={styles.background}>
        <div className={styles.gradientOverlay} />
        <div className={styles.noiseTexture} />
      </div>

      {/* Header with stats */}
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className={styles.headerContent}>
          <div className={styles.goalInfo}>
            <div className={styles.goalTitle}>{goal.title}</div>
            <div className={styles.goalMeta}>
              {goal.theme} • Day {Math.floor((new Date() - new Date(goal.start_date)) / (1000 * 60 * 60 * 24)) + 1} of {goal.duration_days}
            </div>
          </div>

          <div className={styles.stats}>
            <motion.div
              className={styles.stat}
              whileHover={{ scale: 1.05 }}
            >
              <div className={styles.statValue}>{goal.current_streak}</div>
              <div className={styles.statLabel}>Streak</div>
            </motion.div>

            <motion.div
              className={styles.stat}
              whileHover={{ scale: 1.05 }}
            >
              <div className={styles.statValue}>{Math.round(completionPercentage)}%</div>
              <div className={styles.statLabel}>Today</div>
            </motion.div>

            <motion.div
              className={styles.stat}
              whileHover={{ scale: 1.05 }}
            >
              <div className={styles.statValue}>{goal.freezes_available || 0}</div>
              <div className={styles.statLabel}>Freezes</div>
            </motion.div>

            {/* Progress indicator */}
            <div className={styles.progressRing}>
              <svg width="60" height="60" className={styles.progressSvg}>
                <circle
                  cx="30"
                  cy="30"
                  r="24"
                  strokeWidth="3"
                  stroke="rgba(255,255,255,0.1)"
                  fill="transparent"
                />
                <motion.circle
                  cx="30"
                  cy="30"
                  r="24"
                  strokeWidth="3"
                  stroke="url(#progressGradient)"
                  fill="transparent"
                  strokeLinecap="round"
                  style={{
                    pathLength: completionPercentage / 100,
                    rotate: -90,
                    transformOrigin: "center"
                  }}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: completionPercentage / 100 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="progressGradient">
                    <stop offset="0%" stopColor="#C8A96E" />
                    <stop offset="100%" stopColor="#6EE7B7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className={styles.progressText}>
                {completedToday}/{totalSchedule}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        className={styles.tabNav}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className={styles.tabContainer}>
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              <span className={styles.tabLabel}>{tab.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
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
              {activeTab === 'today' && (
                <TodayTab goalData={goalData} onUpdate={loadGoalDetails} />
              )}
              {activeTab === 'phases' && (
                <PhasesTab goalData={goalData} onUpdate={loadGoalDetails} />
              )}
              {activeTab === 'log' && (
                <LogTab goalData={goalData} />
              )}
              {activeTab === 'rules' && (
                <RulesTab goalData={goalData} />
              )}
            </React.Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}