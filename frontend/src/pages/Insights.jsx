import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Insights.module.css";
import { getEmotionColor, EMOTION_COLORS } from "../services/emotionService";

export function Insights() {
  const navigate = useNavigate();
  const [insightsData, setInsightsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [activeChart, setActiveChart] = useState("radar"); // "radar", "weekly", "sparklines"
  const [chartStyle, setChartStyle] = useState("sparklines"); // "sparklines", "bars", "stacked"
  const [showChartMenu, setShowChartMenu] = useState(false);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    text: "",
  });

  const CONFIG = {
    apiEndpoint: "/api/emotions/insights/?days=7",
    colors: {
      joy: EMOTION_COLORS.joy,
      sadness: EMOTION_COLORS.sadness,
      anger: EMOTION_COLORS.anger,
      fear: EMOTION_COLORS.fear,
      surprise: EMOTION_COLORS.surprise,
      disgust: EMOTION_COLORS.disgust,
      neutral: EMOTION_COLORS.neutral,
      anxiety: EMOTION_COLORS.anxiety,
      trust: EMOTION_COLORS.trust,
      anticipation: EMOTION_COLORS.anticipation,
    },
    labels: {
      fear: "Fear",
      sadness: "Sadness",
      neutral: "Neutral",
      anger: "Anger",
      surprise: "Surprise",
      joy: "Joy",
      disgust: "Disgust",
    },
    fetchInterval: 30000,
  };

  const fetchInsights = async () => {
    try {
      setIsSyncing(true);
      const token = localStorage.getItem("auth_token");

      if (!token) {
        window.location.href = "/login";
        return null;
      }

      const response = await fetch(CONFIG.apiEndpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        window.location.href = "/login";
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setLastSync(new Date());
      setSyncCount((c) => c + 1);
      console.log("✓ Insights fetched:", data);
      console.log("  - Total logs:", data.total_logs);
      console.log("  - Emotion frequency:", data.emotion_frequency);
      console.log("  - Daily breakdown:", data.daily_breakdown);
      console.log(
        "  - Days with data:",
        Object.keys(data.daily_breakdown || {}).length,
      );
      return data;
    } catch (error) {
      console.error("✗ Insights fetch error:", error);
      return null;
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights().then((data) => {
      if (data) setInsightsData(transformInsightsData(data));
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log(`[Auto-sync #${syncCount + 1}] Refreshing insights...`);
      fetchInsights().then((data) => {
        if (data) setInsightsData(transformInsightsData(data));
      });
    }, CONFIG.fetchInterval);

    return () => clearInterval(interval);
  }, [syncCount]);

  const transformInsightsData = (apiResponse) => {
    if (!apiResponse || apiResponse.total_logs === 0) return null;

    const {
      emotion_frequency,
      dominant_emotion,
      dominance_pct,
      total_logs,
      trend,
      volatility,
      high_risk,
    } = apiResponse;

    const emotionDistribution = Object.entries(emotion_frequency)
      .map(([emotion, count]) => ({
        emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
        value: ((count / total_logs) * 100).toFixed(1),
        count,
        color: CONFIG.colors[emotion] || "#8a8a8a",
        key: emotion,
      }))
      .sort((a, b) => parseFloat(b.value) - parseFloat(a.value));

    // Generate daily breakdown from actual backend data
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyBreakdown = apiResponse.daily_breakdown || {};

    // Always show last 7 days ending today
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 6 * 24 * 60 * 60 * 1000);

    // Create 7 days ending today
    const moodTrends = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = dayNames[date.getDay()];

      moodTrends.push({
        day: dayName,
        emotions: dailyBreakdown[dateStr] || {},
        date: dateStr,
      });
    }

    const insights = generateAIInsights({
      dominant_emotion,
      dominance_pct,
      trend,
      volatility,
      high_risk,
      total_logs,
      emotion_frequency,
    });

    const reflections = generateReflections({
      dominant_emotion,
      trend,
      high_risk,
      total_logs,
    });

    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dateRange = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

    return {
      emotionDistribution,
      moodTrends,
      totalLogs: total_logs,
      dominantEmotion: dominant_emotion,
      dominancePct: (dominance_pct * 100).toFixed(0),
      trend,
      highRisk: high_risk,
      insights,
      reflections,
      dateRange,
    };
  };

  const generateAIInsights = (data) => {
    const insights = [];
    const domLabel = CONFIG.labels[data.dominant_emotion] || "Unknown";

    insights.push({
      type: "pattern",
      title: `${domLabel} Dominant`,
      badge: `${(data.dominance_pct * 100).toFixed(0)}%`,
      text: `Your emotional state has been primarily ${data.dominant_emotion} this week.`,
    });

    const volLevel =
      data.volatility < 0.15
        ? "Low"
        : data.volatility < 0.3
          ? "Moderate"
          : "High";
    insights.push({
      type: data.volatility > 0.3 ? "warning" : "positive",
      title: `${volLevel} Emotional Volatility`,
      badge: volLevel,
      text:
        data.volatility > 0.3
          ? "Your emotions are fluctuating significantly."
          : "Your emotional state has been stable and balanced.",
    });

    if (data.high_risk) {
      insights.push({
        type: "crisis",
        title: "Elevated Risk Detected",
        badge: "Alert",
        text: "High levels of distress detected. Support resources available.",
      });
    } else {
      insights.push({
        type: "positive",
        title: "Wellness Indicators Stable",
        badge: "Good",
        text: "No significant risk factors detected.",
      });
    }

    return insights;
  };

  const generateReflections = (data) => {
    return [
      {
        icon: "📊",
        title: "Emotional Week",
        date: new Date().toLocaleDateString(),
        text: `You've logged ${data.total_logs} emotional entries this week.`,
        type: "neutral",
      },
      {
        icon: "📈",
        title: "Trends & Patterns",
        date: "Analysis",
        text: `Your emotions are ${data.trend} with ${CONFIG.labels[data.dominant_emotion]} being most prominent.`,
        type: "pattern",
      },
      {
        icon: data.high_risk ? "⚠️" : "✓",
        title: data.high_risk ? "Crisis Support" : "Wellness Check",
        date: "Now",
        text: data.high_risk
          ? "We noticed concerning patterns. Support resources available."
          : "Your emotional wellness indicators are within healthy ranges.",
        type: data.high_risk ? "crisis" : "positive",
      },
    ];
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#0a0a0b",
          color: "#f5f5f5",
          fontSize: "1.1rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "3px solid rgba(212, 165, 116, 0.2)",
              borderTopColor: "#d4a574",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 1rem",
            }}
          />
          <p>Loading your insights...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!insightsData) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#0a0a0b",
          color: "#f5f5f5",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "0.9rem", color: "#a0a0a0" }}>
            No insights available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.backgroundImage} />
      <div className={styles.contentWrapper}>
        {/* Sync Indicator */}
        {isSyncing && (
          <div
            style={{
              position: "fixed",
              bottom: "1.5rem",
              right: "1.5rem",
              padding: "0.75rem 1.25rem",
              background: "rgba(212, 165, 116, 0.1)",
              border: "1px solid rgba(212, 165, 116, 0.3)",
              borderRadius: "10px",
              fontSize: "0.8rem",
              color: "#d4a574",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              zIndex: 2000,
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#d4a574",
                animation: "pulse 1s ease-in-out infinite",
              }}
            />
            Syncing... (#{syncCount})
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
          </div>
        )}

        {/* Header */}
        <header
          style={{
            textAlign: "center",
            padding: "3rem 2rem 2.5rem",
            position: "relative",
            zIndex: 1,
          }}
        >
          <h1
            style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: "2.75rem",
              fontWeight: 300,
              background: "linear-gradient(180deg, #fff 0%, #e8c9a0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "0.75rem",
            }}
          >
            Insights Dashboard
          </h1>
          <p style={{ color: "#a0a0a0", fontWeight: 300 }}>
            A reflection of your emotional landscape from{" "}
            {insightsData.dateRange}.
            {lastSync && (
              <span
                style={{
                  fontSize: "0.75em",
                  color: "#6b6b6b",
                  marginLeft: "1rem",
                }}
              >
                Updated: {lastSync.toLocaleTimeString()}
              </span>
            )}
          </p>
          <div
            style={{
              marginTop: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              fontSize: "0.7rem",
              color: "#6b6b6b",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#4ade80",
              }}
            ></span>
            <span>
              Data from database • {insightsData.totalLogs} logged entries
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: "1440px",
            margin: "0 auto",
            padding: "0 2rem 2rem",
          }}
        >
          {/* Top Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(280px, 1fr) minmax(600px, 2fr) minmax(250px, 1fr)",
              gap: "1.25rem",
              marginBottom: "2rem",
            }}
          >
            {/* Radar - Emotion Balance */}
            <div
              className={styles.glassCard}
              style={{
                minHeight: "420px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontFamily: '"Cormorant Garamond", serif',
                      fontSize: "1.35rem",
                      fontWeight: 500,
                      marginBottom: "0.25rem",
                    }}
                  >
                    Emotion Balance
                  </h3>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "#6b6b6b",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                    }}
                  >
                    {insightsData.totalLogs} Entries
                  </div>
                </div>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "#6b6b6b",
                    cursor: "pointer",
                    fontSize: "1.25rem",
                  }}
                >
                  ⋯
                </button>
              </div>
              <RadarChart data={insightsData} config={CONFIG} />
              <Legend data={insightsData.emotionDistribution} />
            </div>

            {/* Bar Chart - Weekly Patterns */}
            <div
              className={styles.glassCard}
              style={{
                minHeight: "420px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontFamily: '"Cormorant Garamond", serif',
                      fontSize: "1.35rem",
                      fontWeight: 500,
                      marginBottom: "0.25rem",
                    }}
                  >
                    Weekly Patterns
                  </h3>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "#6b6b6b",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                    }}
                  >
                    Last 7 Days
                  </div>
                </div>
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setShowChartMenu(!showChartMenu)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#6b6b6b",
                      cursor: "pointer",
                      fontSize: "1.25rem",
                    }}
                  >
                    ⋯
                  </button>
                  {showChartMenu && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        background: "rgba(18, 18, 22, 0.95)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "12px",
                        minWidth: "180px",
                        zIndex: 100,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                        overflow: "hidden",
                      }}
                    >
                      {[
                        { id: "sparklines", label: "Sparkline View" },
                        { id: "bars", label: "Bar Chart" },
                        { id: "stacked", label: "Stacked View" },
                      ].map((style) => (
                        <button
                          key={style.id}
                          onClick={() => {
                            setChartStyle(style.id);
                            setShowChartMenu(false);
                          }}
                          style={{
                            width: "100%",
                            padding: "0.75rem 1rem",
                            background:
                              chartStyle === style.id
                                ? "rgba(168, 197, 160, 0.2)"
                                : "transparent",
                            border: "none",
                            color:
                              chartStyle === style.id ? "#a8c5a0" : "#a0a0a0",
                            cursor: "pointer",
                            textAlign: "left",
                            fontSize: "0.85rem",
                            transition: "all 0.2s",
                            borderLeft:
                              chartStyle === style.id
                                ? "3px solid #a8c5a0"
                                : "3px solid transparent",
                          }}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <BarChart
                data={insightsData}
                config={CONFIG}
                chartStyle={chartStyle}
              />
              <Legend data={insightsData.emotionDistribution.slice(0, 6)} />
            </div>

            {/* AI Insights */}
            <div
              className={styles.glassCard}
              style={{
                minHeight: "420px",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontFamily: '"Cormorant Garamond", serif',
                      fontSize: "1.35rem",
                      fontWeight: 500,
                      marginBottom: "0.25rem",
                    }}
                  >
                    AI Insights
                  </h3>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "#6b6b6b",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                    }}
                  >
                    Pattern Analysis
                  </div>
                </div>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "#6b6b6b",
                    cursor: "pointer",
                    fontSize: "1.25rem",
                  }}
                >
                  ⋯
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.875rem",
                  flex: 1,
                }}
              >
                {insightsData.insights.map((insight, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "1rem",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "12px",
                      borderLeft: `2px solid ${insight.type === "crisis" ? "#a85a5a" : "#d4a574"}`,
                      cursor: "pointer",
                      transition: "all 0.3s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.4rem",
                      }}
                    >
                      <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                        {insight.title}
                      </span>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          background:
                            insight.type === "crisis"
                              ? "rgba(168, 90, 90, 0.15)"
                              : "rgba(212, 165, 116, 0.15)",
                          color:
                            insight.type === "crisis" ? "#c97b7b" : "#d4a574",
                          fontWeight: 500,
                        }}
                      >
                        {insight.badge}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#a0a0a0",
                        lineHeight: 1.5,
                      }}
                    >
                      {insight.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Reflections */}
          <div
            className={styles.glassCard}
            style={{ marginTop: "2rem", marginBottom: "3rem", padding: "2rem" }}
          >
            <h3
              style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: "1.35rem",
                fontWeight: 500,
                marginBottom: "2rem",
              }}
            >
              Your Reflection
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "2rem",
              }}
            >
              {insightsData.reflections.map((reflection, i) => (
                <div
                  key={i}
                  style={{
                    background: `linear-gradient(135deg, rgba(212, 165, 116, 0.05) 0%, rgba(255,255,255,0.02) 100%)`,
                    borderRadius: "16px",
                    padding: "1.75rem",
                    border: "1px solid rgba(212, 165, 116, 0.1)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    minHeight: "240px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.875rem",
                        marginBottom: "1.25rem",
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "12px",
                          background: "rgba(212, 165, 116, 0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.25rem",
                          border: "1px solid rgba(212, 165, 116, 0.15)",
                          flexShrink: 0,
                        }}
                      >
                        {reflection.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 500 }}>
                          {reflection.title}
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "#6b6b6b",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {reflection.date}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#a0a0a0",
                        lineHeight: 1.6,
                      }}
                    >
                      {reflection.text}
                    </div>
                  </div>
                  <div
                    style={{
                      alignSelf: "flex-end",
                      color: "#d4a574",
                      fontSize: "1.25rem",
                      transition: "transform 0.3s",
                      marginTop: "1.5rem",
                    }}
                  >
                    →
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Radar Chart Component
function RadarChart({ data, config }) {
  const emotions = ["joy", "sadness", "anger", "fear", "surprise", "disgust"];
  const values = emotions.map((e) => {
    const found = data.emotionDistribution.find((d) => d.key === e);
    return found ? parseFloat(found.value) : 0;
  });

  const centerX = 100;
  const centerY = 110;
  const maxValue = Math.max(...values, 20);
  const radius = 85;
  const angleStep = (Math.PI * 2) / emotions.length;

  const points = values.map((val, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (val / maxValue) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
      value: val,
      emotion: emotions[i],
    };
  });

  const pathData =
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") +
    " Z";

  const levels = [0.2, 0.4, 0.6, 0.8, 1.0].map((l) => l * maxValue);
  const grids = levels
    .map((level) => {
      const r = (level / maxValue) * radius;
      const pts = emotions
        .map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return `${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`;
        })
        .join(" ");
      return `<polygon points="${pts}" fill="none" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1.5" opacity="0.6" />`;
    })
    .join("");

  const axes = emotions
    .map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1" opacity="0.3" />`;
    })
    .join("");

  const labels = emotions
    .map((emo, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const labelRadius = radius + 22;
      const x = centerX + labelRadius * Math.cos(angle);
      const y = centerY + labelRadius * Math.sin(angle);
      return `<text x="${x}" y="${y}" fill="#a0a0a0" font-size="11" text-anchor="middle" dominant-baseline="middle" font-weight="500">${config.labels[emo]}</text>`;
    })
    .join("");

  const circles = points
    .map((p, i) => {
      const color = config.colors[p.emotion] || "#d4a574";
      return `
      <circle cx="${p.x}" cy="${p.y}" r="5" fill="${color}" stroke="#0a0a0b" stroke-width="2" cursor="pointer" opacity="0.9" />
      `;
    })
    .join("");

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="0 0 200 240"
        style={{ width: "100%", height: "280px", overflow: "visible" }}
        dangerouslySetInnerHTML={{
          __html: `
        <defs>
          <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#d4a574" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#d4a574" stop-opacity="0.05"/>
          </radialGradient>
        </defs>
        ${grids}
        ${axes}
        <path d="${pathData}" fill="url(#radarFill)" stroke="#d4a574" stroke-width="2" opacity="0.8"/>
        ${circles}
        ${labels}
      `,
        }}
      />
    </div>
  );
}

// Bar Chart View Component
function BarChartView({ data, config }) {
  const emotions = ["joy", "sadness", "anger", "fear", "surprise", "disgust"];
  const width = 900;
  const height = 450;
  const padding = { top: 30, right: 40, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = chartWidth / (emotions.length * 1.5);

  const emotionCounts = emotions.map((emo) => {
    const emotion = data.emotionDistribution.find(
      (e) => e.emotion.toLowerCase() === emo,
    );
    return {
      emotion: emo,
      count: emotion?.count || 0,
      color: config.colors[emo],
    };
  });

  const maxCount = Math.max(...emotionCounts.map((e) => e.count), 1);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0.5rem 0",
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          {emotions.map((emo) => (
            <linearGradient
              key={emo}
              id={`bar-gradient-${emo}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop
                offset="0%"
                stopColor={config.colors[emo]}
                stopOpacity="1"
              />
              <stop
                offset="100%"
                stopColor={config.colors[emo]}
                stopOpacity="0.6"
              />
            </linearGradient>
          ))}
        </defs>

        {/* Y-axis line */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
        />

        {/* X-axis line */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
        />

        {/* Y-axis labels (counts) */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const count = Math.round(maxCount * ratio);
          const y = height - padding.bottom - chartHeight * ratio;
          return (
            <g key={`y-${i}`}>
              <line
                x1={padding.left - 5}
                y1={y}
                x2={padding.left}
                y2={y}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                fill="#6b6b6b"
                fontSize="10"
                textAnchor="end"
              >
                {count}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {emotionCounts.map((item, idx) => {
          const barHeight = (item.count / maxCount) * chartHeight;
          const x =
            padding.left + (idx + 0.25) * (chartWidth / emotions.length);
          const y = height - padding.bottom - barHeight;

          return (
            <g key={item.emotion}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={`url(#bar-gradient-${item.emotion})`}
                rx="6"
                opacity="0.85"
              />
              <text
                x={x + barWidth / 2}
                y={height - padding.bottom + 20}
                fill="#a0a0a0"
                fontSize="12"
                textAnchor="middle"
                fontWeight="500"
              >
                {config.labels[item.emotion]}
              </text>
              <text
                x={x + barWidth / 2}
                y={y - 5}
                fill={item.color}
                fontSize="14"
                fontWeight="700"
                textAnchor="middle"
              >
                {item.count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Circular Radial Chart Component
function CircularRadialView({ data, config }) {
  const emotions = ["joy", "sadness", "anger", "fear", "surprise", "disgust"];
  const width = 900;
  const height = 450;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 160;
  const angleStep = (Math.PI * 2) / emotions.length;

  // Calculate average emotion counts across week
  const emotionCounts = emotions.map((emo) => {
    const dailyCounts = data.moodTrends.map((day) => day.emotions[emo] || 0);
    return {
      emotion: emo,
      avg: dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length,
      color: config.colors[emo],
    };
  });

  const maxCount = Math.max(...emotionCounts.map((e) => e.avg), 1);

  // Draw concentric circles
  const circles = [0.2, 0.4, 0.6, 0.8, 1.0].map((ratio) => {
    const r = radius * ratio;
    return (
      <circle
        key={`circle-${ratio}`}
        cx={centerX}
        cy={centerY}
        r={r}
        fill="none"
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth="1"
      />
    );
  });

  // Draw radial lines and emotion areas
  const areas = emotionCounts.map((item, idx) => {
    const angle = idx * angleStep - Math.PI / 2;
    const nextAngle = (idx + 1) * angleStep - Math.PI / 2;

    const value1 = (item.avg / maxCount) * radius;
    const x1 = centerX + value1 * Math.cos(angle);
    const y1 = centerY + value1 * Math.sin(angle);

    // For area, get next emotion value
    const nextItem = emotionCounts[(idx + 1) % emotions.length];
    const value2 = (nextItem.avg / maxCount) * radius;
    const x2 = centerX + value2 * Math.cos(nextAngle);
    const y2 = centerY + value2 * Math.sin(nextAngle);

    const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;

    return (
      <g key={item.emotion}>
        <path
          d={pathData}
          fill={item.color}
          opacity="0.2"
          stroke={item.color}
          strokeWidth="2"
        />
        <circle
          cx={x1}
          cy={y1}
          r="5"
          fill={item.color}
          stroke="#0a0a0b"
          strokeWidth="2"
        />
      </g>
    );
  });

  // Draw radial grid lines
  const gridLines = emotionCounts.map((item, idx) => {
    const angle = idx * angleStep - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return (
      <line
        key={`grid-${idx}`}
        x1={centerX}
        y1={centerY}
        x2={x}
        y2={y}
        stroke="rgba(255, 255, 255, 0.05)"
        strokeWidth="1"
      />
    );
  });

  // Labels
  const labels = emotionCounts.map((item, idx) => {
    const angle = idx * angleStep - Math.PI / 2;
    const labelRadius = radius + 60;
    const x = centerX + labelRadius * Math.cos(angle);
    const y = centerY + labelRadius * Math.sin(angle);
    return (
      <text
        key={`label-${idx}`}
        x={x}
        y={y}
        fill="#a0a0a0"
        fontSize="13"
        textAnchor="middle"
        dominantBaseline="middle"
        fontWeight="500"
      >
        {config.labels[item.emotion]}
      </text>
    );
  });

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "0",
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%" }}
      >
        {circles}
        {gridLines}
        {areas}
        {labels}
      </svg>
    </div>
  );
}

// Sparklines Grid Component
function BarChart({ data, config, chartStyle = "sparklines" }) {
  const emotions = ["joy", "sadness", "anger", "fear", "surprise", "disgust"];
  const width = 900;
  const height = 450;
  const padding = { top: 10, right: 15, bottom: 10, left: 15 };

  const cols = 2;
  const rows = 3;
  const cellWidth = (width - padding.left - padding.right) / cols;
  const cellHeight = (height - padding.top - padding.bottom) / rows;
  const chartPadding = 8;

  // Generate sparkline path for each emotion
  const generateSparkline = (emotion) => {
    const counts = data.moodTrends.map((day) => day.emotions[emotion] || 0);
    const maxCount = Math.max(...counts, 1);
    const totalCount = counts.reduce((a, b) => a + b, 0);
    const avgCount = totalCount / counts.length;

    const sparkWidth = cellWidth - chartPadding * 2;
    const sparkHeight = cellHeight - 90;

    const points = counts.map((count, i) => {
      const x = (i / (counts.length - 1)) * sparkWidth;
      const y = sparkHeight - (count / maxCount) * sparkHeight;
      return { x, y, count };
    });

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpX = (curr.x + next.x) / 2;
      path += ` Q ${cpX} ${curr.y}, ${next.x} ${next.y}`;
    }

    const areaPath =
      path +
      ` L ${points[points.length - 1].x} ${sparkHeight} L ${points[0].x} ${sparkHeight} Z`;

    // Calculate trend
    const firstHalf = counts
      .slice(0, Math.ceil(counts.length / 2))
      .reduce((a, b) => a + b, 0);
    const secondHalf = counts
      .slice(Math.ceil(counts.length / 2))
      .reduce((a, b) => a + b, 0);
    const trend =
      secondHalf > firstHalf
        ? "up"
        : secondHalf < firstHalf
          ? "down"
          : "stable";

    return { path, areaPath, points, maxCount, totalCount, avgCount, trend };
  };

  if (chartStyle === "bars") {
    return <BarChartView data={data} config={config} />;
  }

  if (chartStyle === "stacked") {
    return <CircularRadialView data={data} config={config} />;
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0",
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          {emotions.map((emo) => (
            <linearGradient
              key={emo}
              id={`spark-gradient-${emo}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop
                offset="0%"
                stopColor={config.colors[emo]}
                stopOpacity="0.5"
              />
              <stop
                offset="100%"
                stopColor={config.colors[emo]}
                stopOpacity="0.08"
              />
            </linearGradient>
          ))}
          <filter id="cardShadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="0" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {emotions.map((emo, idx) => {
          const row = Math.floor(idx / cols);
          const col = idx % cols;
          const colGap = 8;
          const rowGap = 8;
          const x =
            padding.left + col * cellWidth + chartPadding + col * colGap;
          const y = padding.top + row * cellHeight + row * rowGap;

          const {
            path,
            areaPath,
            points,
            maxCount,
            totalCount,
            avgCount,
            trend,
          } = generateSparkline(emo);

          return (
            <g key={emo} transform={`translate(${x}, ${y})`}>
              <rect
                x={-chartPadding}
                y="0"
                width={cellWidth}
                height={cellHeight}
                fill="rgba(18, 18, 22, 0.6)"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
                rx="12"
                filter="url(#cardShadow)"
              />

              <rect
                x={-chartPadding}
                y="0"
                width="3"
                height={cellHeight}
                fill={config.colors[emo]}
                opacity="0.6"
                rx="12"
                style={{ clipPath: "inset(0 0 0 0 round 12px)" }}
              />

              <text
                x="8"
                y="28"
                fill="#e0e0e0"
                fontSize="18"
                fontWeight="600"
                letterSpacing="0.3"
              >
                {config.labels[emo]}
              </text>
              <circle
                cx="-8"
                cy="20"
                r="5"
                fill={config.colors[emo]}
                opacity="0.9"
              />

              <text
                x={cellWidth - chartPadding * 2 - 20}
                y="28"
                fill="#d4a574"
                fontSize="22"
                fontWeight="700"
                textAnchor="end"
              >
                {totalCount}
              </text>
              <text
                x={cellWidth - chartPadding * 2}
                y="28"
                fill={
                  trend === "up"
                    ? "#a8c5a0"
                    : trend === "down"
                      ? "#d4a0a0"
                      : "#a8a8a8"
                }
                fontSize="16"
                textAnchor="end"
              >
                {trend === "up" ? "↗" : trend === "down" ? "↘" : "→"}
              </text>

              <text x="8" y="48" fill="#6b6b6b" fontSize="11" fontWeight="500">
                AVG: {avgCount.toFixed(1)}
              </text>

              <g transform="translate(0, 60)">
                <line
                  x1="0"
                  y1={cellHeight - 90}
                  x2={cellWidth - chartPadding * 2}
                  y2={cellHeight - 90}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />

                <path d={areaPath} fill={`url(#spark-gradient-${emo})`} />

                <path
                  d={path}
                  fill="none"
                  stroke={config.colors[emo]}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.3"
                  filter="blur(2px)"
                />
                <path
                  d={path}
                  fill="none"
                  stroke={config.colors[emo]}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.95"
                />

                {points.map(
                  (p, i) =>
                    p.count > 0 && (
                      <g key={i}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="4"
                          fill={config.colors[emo]}
                          opacity="0.2"
                        />
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="2.5"
                          fill={config.colors[emo]}
                          stroke="#0a0a0b"
                          strokeWidth="1.5"
                        />
                      </g>
                    ),
                )}

                <g transform={`translate(0, ${cellHeight - 70})`}>
                  {data.moodTrends.map((day, i) => {
                    const x =
                      (i / (data.moodTrends.length - 1)) *
                      (cellWidth - chartPadding * 2);
                    return (
                      <text
                        key={i}
                        x={x}
                        y="0"
                        fill="#6b6b6b"
                        fontSize="11"
                        textAnchor="middle"
                        fontWeight="500"
                      >
                        {day.day}
                      </text>
                    );
                  })}
                </g>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Legend Component
function Legend({ data }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0.6rem",
        flexWrap: "wrap",
        marginTop: "1rem",
        justifyContent: "center",
      }}
    >
      {data.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.4rem 0.8rem",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "20px",
            fontSize: "0.75rem",
            color: "#a0a0a0",
            cursor: "pointer",
            transition: "all 0.3s",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: item.color,
            }}
          />
          <span>{item.emotion}</span>
          <span style={{ color: "#d4a574", fontWeight: 600 }}>
            {item.value}%
          </span>
        </div>
      ))}
    </div>
  );
}
