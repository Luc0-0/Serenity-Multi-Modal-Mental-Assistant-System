/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function RulesTab({ goalData }) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const theme = goalData?.goal?.theme || 'balanced';

  const themeContent = {
    tactical: {
      title: "Mission Protocol",
      subtitle: "High-intensity transformation through disciplined execution",
      rules: [
        { icon: "⚡", title: "No Excuses", description: "Every day is a battle. Show up regardless of how you feel." },
        { icon: "🎯", title: "Mission Focus", description: "Channel all energy toward the primary objective. Eliminate distractions." },
        { icon: "⏰", title: "Precision Timing", description: "Execute your schedule with military precision. Time is your most valuable asset." },
        { icon: "🔥", title: "Aggressive Progress", description: "Push beyond comfort zones daily. Growth requires discomfort." },
        { icon: "📊", title: "Metrics Matter", description: "Track everything. What gets measured gets optimized." },
        { icon: "🔄", title: "Adaptive Strategy", description: "Adjust tactics based on data, but never abandon the mission." }
      ],
      motivation: "Warriors are not born, they are forged through consistent action under pressure. Your transformation is not a wish—it's a campaign that requires unwavering execution."
    },
    balanced: {
      title: "Growth Principles",
      subtitle: "Sustainable transformation through mindful consistency",
      rules: [
        { icon: "🌱", title: "Progress Over Perfection", description: "Small, consistent steps create lasting change." },
        { icon: "⚖️", title: "Balance & Harmony", description: "Honor all areas of life while pursuing your goals." },
        { icon: "🎯", title: "Intentional Action", description: "Every choice should align with your deeper values." },
        { icon: "💪", title: "Gentle Strength", description: "Build resilience through compassionate persistence." },
        { icon: "🔄", title: "Flexible Framework", description: "Adapt your approach while staying true to your vision." },
        { icon: "🧘", title: "Mindful Presence", description: "Stay connected to the present moment and your why." }
      ],
      motivation: "True transformation happens when we align our actions with our deepest values. Each day is an opportunity to become more of who you're meant to be."
    },
    gentle: {
      title: "Mindful Path",
      subtitle: "Peaceful transformation through loving awareness",
      rules: [
        { icon: "🌸", title: "Self-Compassion", description: "Treat yourself with kindness, especially during setbacks." },
        { icon: "🌿", title: "Natural Rhythms", description: "Honor your body's wisdom and energy cycles." },
        { icon: "💝", title: "Loving Intention", description: "Approach your goals from a place of self-love, not self-criticism." },
        { icon: "🌊", title: "Flow State", description: "Move with life's natural currents rather than against them." },
        { icon: "🕊️", title: "Inner Peace", description: "Maintain serenity even when progress feels slow." },
        { icon: "🌺", title: "Joyful Process", description: "Find beauty and meaning in each step of the journey." }
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
                  fontSize: '32px',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(200, 169, 110, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(200, 169, 110, 0.2)'
                }}>
                  {rule.icon}
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
            fontSize: '48px',
            marginBottom: '20px'
          }}>
            ✨
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
            fontSize: '20px'
          }}>
            📝 Weekly Reflection
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