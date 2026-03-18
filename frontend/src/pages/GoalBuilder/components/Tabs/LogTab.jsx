/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import React from 'react';
import { motion } from 'framer-motion';

const getSvgIcon = (iconType, size = 24) => {
  const iconMap = {
    chart: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
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
    )
  };
  return iconMap[iconType] || iconMap.chart;
};

export default function LogTab({ goalData }) {
  const logs = goalData?.recent_logs || [];
  const goal = goalData?.goal;

  const generateCalendarData = () => {
    const data = [];
    const today = new Date();
    const startDate = new Date(goal?.start_date || today);

    for (let i = 0; i < 90; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const log = logs.find(l =>
        new Date(l.date).toDateString() === date.toDateString()
      );

      data.push({
        date: date,
        completion: log?.completion_percentage || 0,
        isFuture: date > today
      });
    }

    return data;
  };

  const calendarData = generateCalendarData();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 0' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 style={{ color: '#F5F0E8', marginBottom: '32px' }}>Progress Log</h2>

        {/* Stats Overview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            background: 'rgba(15, 15, 20, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#C8A96E', marginBottom: '8px' }}>
              {goal?.current_streak || 0}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(245, 240, 232, 0.7)' }}>
              Current Streak
            </div>
          </div>

          <div style={{
            background: 'rgba(15, 15, 20, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#6EE7B7', marginBottom: '8px' }}>
              {goal?.longest_streak || 0}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(245, 240, 232, 0.7)' }}>
              Longest Streak
            </div>
          </div>

          <div style={{
            background: 'rgba(15, 15, 20, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '20px',
            textAlign: 'center',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#7EB8F7', marginBottom: '8px' }}>
              {logs.length}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(245, 240, 232, 0.7)' }}>
              Total Days
            </div>
          </div>
        </div>

        {/* Calendar Heatmap */}
        <div style={{
          background: 'rgba(15, 15, 20, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          backdropFilter: 'blur(20px)',
          marginBottom: '32px'
        }}>
          <h3 style={{ color: '#C8A96E', marginBottom: '24px' }}>90-Day Progress Heatmap</h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(8px, 1fr))',
            gap: '2px',
            maxWidth: '600px'
          }}>
            {calendarData.map((day, index) => {
              const intensity = day.isFuture ? 0 : Math.min(day.completion / 100, 1);
              const opacity = day.isFuture ? 0.1 : Math.max(intensity, 0.1);

              return (
                <div
                  key={index}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '2px',
                    background: day.completion >= 80
                      ? `rgba(110, 231, 183, ${opacity})`
                      : day.completion >= 50
                      ? `rgba(200, 169, 110, ${opacity})`
                      : `rgba(239, 68, 68, ${Math.max(opacity, 0.1)})`,
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                  title={`${day.date.toDateString()}: ${day.completion}%`}
                />
              );
            })}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px',
            fontSize: '12px',
            color: 'rgba(245, 240, 232, 0.6)'
          }}>
            <span>Less</span>
            <div style={{ display: 'flex', gap: '2px' }}>
              {[0.1, 0.3, 0.5, 0.7, 1].map((opacity, i) => (
                <div
                  key={i}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '2px',
                    background: `rgba(110, 231, 183, ${opacity})`,
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{
          background: 'rgba(15, 15, 20, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          backdropFilter: 'blur(20px)'
        }}>
          <h3 style={{ color: '#C8A96E', marginBottom: '20px' }}>Recent Activity</h3>

          {logs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'rgba(245, 240, 232, 0.6)'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px',
                color: '#C8A96E',
                display: 'flex',
                justifyContent: 'center'
              }}>
                {getSvgIcon('chart', 48)}
              </div>
              <div>No activity logged yet. Start your journey today!</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {logs.slice(0, 7).map((log, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px'
                  }}
                >
                  <div>
                    <div style={{ color: '#F5F0E8', fontWeight: 500 }}>
                      {new Date(log.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    {log.is_frozen && (
                      <div style={{ fontSize: '12px', color: '#7EB8F7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ display: 'flex' }}>{getSvgIcon('snowflake', 12)}</span>
                        Freeze used
                      </div>
                    )}
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    background: log.completion_percentage >= 80
                      ? 'rgba(110, 231, 183, 0.2)'
                      : log.completion_percentage >= 50
                      ? 'rgba(200, 169, 110, 0.2)'
                      : 'rgba(239, 68, 68, 0.2)',
                    color: log.completion_percentage >= 80
                      ? '#6EE7B7'
                      : log.completion_percentage >= 50
                      ? '#C8A96E'
                      : '#EF4444'
                  }}>
                    {Math.round(log.completion_percentage)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}