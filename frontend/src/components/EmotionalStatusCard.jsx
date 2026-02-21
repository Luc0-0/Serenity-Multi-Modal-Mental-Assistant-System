import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EmotionalStatusCard.module.css';

/**
 * Emotional Status Card.
 * Redesigned to match "Serenity" dark/gold aesthetic.
 */
export function EmotionalStatusCard({ emotionData, isLoading, onClose }) {
  const navigate = useNavigate();

  const emotionColors = {
    sadness: '#8e7f7f',
    anxiety: '#d4a574',
    anger: '#a85a5a',
    happy: '#e8c9a0',
    grateful: '#a0c5a0',
    calm: '#a0a8c5',
    neutral: '#525252',
    fear: '#5e4b35',
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  // Calculate chart segments
  const chartSegments = useMemo(() => {
    if (!emotionData?.emotion_frequency) return [{ color: '#333', value: 100 }];

    const total = emotionData.total_logs || 1;
    const entries = Object.entries(emotionData.emotion_frequency)
      .sort((a, b) => b[1] - a[1]); // Sort by frequency

    let currentAngle = 0;
    return entries.map(([emotion, count]) => {
      const percentage = (count / total);
      const angle = percentage * 360;

      // Calculate SVG arc path
      const r = 16; // radius
      const cx = 20; // center x
      const cy = 20; // center y

      const x1 = cx + r * Math.cos(Math.PI * currentAngle / 180);
      const y1 = cy + r * Math.sin(Math.PI * currentAngle / 180);

      const x2 = cx + r * Math.cos(Math.PI * (currentAngle + angle) / 180);
      const y2 = cy + r * Math.sin(Math.PI * (currentAngle + angle) / 180);

      // SVG Path command for arc
      const largeArcFlag = angle > 180 ? 1 : 0;
      const pathData = [
        `M ${cx} ${cy}`,
        `L ${x1} ${y1}`,
        `A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      const segment = {
        path: pathData,
        color: emotionColors[emotion] || '#555',
        emotion
      };

      currentAngle += angle;
      return segment;
    });
  }, [emotionData]);

  if (isLoading) {
    return (
      <div className={styles.card}>
        <div className={styles.loading}>
          <div className={styles.sun} style={{ position: 'relative', margin: '0 auto 1rem' }}></div>
          <p>Reading the stars...</p>
        </div>
      </div>
    );
  }

  // Fallback if no data
  const hasData = emotionData && emotionData.total_logs > 0;
  const dominantEmotion = hasData ? emotionData.dominant_emotion : 'Neutral';
  const dominantPct = hasData ? Math.round(emotionData.dominance_pct * 100) : 0;
  const trend = hasData ? emotionData.trend : 'Stable';

  return (
    <div className={styles.card}>
      {/* 1. Header Image Area */}
      <div className={styles.headerImage}>
        <div className={styles.sun}></div>
        <div className={styles.mountain}></div>
        <div className={styles.reflection}></div>
      </div>

      {/* 2. Title & Date */}
      <div className={styles.titleSection}>
        <h3 className={styles.title}>Emotional Insights</h3>
        <p className={styles.date}>{currentDate}</p>
      </div>

      {/* 3. Stats List */}
      <div className={styles.statsList}>
        <div className={styles.statItem}>
          <span className={`${styles.statDot} ${styles.dim}`}></span>
          <span className={styles.statLabel}>Mood Check-In:</span>
          <span className={styles.statValue}>Completed</span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statDot} ${styles.gold}`}></span>
          <span className={styles.statLabel}>Emotion Detected:</span>
          <span className={styles.statValue} style={{ textTransform: 'capitalize' }}>
            {dominantEmotion}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={`${styles.statDot} ${styles.dim}`} style={{ background: '#333' }}></span>
          <span className={styles.statLabel}>Emotion Distribution:</span>
        </div>
      </div>

      {/* 4. Pie Chart */}
      <div className={styles.chartContainer}>
        <svg viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
          {hasData ? (
            chartSegments.map((seg, i) => (
              <path key={i} d={seg.path} fill={seg.color} stroke="#121214" strokeWidth="0.5" />
            ))
          ) : (
            <circle cx="20" cy="20" r="16" fill="#2a2a2a" stroke="#333" strokeWidth="1" />
          )}
        </svg>

        <div className={styles.chartLabel}>
          <span className={styles.chartPercentage}>{dominantPct}%</span>
          <span className={styles.chartSubtext} style={{ textTransform: 'capitalize' }}>{dominantEmotion}</span>
        </div>
      </div>

      {/* Legend (Optional, showing top 2) */}
      {hasData && (
        <div className={styles.legend}>
          {Object.entries(emotionData.emotion_frequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([emo, count]) => (
              <div key={emo} className={styles.legendItem}>
                <div className={styles.legendDot} style={{ background: emotionColors[emo] || '#555' }}></div>
                <span style={{ textTransform: 'capitalize' }}>{emo}</span>
              </div>
            ))
          }
        </div>
      )}

      {/* 5. Trend */}
      <div className={styles.trendSection}>
        <span className={styles.trendIcon}>⚡</span>
        <span>Trend: {trend}</span>
      </div>

      {/* 6. Footer Button */}
      <div className={styles.footer}>
        <button className={styles.viewBtn} onClick={() => navigate('/journal')}>
          View Journal <span className={styles.arrow}>▼</span>
        </button>
      </div>
    </div>
  );
}
