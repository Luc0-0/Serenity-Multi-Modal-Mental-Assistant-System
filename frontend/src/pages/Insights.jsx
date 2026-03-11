import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ScrollIndicator } from "../components/ScrollIndicator";
import styles from "./Insights.module.css";
import { EMOTION_COLORS } from "../services/emotionService";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const EMOTION_LABELS = {
  joy: "Joy",
  sadness: "Sadness",
  anger: "Anger",
  fear: "Fear",
  surprise: "Surprise",
  disgust: "Disgust",
  neutral: "Neutral",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildMoodTrends(dailyBreakdown, days) {
  const trends = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    trends.push({
      day: DAY_NAMES[d.getDay()],
      date: dateStr,
      emotions: dailyBreakdown[dateStr] || {},
    });
  }
  return trends;
}

function computeStreak(dailyBreakdown) {
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    if (dailyBreakdown[key] && Object.keys(dailyBreakdown[key]).length > 0) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function transformData(api) {
  if (!api || api.total_logs === 0) return null;

  const { emotion_frequency, dominant_emotion, dominance_pct, total_logs, trend, volatility, high_risk, daily_breakdown = {} } = api;

  const emotionDistribution = Object.entries(emotion_frequency)
    .map(([emotion, count]) => ({
      emotion,
      label: EMOTION_LABELS[emotion] || emotion,
      value: ((count / total_logs) * 100).toFixed(1),
      count,
      color: EMOTION_COLORS[emotion] || "#8a8a8a",
    }))
    .sort((a, b) => parseFloat(b.value) - parseFloat(a.value));

  return {
    emotionDistribution,
    moodTrends: buildMoodTrends(daily_breakdown, 30),
    streak: computeStreak(daily_breakdown),
    totalLogs: total_logs,
    dominantEmotion: dominant_emotion,
    dominancePct: Math.round((dominance_pct || 0) * 100),
    trend,
    volatility,
    highRisk: high_risk,
  };
}

export function Insights() {
  const navigate = useNavigate();
  const gridRef = useRef(null);

  const [period, setPeriod] = useState(7);
  const [insightsData, setInsightsData] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const authFetch = useCallback(async (url) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/login");
      return null;
    }
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      localStorage.removeItem("auth_token");
      navigate("/login");
      return null;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, [navigate]);

  const fetchInsights = useCallback(async (days) => {
    setIsLoading(true);
    setInsightsData(null);
    try {
      const data = await authFetch(`${API_BASE_URL}/api/emotions/insights/?days=${days}`);
      if (data) setInsightsData(transformData(data));
    } catch {
      setInsightsData(null);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  const fetchWeeklySummary = useCallback(async (days) => {
    setSummaryLoading(true);
    setWeeklySummary(null);
    try {
      const data = await authFetch(`${API_BASE_URL}/api/emotions/weekly-summary/?days=${days}`);
      if (data?.generated) setWeeklySummary(data.summary);
    } catch {
      setWeeklySummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchInsights(period);
    fetchWeeklySummary(period);
  }, [period, fetchInsights, fetchWeeklySummary]);

  // Mobile: auto-scroll to center card
  useEffect(() => {
    if (window.innerWidth <= 768 && gridRef.current && insightsData) {
      setTimeout(() => {
        const cardWidth = window.innerWidth * 0.85;
        gridRef.current.scrollLeft = cardWidth + 16;
      }, 600);
    }
  }, [insightsData]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.backgroundImage} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
          <div style={{ textAlign: "center", color: "#f5f5f5" }}>
            <div style={{
              width: "40px", height: "40px",
              border: "3px solid rgba(212, 165, 116, 0.2)",
              borderTopColor: "#d4a574",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 1rem",
            }} />
            <p style={{ fontSize: "0.9rem", color: "#a0a0a0" }}>Loading your insights...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  if (!insightsData) {
    return (
      <div className={styles.container}>
        <div className={styles.backgroundImage} />
        <div className={styles.contentWrapper}>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>◈</div>
            <h2 className={styles.emptyTitle}>No insights yet</h2>
            <p className={styles.emptyText}>
              Start a few conversations with Serenity and your emotional patterns will appear here.
            </p>
            <button className={styles.emptyButton} onClick={() => navigate("/checkin")}>
              Start a Check-in
            </button>
          </div>
        </div>
      </div>
    );
  }

  const moodTrendsForPeriod = insightsData.moodTrends.slice(-period);

  return (
    <div className={styles.container} id="insights-scroll-container">
      <ScrollIndicator scrollContainerId="insights-scroll-container" />
      <div className={styles.backgroundImage} />
      <div className={styles.contentWrapper}>

        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>Insights</h1>
          <p className={styles.subtitle}>Your emotional landscape, reflected.</p>
          <div className={styles.periodToggle}>
            {[7, 30].map((d) => (
              <button
                key={d}
                className={`${styles.periodBtn} ${period === d ? styles.periodBtnActive : ""}`}
                onClick={() => setPeriod(d)}
              >
                {d}d
              </button>
            ))}
          </div>
        </header>

        <main className={styles.main}>

          {/* Stat Bar */}
          <div className={styles.statBar}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{insightsData.streak}</span>
              <span className={styles.statLabel}>Day Streak</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statCard}>
              <span className={styles.statValue}>{insightsData.totalLogs}</span>
              <span className={styles.statLabel}>Check-ins ({period}d)</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statCard}>
              <span
                className={styles.statValue}
                style={{ color: EMOTION_COLORS[insightsData.dominantEmotion] || "#d4a574" }}
              >
                {EMOTION_LABELS[insightsData.dominantEmotion] || insightsData.dominantEmotion}
              </span>
              <span className={styles.statLabel}>Dominant — {insightsData.dominancePct}%</span>
            </div>
          </div>

          {/* Main grid */}
          <div className={styles.insightsCarouselWrapper}>
            <div className={styles.swipeHint}>
              <span>←</span> swipe to explore <span>→</span>
            </div>
            <div
              ref={gridRef}
              className={styles.insightsGrid}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(260px, 1fr) minmax(520px, 2fr) minmax(240px, 1fr)",
                gap: "1.25rem",
                marginBottom: "2rem",
              }}
            >

              {/* Emotion Balance */}
              <div className={styles.glassCard} style={{ minHeight: "400px", display: "flex", flexDirection: "column" }}>
                <CardHeader title="Emotion Balance" sub={`Last ${period} days`} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}>
                  <DonutChart distribution={insightsData.emotionDistribution} />
                  <EmotionLegend distribution={insightsData.emotionDistribution} />
                </div>
              </div>

              {/* Mood Timeline */}
              <div className={styles.glassCard} style={{ minHeight: "400px", display: "flex", flexDirection: "column" }}>
                <CardHeader title="Mood Timeline" sub={`Daily dominant emotion · ${period}d`} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <MoodTimeline moodTrends={moodTrendsForPeriod} period={period} />
                </div>
              </div>

              {/* Serenity's Take */}
              <div className={styles.glassCard} style={{ minHeight: "400px", display: "flex", flexDirection: "column" }}>
                <CardHeader title="Serenity's Take" sub={`${period}-day reflection`} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "1rem" }}>
                  {summaryLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div className={styles.shimmer} style={{ height: "14px", borderRadius: "6px" }} />
                      <div className={styles.shimmer} style={{ height: "14px", borderRadius: "6px", width: "85%" }} />
                      <div className={styles.shimmer} style={{ height: "14px", borderRadius: "6px", width: "70%" }} />
                      <div className={styles.shimmer} style={{ height: "14px", borderRadius: "6px", width: "90%", marginTop: "0.5rem" }} />
                      <div className={styles.shimmer} style={{ height: "14px", borderRadius: "6px", width: "60%" }} />
                    </div>
                  ) : weeklySummary ? (
                    <p style={{ fontSize: "0.9rem", color: "#c8c8c8", lineHeight: 1.75, fontStyle: "italic" }}>
                      "{weeklySummary}"
                    </p>
                  ) : (
                    <p style={{ fontSize: "0.85rem", color: "#6b6b6b", lineHeight: 1.6 }}>
                      Start more conversations to unlock your personalised reflection.
                    </p>
                  )}

                  {insightsData.highRisk && (
                    <div style={{
                      marginTop: "auto",
                      padding: "0.75rem 1rem",
                      borderRadius: "10px",
                      background: "rgba(168, 90, 90, 0.1)",
                      border: "1px solid rgba(168, 90, 90, 0.2)",
                      fontSize: "0.8rem",
                      color: "#c97b7b",
                      lineHeight: 1.5,
                    }}>
                      Support resources are available. You don't have to carry this alone.
                    </div>
                  )}

                  <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <TrendBadge trend={insightsData.trend} volatility={insightsData.volatility} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


// ─── Sub-components ───────────────────────────────────────────────────────────

function CardHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <h3 style={{
        fontFamily: '"Cormorant Garamond", serif',
        fontSize: "1.3rem",
        fontWeight: 500,
        marginBottom: "0.2rem",
        color: "#f0f0f0",
      }}>
        {title}
      </h3>
      <div style={{ fontSize: "0.68rem", color: "#6b6b6b", textTransform: "uppercase", letterSpacing: "0.12em" }}>
        {sub}
      </div>
    </div>
  );
}

function DonutChart({ distribution }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 72;
  const innerR = 46;

  const slices = [];
  let cumAngle = -Math.PI / 2;

  for (const d of distribution) {
    const fraction = parseFloat(d.value) / 100;
    if (fraction <= 0) continue;
    const angle = fraction * 2 * Math.PI;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    cumAngle = endAngle;

    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const path = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
    slices.push({ path, color: d.color, emotion: d.emotion, value: d.value });
  }

  const top = distribution[0];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: "160px" }}>
      {slices.map((s) => (
        <path key={s.emotion} d={s.path} fill={s.color} opacity="0.88" />
      ))}
      {top && (
        <>
          <text x={cx} y={cy - 7} textAnchor="middle" fill="#f0f0f0" fontSize="15" fontWeight="600">
            {top.value}%
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="#a0a0a0" fontSize="10">
            {top.label}
          </text>
        </>
      )}
    </svg>
  );
}

function EmotionLegend({ distribution }) {
  const visible = distribution.filter((d) => parseFloat(d.value) > 0);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center" }}>
      {visible.map((d) => (
        <div
          key={d.emotion}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            padding: "0.25rem 0.6rem",
            borderRadius: "20px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            fontSize: "0.72rem",
            color: "#a0a0a0",
          }}
        >
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: d.color, flexShrink: 0 }} />
          {d.label}
        </div>
      ))}
    </div>
  );
}

function MoodTimeline({ moodTrends, period }) {
  // For 30-day view, show month/day labels only every 5 days to avoid crowding
  const showLabel = (i) => {
    if (period <= 7) return true;
    return i % 5 === 0 || i === moodTrends.length - 1;
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: "0.5rem" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "4px", minHeight: "200px" }}>
        {moodTrends.map((day, i) => {
          const entries = Object.entries(day.emotions);
          const total = entries.reduce((sum, [, c]) => sum + c, 0);
          const dominant = entries.length ? entries.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;
          const hasData = dominant && dominant[1] > 0;
          const color = hasData ? (EMOTION_COLORS[dominant[0]] || "#8a8a7e") : "rgba(255,255,255,0.04)";
          const heightPct = hasData ? Math.max(15, Math.min(100, total * 14)) : 6;

          return (
            <div
              key={day.date}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}
              title={hasData ? `${day.date}: ${dominant[0]} (${dominant[1]})` : day.date}
            >
              <div style={{
                width: "100%",
                height: `${heightPct}%`,
                minHeight: hasData ? "12px" : "4px",
                borderRadius: "4px 4px 2px 2px",
                background: color,
                opacity: hasData ? 0.85 : 1,
              }} />
            </div>
          );
        })}
      </div>

      {/* Day labels */}
      <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
        {moodTrends.map((day, i) => (
          <div
            key={day.date}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: period <= 7 ? "0.65rem" : "0.55rem",
              color: "#6b6b6b",
              visibility: showLabel(i) ? "visible" : "hidden",
            }}
          >
            {period <= 7 ? day.day : day.date.slice(5)}
          </div>
        ))}
      </div>

      {/* Emotion color legend for timeline */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "1rem" }}>
        {Object.entries(EMOTION_COLORS)
          .filter(([emotion]) => moodTrends.some((d) => d.emotions[emotion] > 0))
          .slice(0, 6)
          .map(([emotion, color]) => (
            <div
              key={emotion}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.68rem",
                color: "#6b6b6b",
              }}
            >
              <span style={{ width: "7px", height: "7px", borderRadius: "2px", background: color, flexShrink: 0 }} />
              {EMOTION_LABELS[emotion] || emotion}
            </div>
          ))}
      </div>
    </div>
  );
}

function TrendBadge({ trend, volatility }) {
  const volLevel = volatility < 0.15 ? "Stable" : volatility < 0.3 ? "Shifting" : "Volatile";
  const volColor = volatility < 0.15 ? "#7a9e8b" : volatility < 0.3 ? "#b8956a" : "#9e6b6b";

  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <span style={{
        fontSize: "0.68rem",
        padding: "0.2rem 0.6rem",
        borderRadius: "4px",
        background: "rgba(255,255,255,0.05)",
        color: "#a0a0a0",
        textTransform: "capitalize",
      }}>
        {trend}
      </span>
      <span style={{
        fontSize: "0.68rem",
        padding: "0.2rem 0.6rem",
        borderRadius: "4px",
        background: `${volColor}18`,
        color: volColor,
      }}>
        {volLevel}
      </span>
    </div>
  );
}
