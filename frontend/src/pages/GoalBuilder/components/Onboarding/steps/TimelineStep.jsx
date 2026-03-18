/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import styles from '../OnboardingFlow.module.css';

export default function TimelineStep({ formData, updateFormData, nextStep, prevStep }) {
  const [selectedDuration, setSelectedDuration] = useState(formData.timeline.duration_days);

  const durations = [
    { days: 30, label: '30 Days', description: 'Quick transformation', intensity: 'High' },
    { days: 90, label: '90 Days', description: 'Balanced approach', intensity: 'Medium' },
    { days: 180, label: '180 Days', description: 'Deep transformation', intensity: 'Sustainable' },
    { days: 365, label: '1 Year', description: 'Complete lifestyle change', intensity: 'Gentle' }
  ];

  const handleDurationSelect = (days) => {
    setSelectedDuration(days);
    updateFormData({
      timeline: {
        ...formData.timeline,
        duration_days: days
      }
    });
  };

  const calculateProjection = () => {
    const startDate = new Date(formData.timeline.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + selectedDuration);

    const phases = [
      {
        name: formData.theme === 'tactical' ? 'Foundation Phase' : 'Foundation',
        startDay: 0,
        endDay: Math.min(14, selectedDuration),
        color: '#38A169'
      },
      {
        name: formData.theme === 'tactical' ? 'Acceleration Phase' : 'Expansion',
        startDay: 14,
        endDay: Math.min(42, selectedDuration),
        color: '#3182CE'
      },
      {
        name: formData.theme === 'tactical' ? 'Mastery Phase' : 'Integration',
        startDay: 42,
        endDay: selectedDuration,
        color: '#C8A96E'
      }
    ];

    return { startDate, endDate, phases };
  };

  const projection = calculateProjection();

  return (
    <div className={styles.stepContent}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className={styles.stepTitle}>
          How long will this take?
        </div>
        <div className={styles.stepSubtitle}>
          Choose a timeline that feels challenging yet sustainable for your transformation.
        </div>

        <div className={styles.glassCard}>
          {/* Duration Selection */}
          <div style={{ marginBottom: 40 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16
            }}>
              {durations.map((duration) => (
                <motion.button
                  key={duration.days}
                  type="button"
                  onClick={() => handleDurationSelect(duration.days)}
                  style={{
                    padding: '24px 20px',
                    background: selectedDuration === duration.days
                      ? 'rgba(200, 169, 110, 0.15)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: selectedDuration === duration.days
                      ? '2px solid rgba(200, 169, 110, 0.6)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 16,
                    color: selectedDuration === duration.days ? '#C8A96E' : '#F5F0E8',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center'
                  }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div style={{
                    fontSize: 24,
                    fontWeight: 700,
                    marginBottom: 8
                  }}>
                    {duration.label}
                  </div>
                  <div style={{
                    fontSize: 14,
                    opacity: 0.9,
                    marginBottom: 6,
                    lineHeight: 1.4
                  }}>
                    {duration.description}
                  </div>
                  <div style={{
                    fontSize: 12,
                    opacity: 0.7,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    fontWeight: 500
                  }}>
                    {duration.intensity} Intensity
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Custom Duration Option */}
          <div style={{
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.05)',
            marginBottom: 40
          }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(245, 240, 232, 0.8)',
              marginBottom: 12,
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Custom Duration (Days)
            </label>
            <input
              type="number"
              min="7"
              max="365"
              value={selectedDuration}
              onChange={(e) => handleDurationSelect(parseInt(e.target.value) || 30)}
              style={{
                width: '120px',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: '#F5F0E8',
                fontSize: 16,
                fontFamily: 'inherit',
                outline: 'none'
              }}
            />
          </div>

          {/* Timeline Visualization */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 16,
            padding: 24,
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#C8A96E',
              marginBottom: 20,
              textAlign: 'center'
            }}>
              Your Journey Preview
            </div>

            {/* Timeline dates */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 20,
              fontSize: 13,
              color: 'rgba(245, 240, 232, 0.7)'
            }}>
              <span>Start: {projection.startDate.toLocaleDateString()}</span>
              <span>Finish: {projection.endDate.toLocaleDateString()}</span>
            </div>

            {/* Phase timeline */}
            <div style={{
              height: 40,
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: 20,
              overflow: 'hidden',
              position: 'relative',
              marginBottom: 20
            }}>
              {projection.phases.map((phase, index) => {
                const width = ((phase.endDay - phase.startDay) / selectedDuration) * 100;
                const left = (phase.startDay / selectedDuration) * 100;

                return width > 0 ? (
                  <motion.div
                    key={index}
                    style={{
                      position: 'absolute',
                      left: `${left}%`,
                      width: `${width}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${phase.color}80, ${phase.color})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'white',
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)'
                    }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: index * 0.2, duration: 0.6 }}
                  >
                    {width > 15 && phase.name}
                  </motion.div>
                ) : null;
              })}
            </div>

            {/* Phase legend */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              justifyContent: 'center'
            }}>
              {projection.phases.map((phase, index) => (
                phase.endDay > phase.startDay && (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12
                  }}>
                    <div style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: phase.color
                    }} />
                    <span style={{ color: 'rgba(245, 240, 232, 0.8)' }}>
                      {phase.name} ({phase.endDay - phase.startDay} days)
                    </span>
                  </div>
                )
              ))}
            </div>

            {/* Success projection */}
            <motion.div
              style={{
                marginTop: 24,
                padding: 16,
                background: 'rgba(110, 231, 183, 0.1)',
                border: '1px solid rgba(110, 231, 183, 0.2)',
                borderRadius: 12,
                textAlign: 'center'
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#6EE7B7',
                marginBottom: 4
              }}>
                Projected Outcome
              </div>
              <div style={{
                fontSize: 13,
                color: 'rgba(245, 240, 232, 0.8)',
                lineHeight: 1.4
              }}>
                With {selectedDuration} days of consistent effort, you'll build
                lasting habits and achieve meaningful transformation.
              </div>
            </motion.div>
          </div>
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
          >
            Continue →
          </button>
        </div>
      </motion.div>
    </div>
  );
}