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

// Sentiment polarity for the area chart line (-1 negative → +1 positive)
const SENTIMENT_SCORE = {
  joy: 1.0,
  surprise: 0.55,
  neutral: 0.0,
  disgust: -0.5,
  fear: -0.6,
  sadness: -0.75,
  anger: -0.9,
};

// Catmull-Rom → cubic bezier smooth path
function buildSmoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

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
  const [chartType, setChartType] = useState("line");
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                  <CardHeader title="Mood Timeline" sub={`Emotional arc · ${period}d`} noMargin />
                  <ChartToggle type={chartType} onChange={setChartType} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  {chartType === "line" && <MoodAreaChart moodTrends={moodTrendsForPeriod} period={period} />}
                  {chartType === "bar"  && <MoodBarChart  moodTrends={moodTrendsForPeriod} period={period} />}
                  {chartType === "dot"  && <MoodDotChart  moodTrends={moodTrendsForPeriod} period={period} />}
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

          {/* Mood Calendar heatmap — always 30 days regardless of period */}
          <MoodCalendar moodTrends={insightsData.moodTrends} />

        </main>
      </div>
    </div>
  );
}


// ─── Sub-components ───────────────────────────────────────────────────────────

function CardHeader({ title, sub, noMargin }) {
  return (
    <div style={{ marginBottom: noMargin ? 0 : "1.25rem" }}>
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

const CHART_TYPES = [
  { id: "line", label: "Gradient", icon: "〜" },
  { id: "bar",  label: "Bars",     icon: "▌▌" },
  { id: "dot",  label: "Orbs",     icon: "◎" },
];

function ChartToggle({ type, onChange }) {
  return (
    <div style={{
      display: "flex",
      gap: "2px",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "8px",
      padding: "3px",
      flexShrink: 0,
    }}>
      {CHART_TYPES.map(({ id, label, icon }) => (
        <button
          key={id}
          title={label}
          onClick={() => onChange(id)}
          style={{
            background: type === id ? "rgba(212,165,116,0.15)" : "none",
            border: type === id ? "1px solid rgba(212,165,116,0.2)" : "1px solid transparent",
            borderRadius: "5px",
            color: type === id ? "#d4a574" : "#4a4a4a",
            fontSize: "0.7rem",
            padding: "0.2rem 0.5rem",
            cursor: "pointer",
            transition: "all 0.15s",
            letterSpacing: "0.04em",
          }}
        >
          {icon}
        </button>
      ))}
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
      <style>{`
        @keyframes donutFadeIn {
          from { opacity: 0; transform: scale(0.88) rotate(-20deg); transform-origin: ${cx}px ${cy}px; }
          to   { opacity: 0.88; transform: scale(1) rotate(0deg); transform-origin: ${cx}px ${cy}px; }
        }
      `}</style>
      {slices.map((s, i) => (
        <path
          key={s.emotion}
          d={s.path}
          fill={s.color}
          opacity="0"
          style={{ animation: `donutFadeIn 0.5s ease forwards ${i * 0.06}s` }}
        />
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

function MoodAreaChart({ moodTrends, period }) {
  const W = 500;
  const H = 200;
  const PAD = { top: 28, right: 20, bottom: 38, left: 24 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const baselineY = PAD.top + chartH / 2;

  const showLabel = (i) => period <= 7 ? true : i % 5 === 0 || i === moodTrends.length - 1;

  const pts = moodTrends.map((day, i) => {
    const entries = Object.entries(day.emotions);
    const dominant = entries.length ? entries.reduce((a, b) => b[1] > a[1] ? b : a) : null;
    const score = dominant ? (SENTIMENT_SCORE[dominant[0]] ?? 0) : null;
    const x = PAD.left + (moodTrends.length === 1 ? chartW / 2 : (i / (moodTrends.length - 1)) * chartW);
    const y = score !== null ? PAD.top + ((1 - (score + 1) / 2) * chartH) : null;
    return { x, y, day, dominant, score };
  });

  const activePts = pts.filter(p => p.y !== null);
  const linePath = activePts.length >= 2 ? buildSmoothPath(activePts) : "";
  const areaPath = linePath
    ? `${linePath} L ${activePts[activePts.length - 1].x},${PAD.top + chartH} L ${activePts[0].x},${PAD.top + chartH} Z`
    : "";

  // Gradient stops shift color at each active data point
  const gradStops = activePts.map(p => ({
    offset: `${((p.x - PAD.left) / chartW * 100).toFixed(1)}%`,
    color: EMOTION_COLORS[p.dominant[0]] || "#d4a574",
  }));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", flex: 1, overflow: "visible" }}>
        <defs>
          <linearGradient id="colorLine" x1={PAD.left} y1="0" x2={PAD.left + chartW} y2="0" gradientUnits="userSpaceOnUse">
            {gradStops.length > 0
              ? gradStops.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity="0.95" />)
              : <stop offset="0%" stopColor="#d4a574" stopOpacity="0.95" />}
          </linearGradient>
          <linearGradient id="colorArea" x1={PAD.left} y1="0" x2={PAD.left + chartW} y2="0" gradientUnits="userSpaceOnUse">
            {gradStops.length > 0
              ? gradStops.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity="0.16" />)
              : <stop offset="0%" stopColor="#d4a574" stopOpacity="0.16" />}
          </linearGradient>
          <filter id="lineGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <text x={PAD.left - 6} y={PAD.top + 5} fontSize="9" fill="rgba(255,255,255,0.18)" textAnchor="end">+</text>
        <text x={PAD.left - 6} y={PAD.top + chartH + 4} fontSize="9" fill="rgba(255,255,255,0.18)" textAnchor="end">−</text>

        <line
          x1={PAD.left} y1={baselineY}
          x2={PAD.left + chartW} y2={baselineY}
          stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="3 6"
        />

        {areaPath && <path d={areaPath} fill="url(#colorArea)" />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="url(#colorLine)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#lineGlow)"
          />
        )}

        {activePts.map((p, i) => {
          const color = EMOTION_COLORS[p.dominant[0]] || "#d4a574";
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="9" fill={color} opacity="0.12" />
              <circle cx={p.x} cy={p.y} r="4" fill={color} opacity="0.95" stroke="rgba(10,10,11,0.8)" strokeWidth="1.2">
                <title>{`${p.day.date}: ${p.dominant[0]}`}</title>
              </circle>
            </g>
          );
        })}

        {pts.map((p, i) =>
          showLabel(i) ? (
            <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize={period <= 7 ? "10" : "8"} fill="#4a4a4a">
              {period <= 7 ? p.day.day : p.day.date.slice(5)}
            </text>
          ) : null
        )}

        {activePts.length < 2 && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="11" fill="#3a3a3a">
            Not enough data yet
          </text>
        )}
      </svg>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.75rem" }}>
        {Object.entries(EMOTION_COLORS)
          .filter(([e]) => moodTrends.some(d => d.emotions[e] > 0))
          .slice(0, 6)
          .map(([emotion, color]) => (
            <div key={emotion} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.68rem", color: "#6b6b6b" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: color, flexShrink: 0 }} />
              {EMOTION_LABELS[emotion] || emotion}
            </div>
          ))}
      </div>
    </div>
  );
}

function MoodBarChart({ moodTrends, period }) {
  const showLabel = (i) => period <= 7 ? true : i % 5 === 0 || i === moodTrends.length - 1;

  const maxTotal = Math.max(1, ...moodTrends.map(d => Object.values(d.emotions).reduce((s, c) => s + c, 0)));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: "0.5rem" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "5px", minHeight: "180px" }}>
        {moodTrends.map((day, i) => {
          const entries = Object.entries(day.emotions);
          const total = entries.reduce((s, [, c]) => s + c, 0);
          const dominant = entries.length ? entries.reduce((a, b) => b[1] > a[1] ? b : a) : null;
          const hasData = dominant && dominant[1] > 0;
          const color = hasData ? (EMOTION_COLORS[dominant[0]] || "#8a8a7e") : "rgba(255,255,255,0.05)";
          const heightPct = hasData ? Math.max(8, (total / maxTotal) * 100) : 4;

          return (
            <div
              key={day.date}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}
              title={hasData ? `${day.date}: ${dominant[0]} (${dominant[1]})` : day.date}
            >
              <div style={{
                width: "100%",
                height: `${heightPct}%`,
                minHeight: hasData ? "8px" : "3px",
                borderRadius: "4px 4px 2px 2px",
                background: color,
                opacity: hasData ? 0.82 : 1,
                transition: "height 0.3s ease",
              }} />
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "5px", marginTop: "6px" }}>
        {moodTrends.map((day, i) => (
          <div key={day.date} style={{
            flex: 1, textAlign: "center",
            fontSize: period <= 7 ? "0.65rem" : "0.55rem",
            color: "#4a4a4a",
            visibility: showLabel(i) ? "visible" : "hidden",
          }}>
            {period <= 7 ? day.day : day.date.slice(5)}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.75rem" }}>
        {Object.entries(EMOTION_COLORS)
          .filter(([e]) => moodTrends.some(d => d.emotions[e] > 0))
          .slice(0, 6)
          .map(([emotion, color]) => (
            <div key={emotion} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.68rem", color: "#6b6b6b" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "2px", background: color, flexShrink: 0 }} />
              {EMOTION_LABELS[emotion] || emotion}
            </div>
          ))}
      </div>
    </div>
  );
}

function MoodDotChart({ moodTrends, period }) {
  const W = 500;
  const H = 230;
  const PAD = { top: 48, right: 28, bottom: 42, left: 28 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const showLabel = (i) => period <= 7 ? true : i % 5 === 0 || i === moodTrends.length - 1;
  const maxTotal = Math.max(1, ...moodTrends.map(d => Object.values(d.emotions).reduce((s, c) => s + c, 0)));

  const pts = moodTrends.map((day, i) => {
    const entries = Object.entries(day.emotions);
    const dominant = entries.length ? entries.reduce((a, b) => b[1] > a[1] ? b : a) : null;
    const total = entries.reduce((s, [, c]) => s + c, 0);
    const score = dominant ? (SENTIMENT_SCORE[dominant[0]] ?? 0) : null;
    const x = PAD.left + (moodTrends.length === 1 ? chartW / 2 : (i / (moodTrends.length - 1)) * chartW);
    const y = score !== null ? PAD.top + ((1 - (score + 1) / 2) * chartH) : PAD.top + chartH / 2;
    const orbR = score !== null ? 18 + (total / maxTotal) * 12 : 0;
    const coreR = score !== null ? Math.max(3, orbR * 0.22) : 0;
    const color = dominant ? (EMOTION_COLORS[dominant[0]] || "#8a8a8e") : null;
    return { x, y, orbR, coreR, day, dominant, score, hasData: !!dominant, color };
  });

  const activePts = pts.filter(p => p.hasData);
  const threadPath = activePts.length >= 2 ? buildSmoothPath(activePts) : "";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", flex: 1, overflow: "visible" }}>
        <defs>
          {activePts.map((p, i) => (
            <radialGradient key={`orbg${i}`} id={`orbg${i}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor={p.color} stopOpacity="0.75" />
              <stop offset="50%"  stopColor={p.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={p.color} stopOpacity="0" />
            </radialGradient>
          ))}
          <filter id="orbGlow">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Thread connecting active orbs */}
        {threadPath && (
          <path
            d={threadPath}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="3 5"
          />
        )}

        {/* Ghost dots for empty days */}
        {pts.filter(p => !p.hasData).map((p, i) => (
          <circle key={`ghost${i}`} cx={p.x} cy={p.y} r="2.5" fill="rgba(255,255,255,0.05)" />
        ))}

        {/* Orbs */}
        {activePts.map((p, i) => (
          <g key={`orb${i}`}>
            <circle cx={p.x} cy={p.y} r={p.orbR} fill={`url(#orbg${i})`} filter="url(#orbGlow)">
              <title>{`${p.day.date}: ${p.dominant[0]}`}</title>
            </circle>
            <circle cx={p.x} cy={p.y} r={p.coreR} fill={p.color} opacity="0.95" />
          </g>
        ))}

        {/* Day labels */}
        {pts.map((p, i) =>
          showLabel(i) ? (
            <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize={period <= 7 ? "10" : "8"} fill={p.hasData ? "#5a5a5a" : "#2a2a2a"}>
              {period <= 7 ? p.day.day : p.day.date.slice(5)}
            </text>
          ) : null
        )}

        {activePts.length === 0 && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="11" fill="#3a3a3a">Not enough data yet</text>
        )}
      </svg>

      <div style={{ fontSize: "0.65rem", color: "#4a4a4a", marginTop: "0.25rem" }}>
        Orb size = check-in count · vertical position = emotional tone
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
        {Object.entries(EMOTION_COLORS)
          .filter(([e]) => moodTrends.some(d => d.emotions[e] > 0))
          .slice(0, 6)
          .map(([emotion, color]) => (
            <div key={emotion} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.68rem", color: "#6b6b6b" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: color, flexShrink: 0 }} />
              {EMOTION_LABELS[emotion] || emotion}
            </div>
          ))}
      </div>
    </div>
  );
}

function MoodCalendar({ moodTrends }) {
  if (!moodTrends || moodTrends.length === 0) return null;

  const firstDate = new Date(moodTrends[0].date + "T00:00:00");
  const startDow = firstDate.getDay();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (const day of moodTrends) {
    const entries = Object.entries(day.emotions);
    const dominant = entries.length ? entries.reduce((a, b) => b[1] > a[1] ? b : a) : null;
    cells.push({ date: day.date, dominant, hasData: !!(dominant && dominant[1] > 0) });
  }

  return (
    <div className={styles.glassCard} style={{ marginBottom: "2rem" }}>
      <CardHeader title="Mood Calendar" sub="Last 30 days — each square is one day" />
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        {/* Day-of-week labels */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{ height: "22px", display: "flex", alignItems: "center", fontSize: "0.6rem", color: "#3a3a3a", width: "22px", justifyContent: "center" }}>
              {d[0]}
            </div>
          ))}
        </div>

        {/* Week columns grid */}
        <div style={{ display: "grid", gridTemplateRows: "repeat(7, 22px)", gridAutoFlow: "column", gridAutoColumns: "22px", gap: "4px" }}>
          {cells.map((cell, i) => {
            if (!cell) return <div key={`pad-${i}`} />;
            const color = cell.hasData
              ? (EMOTION_COLORS[cell.dominant[0]] || "#8a8a8e")
              : "rgba(255,255,255,0.04)";
            return (
              <div
                key={cell.date}
                title={cell.hasData ? `${cell.date}: ${cell.dominant[0]}` : cell.date}
                style={{
                  borderRadius: "4px",
                  background: color,
                  opacity: cell.hasData ? 0.72 : 1,
                  border: "1px solid rgba(255,255,255,0.04)",
                  cursor: cell.hasData ? "default" : "default",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={e => { if (cell.hasData) e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={e => { if (cell.hasData) e.currentTarget.style.opacity = "0.72"; }}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginTop: "1rem" }}>
        {Object.entries(EMOTION_COLORS).map(([emotion, color]) => (
          <div key={emotion} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.65rem", color: "#555" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: color, opacity: 0.72 }} />
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
