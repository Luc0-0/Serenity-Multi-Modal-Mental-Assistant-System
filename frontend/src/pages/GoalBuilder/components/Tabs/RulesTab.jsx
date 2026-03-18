/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function RulesTab({ goalData }) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const theme = goalData?.goal?.theme || 'balanced';

  const getSvgIcon = (iconType) => {
    const iconMap = {
      // Tactical icons
      lightning: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      ),
      target: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      ),
      clock: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6l0 6l4 2"/>
        </svg>
      ),
      flame: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38.5-2 1-3 .5.92 1 2.5 1 5a3 3 0 1 1-4.5-2.5z"/>
          <path d="M3 11h3m12 0h3m-6 8V8.5c0-1.5.75-2.25 1.5-2.25S18 7 18 8.5c0 6.5-3 12-6 12z"/>
        </svg>
      ),
      chart: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      ),
      refresh: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
          <path d="M21 3v5h-5"/>
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
          <path d="M3 21v-5h5"/>
        </svg>
      ),
      // Balanced icons
      sprout: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 20h10"/>
          <path d="M10 20c5.5-2.5.8-6.4 3-10"/>
          <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>
          <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.7 4.3-1.4 1-1.1 1.6-2.7 1.7-4.9-2.7.1-4 1-4.9 2.3z"/>
        </svg>
      ),
      balance: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4"/>
          <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
          <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
          <path d="M3 12h6m6 0h6"/>
        </svg>
      ),
      muscle: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 2v6a6 6 0 0 0 12 0V2l-2 2-4-2-4 2-2-2z"/>
          <path d="M6 8a6 6 0 0 0 12 0"/>
        </svg>
      ),
      meditation: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6"/>
          <path d="M21 12h-6m-6 0H3"/>
          <path d="M18.36 6.64l-4.24 4.24m-4.24 0L5.64 6.64"/>
          <path d="M18.36 17.36l-4.24-4.24m-4.24 0L5.64 17.36"/>
        </svg>
      ),
      // Gentle icons
      flower: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V9a3 3 0 0 0 3 3h1.5M12 7.5V9a3 3 0 0 1-3 3H7.5"/>
          <circle cx="12" cy="12" r="1"/>
          <path d="M12 16.5V21"/>
        </svg>
      ),
      leaf: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
        </svg>
      ),
      heart: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5Z"/>
          <path d="M12 5L8 21l4-7 4 7-4-16"/>
        </svg>
      ),
      wave: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
          <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
          <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
        </svg>
      ),
      dove: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 2v20"/>
          <path d="M14 2v5.5a3.5 3.5 0 0 1-3.5 3.5h0a3.5 3.5 0 0 1-3.5-3.5V2"/>
          <path d="M18 2c0 6-4 10-8 10"/>
          <circle cx="7" cy="7" r="1"/>
        </svg>
      ),
      lotus: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z"/>
          <path d="M8 12a4 4 0 0 1 8 0c0-1.1-.6-2-1.5-2.5"/>
        </svg>
      ),
      // Special icons
      sparkles: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l0-1.093 2-2-2-2 0-1.093A2 2 0 0 0 9.937 6.5l1.093 0 2-2 2 2 1.093 0a2 2 0 0 0 1.437 1.437L18 9.967l2 2-2 2-.44 1.093a2 2 0 0 0-1.437 1.437L15.03 18l-2 2-2-2-1.093-.44z"/>
          <path d="M2 8h2.5L5 5.5 5.5 8H8"/>
          <path d="M18 16h2.5l.5-2.5.5 2.5H24"/>
        </svg>
      ),
      note: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      )
    };
    return iconMap[iconType] || iconMap.target;
  };

  const themeContent = {
    tactical: {
      title: "Mission Protocol",
      subtitle: "High-intensity transformation through disciplined execution",
      rules: [
        { icon: "lightning", title: "No Excuses", description: "Every day is a battle. Show up regardless of how you feel." },
        { icon: "target", title: "Mission Focus", description: "Channel all energy toward the primary objective. Eliminate distractions." },
        { icon: "clock", title: "Precision Timing", description: "Execute your schedule with military precision. Time is your most valuable asset." },
        { icon: "flame", title: "Aggressive Progress", description: "Push beyond comfort zones daily. Growth requires discomfort." },
        { icon: "chart", title: "Metrics Matter", description: "Track everything. What gets measured gets optimized." },
        { icon: "refresh", title: "Adaptive Strategy", description: "Adjust tactics based on data, but never abandon the mission." }
      ],
      motivation: "Warriors are not born, they are forged through consistent action under pressure. Your transformation is not a wish—it's a campaign that requires unwavering execution."
    },
    balanced: {
      title: "Growth Principles",
      subtitle: "Sustainable transformation through mindful consistency",
      rules: [
        { icon: "sprout", title: "Progress Over Perfection", description: "Small, consistent steps create lasting change." },
        { icon: "balance", title: "Balance & Harmony", description: "Honor all areas of life while pursuing your goals." },
        { icon: "target", title: "Intentional Action", description: "Every choice should align with your deeper values." },
        { icon: "muscle", title: "Gentle Strength", description: "Build resilience through compassionate persistence." },
        { icon: "refresh", title: "Flexible Framework", description: "Adapt your approach while staying true to your vision." },
        { icon: "meditation", title: "Mindful Presence", description: "Stay connected to the present moment and your why." }
      ],
      motivation: "True transformation happens when we align our actions with our deepest values. Each day is an opportunity to become more of who you're meant to be."
    },
    gentle: {
      title: "Mindful Path",
      subtitle: "Peaceful transformation through loving awareness",
      rules: [
        { icon: "flower", title: "Self-Compassion", description: "Treat yourself with kindness, especially during setbacks." },
        { icon: "leaf", title: "Natural Rhythms", description: "Honor your body's wisdom and energy cycles." },
        { icon: "heart", title: "Loving Intention", description: "Approach your goals from a place of self-love, not self-criticism." },
        { icon: "wave", title: "Flow State", description: "Move with life's natural currents rather than against them." },
        { icon: "dove", title: "Inner Peace", description: "Maintain serenity even when progress feels slow." },
        { icon: "lotus", title: "Joyful Process", description: "Find beauty and meaning in each step of the journey." }
      ],
      motivation: "Your gentle spirit is not weakness—it's profound strength. Through patient, loving action, you create transformation that heals both yourself and the world."
    }
  };

  const content = themeContent[theme] || themeContent.balanced;

  const handleWeeklyReview = () => {
    setShowReviewModal(true);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 0' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{
            color: '#C8A96E',
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '12px'
          }}>
            {content.title}
          </h2>
          <p style={{
            color: 'rgba(245, 240, 232, 0.8)',
            fontSize: '16px',
            fontStyle: 'italic',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            {content.subtitle}
          </p>
        </div>

        {/* Core Rules */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '48px'
        }}>
          {content.rules.map((rule, index) => (
            <motion.div
              key={index}
              style={{
                background: 'rgba(15, 15, 20, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px',
                backdropFilter: 'blur(20px)',
                transition: 'all 0.2s ease'
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{
                borderColor: 'rgba(200, 169, 110, 0.3)',
                background: 'rgba(15, 15, 20, 0.6)'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(200, 169, 110, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(200, 169, 110, 0.2)',
                  color: '#C8A96E'
                }}>
                  {getSvgIcon(rule.icon)}
                </div>
                <h3 style={{
                  color: '#F5F0E8',
                  fontSize: '18px',
                  fontWeight: 600,
                  margin: 0
                }}>
                  {rule.title}
                </h3>
              </div>
              <p style={{
                color: 'rgba(245, 240, 232, 0.8)',
                fontSize: '14px',
                lineHeight: 1.6,
                margin: 0
              }}>
                {rule.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Motivation Section */}
        <motion.div
          style={{
            background: 'linear-gradient(135deg, rgba(200, 169, 110, 0.1), rgba(110, 231, 183, 0.05))',
            border: '2px solid rgba(200, 169, 110, 0.2)',
            borderRadius: '20px',
            padding: '32px',
            textAlign: 'center',
            marginBottom: '32px',
            backdropFilter: 'blur(20px)'
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            color: '#C8A96E'
          }}>
            {getSvgIcon('sparkles')}
          </div>
          <p style={{
            color: '#F5F0E8',
            fontSize: '18px',
            lineHeight: 1.7,
            fontStyle: 'italic',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            {content.motivation}
          </p>
        </motion.div>

        {/* Weekly Review CTA */}
        <div style={{
          background: 'rgba(15, 15, 20, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          backdropFilter: 'blur(20px)'
        }}>
          <h3 style={{
            color: '#C8A96E',
            marginBottom: '16px',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <span style={{ color: '#C8A96E', display: 'flex' }}>{getSvgIcon('note')}</span>
            Weekly Reflection
          </h3>
          <p style={{
            color: 'rgba(245, 240, 232, 0.8)',
            marginBottom: '24px',
            lineHeight: 1.6
          }}>
            Every Sunday, take time to reflect on your progress, celebrate wins,
            and adjust your approach for the coming week.
          </p>

          <button
            onClick={handleWeeklyReview}
            style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, rgba(200, 169, 110, 0.9), rgba(200, 169, 110, 1))',
              border: 'none',
              borderRadius: '12px',
              color: '#0A0A0F',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(200, 169, 110, 0.3)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Start Weekly Review
          </button>
        </div>

        {/* Weekly Review Modal */}
        {showReviewModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(10px)'
          }}>
            <motion.div
              style={{
                background: 'rgba(15, 15, 20, 0.95)',
                border: '2px solid rgba(200, 169, 110, 0.3)',
                borderRadius: '20px',
                padding: '32px',
                maxWidth: '500px',
                width: '90%',
                textAlign: 'center'
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <h3 style={{ color: '#C8A96E', marginBottom: '20px' }}>
                Weekly Review Coming Soon
              </h3>
              <p style={{
                color: 'rgba(245, 240, 232, 0.8)',
                marginBottom: '24px',
                lineHeight: 1.6
              }}>
                The weekly reflection feature is being prepared. For now,
                take a moment to reflect on your progress this week.
              </p>

              <button
                onClick={() => setShowReviewModal(false)}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#F5F0E8',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}