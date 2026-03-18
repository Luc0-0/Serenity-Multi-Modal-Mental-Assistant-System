/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from '../OnboardingFlow.module.css';

const getSvgIcon = (iconType, size = 16) => {
  const iconMap = {
    robot: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 8V4H8"/>
        <rect x="6" y="4" width="12" height="8" rx="2"/>
        <circle cx="9" cy="9" r="1"/>
        <circle cx="15" cy="9" r="1"/>
        <path d="M9 16a5 5 0 0 0 6 0"/>
        <path d="M6 13h4"/>
        <path d="M14 13h4"/>
      </svg>
    ),
    clipboard: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      </svg>
    ),
    lightbulb: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21h6"/>
        <path d="M12 17h0a3 3 0 0 0 3-3v-3a5 5 0 1 0-10 0v3a3 3 0 0 0 3 3z"/>
      </svg>
    ),
    edit: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    )
  };
  return iconMap[iconType] || iconMap.robot;
};

export default function ScheduleStep({ formData, updateFormData, nextStep, prevStep }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customSchedule, setCustomSchedule] = useState([]);

  const templates = [
    {
      id: 'entrepreneur',
      name: 'Entrepreneur',
      description: 'For business builders and startup founders',
      schedule: [
        { time: '05:30', activity: 'Morning Routine', description: 'Meditation, planning, energy prep' },
        { time: '06:00', activity: 'Deep Work Block', description: 'High-value business tasks' },
        { time: '09:00', activity: 'Meetings & Communication', description: 'Team sync, client calls' },
        { time: '12:00', activity: 'Strategic Break', description: 'Lunch and network building' },
        { time: '13:00', activity: 'Execution Time', description: 'Implementation and action' },
        { time: '16:00', activity: 'Learning & Development', description: 'Skills, reading, research' },
        { time: '18:00', activity: 'Physical Training', description: 'Exercise for mental clarity' },
        { time: '20:00', activity: 'Family & Connection', description: 'Personal relationships' },
        { time: '21:30', activity: 'Evening Review', description: 'Reflection and tomorrow prep' }
      ]
    },
    {
      id: 'fitness',
      name: 'Fitness Transformation',
      description: 'For health and body transformation goals',
      schedule: [
        { time: '06:00', activity: 'Morning Workout', description: 'Strength training or cardio' },
        { time: '07:30', activity: 'Nutrition Prep', description: 'Healthy breakfast and meal prep' },
        { time: '08:30', activity: 'Work/Study Block', description: 'Professional responsibilities' },
        { time: '12:00', activity: 'Mindful Lunch', description: 'Balanced nutrition break' },
        { time: '13:00', activity: 'Afternoon Productivity', description: 'Continued work focus' },
        { time: '16:00', activity: 'Active Recovery', description: 'Walk, stretch, or light activity' },
        { time: '17:30', activity: 'Evening Training', description: 'Secondary workout or sports' },
        { time: '19:00', activity: 'Recovery & Nutrition', description: 'Dinner and restoration' },
        { time: '20:30', activity: 'Learning & Planning', description: 'Fitness education and prep' },
        { time: '21:30', activity: 'Rest & Recovery', description: 'Sleep preparation routine' }
      ]
    },
    {
      id: 'student',
      name: 'Academic Excellence',
      description: 'For students and lifelong learners',
      schedule: [
        { time: '06:30', activity: 'Morning Focus', description: 'Review and intention setting' },
        { time: '07:00', activity: 'Deep Study Session', description: 'Most challenging material' },
        { time: '09:00', activity: 'Classes/Lectures', description: 'Formal education time' },
        { time: '12:00', activity: 'Learning Break', description: 'Lunch and mental reset' },
        { time: '13:00', activity: 'Active Study', description: 'Practice problems and application' },
        { time: '15:00', activity: 'Collaboration Time', description: 'Study groups and discussion' },
        { time: '17:00', activity: 'Physical Activity', description: 'Exercise for brain health' },
        { time: '18:30', activity: 'Creative Projects', description: 'Personal learning interests' },
        { time: '20:00', activity: 'Review & Integration', description: 'Consolidate daily learning' },
        { time: '21:00', activity: 'Rest & Reflection', description: 'Prepare for tomorrow' }
      ]
    }
  ];

  useEffect(() => {
    // Auto-generate schedule based on goal if no template selected
    if (!selectedTemplate && !generatedSchedule.length && formData.goal.title) {
      generateAISchedule();
    }
  }, []);

  const generateAISchedule = async () => {
    setIsGenerating(true);
    try {
      // Mock API call - replace with actual service integration
      const response = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          goal_title: formData.goal.title,
          goal_description: formData.goal.description,
          duration_days: formData.timeline.duration_days,
          theme: formData.theme
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedSchedule(data.schedule || []);
        updateFormData({
          schedule: {
            ...formData.schedule,
            items: data.schedule || [],
            ai_generated: true
          }
        });
      } else {
        // Fallback to template-based schedule
        generateFallbackSchedule();
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      generateFallbackSchedule();
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFallbackSchedule = () => {
    // Theme-based fallback schedule
    const fallbackSchedules = {
      tactical: [
        { time: '05:00', activity: 'Strategic Morning Routine', description: 'Mission prep and energy optimization' },
        { time: '06:00', activity: 'Primary Mission Block', description: 'High-priority goal execution' },
        { time: '09:00', activity: 'Secondary Operations', description: 'Supporting tasks and development' },
        { time: '12:00', activity: 'Tactical Refuel', description: 'Nutrition and strategic pause' },
        { time: '13:00', activity: 'Afternoon Execution', description: 'Implementation and action taking' },
        { time: '16:00', activity: 'Skills Development', description: 'Continuous improvement training' },
        { time: '18:00', activity: 'Physical Training', description: 'Strength and discipline building' },
        { time: '20:00', activity: 'Intel & Planning', description: 'Learning and strategy preparation' },
        { time: '21:30', activity: 'Mission Debrief', description: 'Review and tomorrow prep' }
      ],
      balanced: [
        { time: '06:30', activity: 'Mindful Morning', description: 'Gentle awakening and intention' },
        { time: '07:30', activity: 'Focused Work', description: 'Creative and productive time' },
        { time: '10:00', activity: 'Connection & Collaboration', description: 'Communication and teamwork' },
        { time: '12:30', activity: 'Nourishing Break', description: 'Mindful lunch and rest' },
        { time: '14:00', activity: 'Afternoon Flow', description: 'Continued progress and growth' },
        { time: '16:30', activity: 'Learning & Development', description: 'Skills and knowledge building' },
        { time: '18:00', activity: 'Movement & Nature', description: 'Physical activity and outdoors' },
        { time: '19:30', activity: 'Personal Time', description: 'Relationships and self-care' },
        { time: '21:00', activity: 'Evening Reflection', description: 'Gratitude and peaceful preparation' }
      ],
      gentle: [
        { time: '07:00', activity: 'Gentle Awakening', description: 'Slow, mindful morning routine' },
        { time: '08:00', activity: 'Creative Expression', description: 'Art, writing, or personal projects' },
        { time: '10:30', activity: 'Peaceful Productivity', description: 'Work with natural energy' },
        { time: '12:00', activity: 'Mindful Nourishment', description: 'Healthy, conscious eating' },
        { time: '13:30', activity: 'Gentle Progress', description: 'Goal-related activities at ease' },
        { time: '15:30', activity: 'Rest & Reflection', description: 'Pause and inner connection' },
        { time: '17:00', activity: 'Nature & Movement', description: 'Outdoor time and light exercise' },
        { time: '19:00', activity: 'Community & Love', description: 'Relationships and connection' },
        { time: '20:30', activity: 'Evening Peace', description: 'Relaxation and preparation for rest' }
      ]
    };

    const schedule = fallbackSchedules[formData.theme] || fallbackSchedules.balanced;
    setGeneratedSchedule(schedule);
    updateFormData({
      schedule: {
        ...formData.schedule,
        items: schedule,
        ai_generated: false
      }
    });
  };

  const selectTemplate = (template) => {
    setSelectedTemplate(template.id);
    setGeneratedSchedule(template.schedule);
    updateFormData({
      schedule: {
        ...formData.schedule,
        items: template.schedule,
        templates_used: [template.id],
        ai_generated: false
      }
    });
  };

  const customizeSchedule = () => {
    setCustomSchedule(generatedSchedule);
  };

  const currentSchedule = customSchedule.length ? customSchedule : generatedSchedule;

  return (
    <div className={styles.stepContent}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className={styles.stepTitle}>
          Design your daily rhythm
        </div>
        <div className={styles.stepSubtitle}>
          Choose a template or let AI create a personalized schedule optimized for your goal.
        </div>

        <div className={styles.glassCard}>
          {/* Generation Options */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              display: 'flex',
              gap: 16,
              marginBottom: 24
            }}>
              <motion.button
                type="button"
                onClick={generateAISchedule}
                disabled={isGenerating}
                style={{
                  flex: 1,
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, rgba(200, 169, 110, 0.2), rgba(200, 169, 110, 0.1))',
                  border: '2px solid rgba(200, 169, 110, 0.4)',
                  borderRadius: 12,
                  color: '#C8A96E',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  opacity: isGenerating ? 0.6 : 1,
                  transition: 'all 0.2s ease'
                }}
                whileHover={!isGenerating ? { scale: 1.02 } : {}}
              >
                {isGenerating ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <motion.div
                      style={{
                        width: 16,
                        height: 16,
                        border: '2px solid transparent',
                        borderTop: '2px solid #C8A96E',
                        borderRadius: '50%'
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    Generating AI Schedule...
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'flex', color: '#C8A96E' }}>{getSvgIcon('robot', 16)}</span>
                    Generate AI Schedule
                  </div>
                )}
              </motion.button>

              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                style={{
                  padding: '16px 24px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 12,
                  color: '#F5F0E8',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'flex', color: 'inherit' }}>{getSvgIcon('clipboard', 16)}</span>
                  Browse Templates
                </div>
              </button>
            </div>

            {/* Templates Grid */}
            {selectedTemplate === null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 16,
                  marginBottom: 24
                }}
              >
                {templates.map((template) => (
                  <motion.button
                    key={template.id}
                    type="button"
                    onClick={() => selectTemplate(template)}
                    style={{
                      padding: '20px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 12,
                      color: '#F5F0E8',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <div style={{
                      fontSize: 16,
                      fontWeight: 600,
                      marginBottom: 8,
                      color: '#C8A96E'
                    }}>
                      {template.name}
                    </div>
                    <div style={{
                      fontSize: 14,
                      opacity: 0.8,
                      lineHeight: 1.4
                    }}>
                      {template.description}
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Schedule Preview */}
          {currentSchedule.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 16,
                padding: 24,
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20
              }}>
                <div style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#C8A96E'
                }}>
                  Your Daily Schedule
                </div>
                <button
                  type="button"
                  onClick={customizeSchedule}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 8,
                    color: '#F5F0E8',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'flex', color: 'inherit' }}>{getSvgIcon('edit', 12)}</span>
                    Customize
                  </div>
                </button>
              </div>

              <div style={{
                display: 'grid',
                gap: 12,
                maxHeight: '300px',
                overflowY: 'auto',
                paddingRight: 8
              }}>
                {currentSchedule.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: 10,
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <div style={{
                      minWidth: 60,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#C8A96E',
                      fontFamily: 'monospace'
                    }}>
                      {item.time}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#F5F0E8',
                        marginBottom: 2
                      }}>
                        {item.activity}
                      </div>
                      <div style={{
                        fontSize: 12,
                        color: 'rgba(245, 240, 232, 0.7)',
                        lineHeight: 1.3
                      }}>
                        {item.description}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{
                  marginTop: 20,
                  padding: 16,
                  background: 'rgba(110, 231, 183, 0.1)',
                  border: '1px solid rgba(110, 231, 183, 0.2)',
                  borderRadius: 12,
                  textAlign: 'center'
                }}
              >
                <div style={{
                  fontSize: 13,
                  color: '#6EE7B7',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}>
                  <span style={{ display: 'flex', color: '#6EE7B7' }}>{getSvgIcon('lightbulb', 14)}</span>
                  This schedule is optimized for your "{formData.goal.title}" goal
                  using a {formData.theme} approach
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>

        <div className={styles.buttonContainer}>
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={prevStep}
          >
            ← Back
          </button>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={nextStep}
            disabled={!currentSchedule.length || isGenerating}
          >
            Continue →
          </button>
        </div>
      </motion.div>
    </div>
  );
}