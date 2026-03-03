import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./EmotionalStatusCard.module.css";
import { EMOTION_COLORS } from "../services/emotionService";

/**
 * Emotional Status Card.
 * Redesigned to match "Serenity" dark/gold aesthetic.
 */
export function EmotionalStatusCard({ emotionData, isLoading, onClose }) {
  const navigate = useNavigate();

  // Emotion color palette with gradient pairs (base → lighter)
  const emotionColors = {
    joy: { base: EMOTION_COLORS.joy, light: "#d4b89a" },
    sadness: { base: EMOTION_COLORS.sadness, light: "#8b9fae" },
    anger: { base: EMOTION_COLORS.anger, light: "#ae8b8b" },
    anxiety: { base: EMOTION_COLORS.anxiety, light: "#c8a57a" },
    fear: { base: EMOTION_COLORS.fear, light: "#ab9bc8" },
    surprise: { base: EMOTION_COLORS.surprise, light: "#9abead" },
    disgust: { base: EMOTION_COLORS.disgust, light: "#abb590" },
    trust: { base: EMOTION_COLORS.trust, light: "#c8d8ba" },
    anticipation: { base: EMOTION_COLORS.anticipation, light: "#9abecf" },
    neutral: { base: EMOTION_COLORS.neutral, light: "#8a8a7e" },
    happy: { base: EMOTION_COLORS.joy, light: "#d4b89a" },
    grateful: { base: EMOTION_COLORS.trust, light: "#c8d8ba" },
    calm: { base: EMOTION_COLORS.trust, light: "#c8d8ba" },
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Calculate donut chart segments (stroke-based)
  const donutSegments = useMemo(() => {
    if (!emotionData?.emotion_frequency) {
      return [
        {
          emotion: "neutral",
          percentage: 100,
          color: "#2a2a2a",
          circumference: 100,
        },
      ];
    }

    const total = emotionData.total_logs || 1;
    const entries = Object.entries(emotionData.emotion_frequency).sort(
      (a, b) => b[1] - a[1],
    ); // Sort by frequency

    const radius = 12; // Inner edge of donut ring
    const circumference = 2 * Math.PI * radius;

    let rotationOffset = 0; // Track rotation offset for each segment

    return entries.map(([emotion, count]) => {
      const percentage = (count / total) * 100;
      const dashLength = (percentage / 100) * circumference;
      const colorPair = emotionColors[emotion] || {
        base: "#555",
        light: "#777",
      };

      const segment = {
        emotion,
        percentage,
        colorBase: colorPair.base,
        colorLight: colorPair.light,
        dashLength,
        circumference,
        radius,
        rotationOffset,
      };

      rotationOffset += dashLength;
      return segment;
    });
  }, [emotionData]);

  if (isLoading) {
    return (
      <div className={styles.card}>
        <div className={styles.loading}>
          <div
            className={styles.sun}
            style={{ position: "relative", margin: "0 auto 1rem" }}
          ></div>
          <p>Reading the stars...</p>
        </div>
      </div>
    );
  }

  // Fallback if no data
  const hasData = emotionData && emotionData.total_logs > 0;
  const dominantEmotion = hasData ? emotionData.dominant_emotion : "Neutral";
  const dominantPct = hasData ? Math.round(emotionData.dominance_pct * 100) : 0;
  const trend = hasData ? emotionData.trend : "Stable";

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
          <span
            className={styles.statValue}
            style={{ textTransform: "capitalize" }}
          >
            {dominantEmotion}
          </span>
        </div>
        <div className={styles.statItem}>
          <span
            className={`${styles.statDot} ${styles.dim}`}
            style={{ background: "#333" }}
          ></span>
          <span className={styles.statLabel}>Emotion Distribution:</span>
        </div>
      </div>

      {/* 4. Donut Chart (Emotion Ring) */}
      <div className={styles.chartContainer}>
        <svg viewBox="0 0 40 40" style={{ width: "100%", height: "100%" }}>
          <defs>
            <filter id="softGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Emotion gradients */}
            {donutSegments.map((seg, i) => (
              <linearGradient
                key={`grad-${i}`}
                id={`emotionGradient-${i}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={seg.colorBase} stopOpacity="1" />
                <stop
                  offset="100%"
                  stopColor={seg.colorLight}
                  stopOpacity="0.95"
                />
              </linearGradient>
            ))}
          </defs>

          {/* Background track circle (muted) */}
          <circle
            cx="20"
            cy="20"
            r="12"
            fill="none"
            stroke="#2a2a2a"
            strokeWidth="2.5"
            opacity="0.4"
          />

          {/* Emotion segments */}
          {donutSegments.map((seg, i) => {
            const isFirst = i === 0;
            return (
              <circle
                key={i}
                className={styles.emotionSegment}
                data-index={i}
                cx="20"
                cy="20"
                r={seg.radius}
                fill="none"
                stroke={`url(#emotionGradient-${i})`}
                strokeWidth="2.5"
                strokeDasharray={`${seg.dashLength} ${seg.circumference}`}
                strokeDashoffset={-seg.rotationOffset}
                strokeLinecap="round"
                style={{
                  transform: "rotate(-90deg)",
                  transformOrigin: "20px 20px",
                  "--dash-offset": -seg.rotationOffset,
                }}
              />
            );
          })}

          {/* Inner glass core circle (subtle) */}
          <circle
            className={styles.innerCore}
            cx="20"
            cy="20"
            r="6"
            fill="#1a1a1c"
          />
        </svg>

        <div className={styles.chartLabel}>
          <span className={styles.chartPercentage}>{dominantPct}%</span>
          <span
            className={styles.chartSubtext}
            style={{ textTransform: "capitalize" }}
          >
            {dominantEmotion}
          </span>
        </div>
      </div>

      {/* 5. Trend */}
      <div className={styles.trendSection}>
        <span>Trend: {trend}</span>
      </div>

      {/* 6. Footer Button */}
      <div className={styles.footer}>
        <button className={styles.viewBtn} onClick={() => navigate("/journal")}>
          View Journal <span className={styles.arrow}>▼</span>
        </button>
      </div>
    </div>
  );
}
