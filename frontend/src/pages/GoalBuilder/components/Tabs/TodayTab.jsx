/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './TodayTab.module.css';

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
            >
              🧊 Use Freeze ({goal.freezes_available} available)
            </button>
          )}

          {freezeUsedToday && (
            <div className={styles.freezeUsed}>
              ❄️ Freeze Active - Streak Protected
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
                      {isCompleted && <span className={styles.checkmark}>✓</span>}
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
            <div className={styles.celebrationEmoji}>🎉</div>
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

          <div className={styles.motivationalText}>
            {completionPercentage >= 100
              ? "🔥 Unstoppable! Another perfect day in the books."
              : completionPercentage >= 80
              ? "⚡ Almost there! Push through to the finish line."
              : completionPercentage >= 50
              ? "💪 Strong progress! Keep the momentum going."
              : "🌅 Every journey begins with a single step. Start now!"
            }
          </div>
        </div>
      </motion.div>
    </div>
  );
}