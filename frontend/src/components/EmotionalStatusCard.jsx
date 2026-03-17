import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./EmotionalStatusCard.module.css";
import { EMOTION_COLORS } from "../services/emotionService";

export function EmotionalStatusCard({ emotionData, isLoading, onClose }) {
  const navigate = useNavigate();

  const emotionColors = {
    joy: { base: EMOTION_COLORS.joy, light: "#d4b89a" },
    sadness: { base: EMOTION_COLORS.sadness, light: "#8b9fae" },
    anger: { base: EMOTION_COLORS.anger, light: "#ae8b8b" },
    fear: { base: EMOTION_COLORS.fear, light: "#ab9bc8" },
    surprise: { base: EMOTION_COLORS.surprise, light: "#9abead" },
    disgust: { base: EMOTION_COLORS.disgust, light: "#abb590" },
    neutral: { base: EMOTION_COLORS.neutral, light: "#8a8a7e" },
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const donutSegments = useMemo(() => {
    if (!emotionData?.emotion_frequency) {
      return [
        {
          emotion: "neutral",
          percentage: 100,
          color: "#2a2a2a",
          circumference: 100,
          rotationOffset: 0,
        },
      ];
    }

    const total = emotionData.total_logs || 1;
    const entries = Object.entries(emotionData.emotion_frequency).sort(
      (a, b) => b[1] - a[1],
    );

    const radius = 12;
    const circumference = 2 * Math.PI * radius;
    let rotationOffset = 0;

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

  const hasData = emotionData && emotionData.total_logs > 0;
  const dominantEmotion = hasData ? emotionData.dominant_emotion : "Neutral";
  const dominantPct = hasData ? Math.round(emotionData.dominance_pct * 100) : 0;
  const trend = hasData ? emotionData.trend : "stable";

  // Derive an aura color from the dominant emotion for the background mesh
  const auraColor = (dominantEmotion && emotionColors[dominantEmotion]?.base) 
    || emotionColors.neutral.base;

  // Trend micro-icon
  const getTrendIcon = (t) => {
    switch (t.toLowerCase()) {
      case "improving": return "📈";
      case "declining": return "📉";
      case "fluctuating": return "〰️";
      case "stable": 
      default: return "➡️";
    }
  };

  return (
    <div 
      className={styles.card}
      style={{ "--aura-color": auraColor }}
    >
      <button
        className={styles.closeBtn}
        onClick={onClose}
        title="Close insights"
        aria-label="Close insights panel"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className={styles.headerSection}>
        <p className={styles.date}>{currentDate}</p>
        <h3 className={styles.title}>
          You're feeling <span style={{ textTransform: "capitalize" }}>{dominantEmotion}</span>.
        </h3>
        <div className={styles.statusPill}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Check-in complete
        </div>
      </div>

      <div className={styles.platter}>
        <div className={styles.chartContainer}>
          <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
            <circle
              cx="50"
              cy="50"
              r="40"
              className={styles.emptyTrack}
            />

            {donutSegments.map((seg, i) => {
              const dashOffset = seg.rotationOffset || 0;
              // Recalculate radius and circumference for 100x100 SVG
              const r = 40;
              const circ = 2 * Math.PI * r;
              const dLength = (seg.percentage / 100) * circ;
              const dOffset = (dashOffset / seg.circumference) * circ;

              return (
                <circle
                  key={i}
                  className={styles.emotionSegment}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke={seg.colorBase}
                  strokeDasharray={`${dLength} ${circ}`}
                  style={{
                    transform: "rotate(-90deg)",
                    transformOrigin: "50px 50px",
                    "--dash-offset": -dOffset,
                    "--circumference": circ,
                  }}
                />
              );
            })}
             {/* Inner shadow overlay for depth */}
            <circle
              cx="50"
              cy="50"
              r="40"
              className={styles.ringShadow}
            />
          </svg>

          <div className={styles.chartLabel}>
            <span className={styles.chartPercentage}>{dominantPct}%</span>
            <span
              className={styles.chartSubtext}
            >
              Distribution
            </span>
          </div>
        </div>
      </div>

      <div className={styles.bottomPlatterRow}>
        <div className={styles.trendPlatter}>
          <span className={styles.trendIcon}>{getTrendIcon(trend)}</span>
          <span style={{ textTransform: "capitalize" }}>{trend}</span>
        </div>
        
        <button className={styles.viewBtn} onClick={() => navigate("/journal")}>
          View Journal <span className={styles.arrow}>›</span>
        </button>
      </div>
    </div>
  );
}
