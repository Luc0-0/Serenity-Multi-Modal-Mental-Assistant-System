/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './TodayTab.module.css';

const getSvgIcon = (iconType, size = 20) => {
  const iconMap = {
    freeze: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 2v4l-3 3 3 3v4"/>
        <path d="M16 2v4l3 3-3 3v4"/>
        <path d="M12 1v6"/>
        <path d="M12 17v6"/>
        <path d="M3 12l3-3"/>
        <path d="M18 9l3 3"/>
        <path d="M21 12l-3 3"/>
        <path d="M6 15l-3-3"/>
      </svg>
    ),
    snowflake: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="2" x2="12" y2="22"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        <path d="M20 9l-3 3 3 3"/>
        <path d="M4 15l3-3-3-3"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
    ),
    celebration: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4.2 15.1L7 12.3l1.4 1.4L5.6 16.5"/>
        <path d="M8.8 8.9L12 5.7l1.4 1.4L10.2 10.3"/>
        <path d="M15.2 15.1L18 12.3l1.4 1.4L16.6 16.5"/>
        <path d="M19.8 8.9L23 5.7l1.4 1.4L21.2 10.3"/>
        <circle cx="12" cy="12" r="3"/>
        <path d="M8 19l8-10"/>
        <path d="M16 5l-8 10"/>
      </svg>
    ),
    flame: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38.5-2 1-3 .5.92 1 2.5 1 5a3 3 0 1 1-4.5-2.5z"/>
        <path d="M3 11h3m12 0h3m-6 8V8.5c0-1.5.75-2.25 1.5-2.25S18 7 18 8.5c0 6.5-3 12-6 12z"/>
      </svg>
    ),
    lightning: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
    muscle: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2v6a6 6 0 0 0 12 0V2l-2 2-4-2-4 2-2-2z"/>
        <path d="M6 8a6 6 0 0 0 12 0"/>
      </svg>
    ),
    sunrise: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v8"/>
        <path d="M4.93 10.93l1.41 1.41"/>
        <path d="M2 18h2"/>
        <path d="M20 18h2"/>
        <path d="M19.07 10.93l-1.41 1.41"/>
        <path d="M22 22H2"/>
        <path d="M8 6l4-4 4 4"/>
        <path d="M16 10a4 4 0 1 1-8 0"/>
      </svg>
    ),
    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
    )
  };
  return iconMap[iconType] || iconMap.check;
};

export default function TodayTab({ goalData, onUpdate }) {
  const [completedItems, setCompletedItems] = useState({});
  const [isLogging, setIsLogging] = useState(false);

  const goal = goalData?.goal;
  const schedule = goalData?.schedule || [];
  const todayLog = goalData?.recent_logs?.[0] || {};
  const freezeUsedToday = goalData?.freeze_used_today || false;

  const handleItemToggle = async (itemId) => {
    const newCompleted = {
      ...completedItems,
      [itemId]: !completedItems[itemId]
    };
    setCompletedItems(newCompleted);

    // Auto-save after 1 second
    setTimeout(() => logProgress(newCompleted), 1000);
  };

  const logProgress = async (completed) => {
    if (isLogging) return;

    setIsLogging(true);
    try {
      const completionCount = Object.values(completed).filter(Boolean).length;
      const percentage = schedule.length > 0 ? (completionCount / schedule.length) * 100 : 0;

      const response = await fetch(`/api/goals/${goal.id}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          completed_items: completed,
          completion_percentage: percentage
        })
      });

      if (response.ok) {
        onUpdate(goal.id);
      }
    } catch (error) {
      console.error('Failed to log progress:', error);
    } finally {
      setIsLogging(false);
    }
  };

  const useStreakFreeze = async () => {
    try {
      const response = await fetch(`/api/goals/${goal.id}/freeze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        onUpdate(goal.id);
      }
    } catch (error) {
      console.error('Failed to use freeze:', error);
    }
  };

  const getMotivationalMessage = (percentage) => {
    if (percentage >= 100) {
      return {
        icon: getSvgIcon('flame', 20),
        text: "Unstoppable! Another perfect day in the books."
      };
    } else if (percentage >= 80) {
      return {
        icon: getSvgIcon('lightning', 20),
        text: "Almost there! Push through to the finish line."
      };
    } else if (percentage >= 50) {
      return {
        icon: getSvgIcon('muscle', 20),
        text: "Strong progress! Keep the momentum going."
      };
    } else {
      return {
        icon: getSvgIcon('sunrise', 20),
        text: "Every journey begins with a single step. Start now!"
      };
    }
  };

  const completedCount = Object.values(completedItems).filter(Boolean).length;
  const completionPercentage = schedule.length > 0 ? (completedCount / schedule.length) * 100 : 0;

  return (
    <div className={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.dateInfo}>
            <div className={styles.date}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <div className={styles.progress}>
              {completedCount}/{schedule.length} completed ({Math.round(completionPercentage)}%)
            </div>
          </div>

          {goal?.freezes_available > 0 && !freezeUsedToday && (
            <button
              className={styles.freezeButton}
              onClick={useStreakFreeze}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span style={{ color: '#6CCDF0', display: 'flex' }}>{getSvgIcon('freeze', 16)}</span>
              Use Freeze ({goal.freezes_available} available)
            </button>
          )}

          {freezeUsedToday && (
            <div className={styles.freezeUsed} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#6CCDF0', display: 'flex' }}>{getSvgIcon('snowflake', 16)}</span>
              Freeze Active - Streak Protected
            </div>
          )}
        </div>

        {/* Schedule Items */}
        <div className={styles.scheduleContainer}>
          <div className={styles.scheduleGrid}>
            {schedule.map((item, index) => {
              const isCompleted = completedItems[item.id] || false;
              const tags = typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags || [];

              return (
                <motion.div
                  key={item.id}
                  className={`${styles.scheduleItem} ${isCompleted ? styles.completed : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleItemToggle(item.id)}
                >
                  <div className={styles.itemHeader}>
                    <div className={styles.time}>{item.time}</div>
                    <div className={`${styles.checkbox} ${isCompleted ? styles.checked : ''}`}>
                      {isCompleted && (
                        <span className={styles.checkmark} style={{ display: 'flex', color: '#C8A96E' }}>
                          {getSvgIcon('check', 16)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.itemContent}>
                    <div className={styles.activity}>{item.activity}</div>
                    {item.description && (
                      <div className={styles.description}>{item.description}</div>
                    )}

                    {tags.length > 0 && (
                      <div className={styles.tags}>
                        {tags.map((tag, i) => (
                          <span key={i} className={styles.tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isCompleted && (
                    <motion.div
                      className={styles.completedOverlay}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, ease: "backOut" }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Completion Celebration */}
        {completionPercentage >= 100 && (
          <motion.div
            className={styles.celebration}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "backOut" }}
          >
            <div className={styles.celebrationEmoji} style={{ color: '#C8A96E', display: 'flex', justifyContent: 'center' }}>
              {getSvgIcon('celebration', 48)}
            </div>
            <div className={styles.celebrationText}>
              Perfect Day Completed!
            </div>
            <div className={styles.celebrationSubtext}>
              Streak continues: {goal?.current_streak + 1} days
            </div>
          </motion.div>
        )}

        {/* Progress Bar */}
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <motion.div
              className={styles.progressFill}
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>

          <div className={styles.motivationalText} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <span style={{ color: '#C8A96E', display: 'flex' }}>
              {getMotivationalMessage(completionPercentage).icon}
            </span>
            {getMotivationalMessage(completionPercentage).text}
          </div>
        </div>
      </motion.div>
    </div>
  );
}