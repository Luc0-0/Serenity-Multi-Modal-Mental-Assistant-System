/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 *
 * TodayTab — Daily schedule checklist with time-based activity spotlight,
 * momentum bar, and SvgIcon integration.
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SvgIcon, getDomainIcon } from '../../../../components/icons/SvgIcon';
import { MomentumBar } from '../../../../components/MomentumBar/MomentumBar';
import { apiClient } from '../../../../services/apiClient';
import styles from './TodayTab.module.css';

function getCurrentTimeSlot() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function isCurrentActivity(itemTime, nextItemTime) {
  const now = getCurrentTimeSlot();
  return now >= itemTime && (!nextItemTime || now < nextItemTime);
}

export default function TodayTab({ goalData, onUpdate }) {
  const [completedItems, setCompletedItems] = useState(() => {
    const log = goalData?.recent_logs?.[0];
    if (!log?.completed_items) return {};
    return typeof log.completed_items === 'string' ? JSON.parse(log.completed_items) : log.completed_items;
  });
  const [isLogging, setIsLogging] = useState(false);

  const goal = goalData?.goal;
  const schedule = goalData?.schedule || [];
  const freezeUsedToday = goalData?.freeze_used_today || false;

  // Find the current time-based spotlight
  const currentIdx = useMemo(() => {
    for (let i = 0; i < schedule.length; i++) {
      const next = schedule[i + 1]?.time;
      if (isCurrentActivity(schedule[i].time, next)) return i;
    }
    return -1;
  }, [schedule]);

  const handleItemToggle = async (itemId) => {
    const newCompleted = { ...completedItems, [itemId]: !completedItems[itemId] };
    setCompletedItems(newCompleted);
    setTimeout(() => logProgress(newCompleted), 800);
  };

  const logProgress = async (completed) => {
    if (isLogging) return;
    setIsLogging(true);

    try {
      const count = Object.values(completed).filter(Boolean).length;
      const pct = schedule.length > 0 ? (count / schedule.length) * 100 : 0;

      await apiClient.post(`/api/goals/${goal.id}/logs`, { completed_items: completed, completion_percentage: pct });
      onUpdate(goal.id);
    } catch (err) {
      console.error('Failed to log:', err);
    } finally {
      setIsLogging(false);
    }
  };

  const useStreakFreeze = async () => {
    try {
      await apiClient.post(`/api/goals/${goal.id}/freeze`);
      onUpdate(goal.id);
    } catch (err) {
      console.error('Freeze failed:', err);
    }
  };

  const completedCount = Object.values(completedItems).filter(Boolean).length;
  const completionPct = schedule.length > 0 ? (completedCount / schedule.length) * 100 : 0;

  const motivational = getMotivation(completionPct);

  return (
    <div className={styles.container}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.dateInfo}>
            <div className={styles.date}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <div className={styles.progress}>
              {completedCount}/{schedule.length} completed ({Math.round(completionPct)}%)
            </div>
          </div>

          {goal?.freezes_available > 0 && !freezeUsedToday && (
            <button className={styles.freezeButton} onClick={useStreakFreeze}>
              <SvgIcon name="snowflake" size={15} color="#6CCDF0" />
              Use Freeze ({goal.freezes_available})
            </button>
          )}

          {freezeUsedToday && (
            <div className={styles.freezeUsed}>
              <SvgIcon name="snowflake" size={15} color="#6CCDF0" />
              Freeze Active
            </div>
          )}
        </div>

        {/* Momentum Bar */}
        <div style={{ margin: '16px 0 20px' }}>
          <MomentumBar percentage={completionPct} />
        </div>

        {/* Schedule Items */}
        <div className={styles.scheduleContainer}>
          <div className={styles.scheduleGrid}>
            {schedule.map((item, index) => {
              const isCompleted = completedItems[item.id] || false;
              const isCurrent = index === currentIdx;
              const tags = typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags || [];
              const tagIcon = tags[0] ? getDomainIcon(tags[0]) : null;

              return (
                <motion.div
                  key={item.id}
                  className={`${styles.scheduleItem} ${isCompleted ? styles.completed : ''} ${isCurrent ? styles.spotlight : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => handleItemToggle(item.id)}
                >
                  {/* Current activity indicator */}
                  {isCurrent && (
                    <motion.div
                      className={styles.spotlightBadge}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <SvgIcon name="clock" size={10} color="#C8A96E" />
                      <span>NOW</span>
                    </motion.div>
                  )}

                  <div className={styles.itemHeader}>
                    <div className={styles.timeBlock}>
                      {tagIcon && (
                        <span style={{ marginRight: 6, opacity: 0.5 }}>
                          <SvgIcon name={tagIcon} size={14} color="rgba(245,240,232,0.5)" />
                        </span>
                      )}
                      <div className={styles.time}>{item.time}</div>
                    </div>
                    <div className={`${styles.checkbox} ${isCompleted ? styles.checked : ''}`}>
                      {isCompleted && <SvgIcon name="check" size={14} color="#C8A96E" strokeWidth={2.5} />}
                    </div>
                  </div>

                  <div className={styles.itemContent}>
                    <div className={styles.activity}>{item.activity}</div>
                    {item.description && <div className={styles.description}>{item.description}</div>}

                    {tags.length > 0 && (
                      <div className={styles.tags}>
                        {tags.map((tag, i) => (
                          <span key={i} className={styles.tag}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isCompleted && (
                    <motion.div
                      className={styles.completedOverlay}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, ease: 'backOut' }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Completion Celebration */}
        {completionPct >= 100 && (
          <motion.div
            className={styles.celebration}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'backOut' }}
          >
            <div className={styles.celebrationEmoji}>
              <SvgIcon name="trophy" size={40} color="#C8A96E" />
            </div>
            <div className={styles.celebrationText}>Perfect Day Completed!</div>
            <div className={styles.celebrationSubtext}>Streak continues: {(goal?.current_streak || 0) + 1} days</div>
          </motion.div>
        )}

        {/* Motivational footer */}
        <div className={styles.progressSection}>
          <div className={styles.motivationalText}>
            <SvgIcon name={motivational.icon} size={16} color="#C8A96E" />
            <span>{motivational.text}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function getMotivation(pct) {
  if (pct >= 100) return { icon: 'flame', text: 'Unstoppable! Another perfect day in the books.' };
  if (pct >= 80) return { icon: 'lightning', text: 'Almost there! Push through to the finish line.' };
  if (pct >= 50) return { icon: 'dumbbell', text: 'Strong progress! Keep the momentum going.' };
  return { icon: 'sun', text: 'Every journey begins with a single step. Start now!' };
}
