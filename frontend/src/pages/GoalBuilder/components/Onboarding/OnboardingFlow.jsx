/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 * Licensed under the AGPLv3. See LICENSE file in the project root for details.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WelcomeStep from './steps/WelcomeStep';
import GoalStep from './steps/GoalStep';
import TimelineStep from './steps/TimelineStep';
import ScheduleStep from './steps/ScheduleStep';
import LaunchStep from './steps/LaunchStep';
import styles from './OnboardingFlow.module.css';

const steps = ['welcome', 'goal', 'timeline', 'schedule', 'launch'];

export default function OnboardingFlow({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    theme: 'balanced', // tactical, balanced, gentle
    goal: {
      title: '',
      description: '',
      voice_input: false
    },
    timeline: {
      duration_days: 180,
      start_date: new Date().toISOString().split('T')[0]
    },
    schedule: {
      items: [],
      templates_used: [],
      ai_generated: false
    }
  });

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateFormData = (stepData) => {
    setFormData(prev => ({
      ...prev,
      ...stepData
    }));
  };

  const handleComplete = async () => {
    try {
      // Create goal via API
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: formData.goal.title,
          description: formData.goal.description,
          theme: formData.theme,
          duration_days: formData.timeline.duration_days
        })
      });

      if (response.ok) {
        const result = await response.json();
        onComplete(result.goal_id);
      } else {
        throw new Error('Failed to create goal');
      }
    } catch (error) {
      console.error('Goal creation error:', error);
      // Handle error - show toast or error state
    }
  };

  const renderStep = () => {
    const stepProps = {
      formData,
      updateFormData,
      nextStep,
      prevStep,
      onComplete: handleComplete
    };

    switch (steps[currentStep]) {
      case 'welcome':
        return <WelcomeStep {...stepProps} />;
      case 'goal':
        return <GoalStep {...stepProps} />;
      case 'timeline':
        return <TimelineStep {...stepProps} />;
      case 'schedule':
        return <ScheduleStep {...stepProps} />;
      case 'launch':
        return <LaunchStep {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {/* Background with cinematic gradient */}
      <div className={styles.background}>
        <div className={styles.gradientOverlay} />
        <div className={styles.noiseTexture} />
      </div>

      {/* Progress indicator */}
      <div className={styles.progressBar}>
        <div className={styles.progressTrack}>
          <motion.div
            className={styles.progressFill}
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <div className={styles.progressText}>
          Step {currentStep + 1} of {steps.length}
        </div>
      </div>

      {/* Step content with page transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          className={styles.stepContainer}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{
            duration: 0.4,
            ease: [0.4, 0.0, 0.2, 1]
          }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Skip option (only on first few steps) */}
      {currentStep < 3 && (
        <button
          className={styles.skipButton}
          onClick={onSkip}
        >
          Skip for now
        </button>
      )}
    </div>
  );
}