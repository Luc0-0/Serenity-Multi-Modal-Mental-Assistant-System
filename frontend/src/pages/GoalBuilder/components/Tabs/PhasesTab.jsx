/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import React from 'react';
import { motion } from 'framer-motion';

const getSvgIcon = (iconType, size = 16) => {
  const iconMap = {
    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
    ),
    lock: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <circle cx="12" cy="16" r="1"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
    target: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
    )
  };
  return iconMap[iconType] || iconMap.check;
};

export default function PhasesTab({ goalData }) {
  const phases = goalData?.phases || [];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 0' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 style={{ color: '#F5F0E8', marginBottom: '32px' }}>Goal Phases</h2>

        <div style={{ display: 'grid', gap: '20px' }}>
          {phases.map((phase, index) => (
            <div
              key={phase.id}
              style={{
                background: 'rgba(15, 15, 20, 0.4)',
                border: phase.is_unlocked
                  ? '2px solid rgba(110, 231, 183, 0.3)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px',
                backdropFilter: 'blur(20px)'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{ color: '#C8A96E', margin: 0 }}>
                  Phase {phase.phase_number + 1}: {phase.title}
                </h3>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: phase.is_unlocked
                    ? 'rgba(110, 231, 183, 0.2)'
                    : 'rgba(255, 255, 255, 0.1)',
                  color: phase.is_unlocked ? '#6EE7B7' : 'rgba(245, 240, 232, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {phase.is_unlocked ? (
                    <>
                      <span style={{ display: 'flex' }}>{getSvgIcon('check', 14)}</span>
                      Unlocked
                    </>
                  ) : (
                    <>
                      <span style={{ display: 'flex' }}>{getSvgIcon('lock', 14)}</span>
                      {phase.unlock_streak_required} days
                    </>
                  )}
                </div>
              </div>

              <p style={{
                color: 'rgba(245, 240, 232, 0.8)',
                marginBottom: '20px',
                lineHeight: 1.6
              }}>
                {phase.description}
              </p>

              {phase.is_unlocked && (
                <div style={{
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{
                    color: '#6EE7B7',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ display: 'flex', color: '#6EE7B7' }}>{getSvgIcon('target', 16)}</span>
                    Phase Active - Start working on domain tasks
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}