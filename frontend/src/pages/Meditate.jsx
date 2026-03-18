import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import styles from "./Meditate.module.css";
import { useBreathingTimer, PATTERNS } from "../hooks/useBreathingTimer";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { getMeditationSuggestion, logMeditationSession, getMeditationStats } from "../services/api";

const BREATHWORK_KEYS = ["box", "calm", "deep", "wim_hof", "coherent"];

const PATTERN_LABELS = {
  box: "Box Breathing",
  calm: "4-7-8 Calm",
  deep: "Deep Breath",
  wim_hof: "Wim Hof",
  coherent: "Coherent",
};

const PATTERN_TIMING = {
  box: "4 · 4 · 4 · 4",
  calm: "4 · 7 · 8",
  deep: "5 · 5",
  wim_hof: "2 · 15",
  coherent: "5 · 5",
};

const TRACKS = [
  { id: "fear", label: "Fear", file: "/audio/meditations/fear.mp3", duration: "~8 min", emotion: "fear" },
];

const EMOTION_COLORS = {
  fear:     "hsla(38,  80%, 60%, 0.25)",
  sadness:  "hsla(210, 70%, 60%, 0.25)",
  anger:    "hsla(0,   70%, 60%, 0.25)",
  joy:      "hsla(120, 60%, 55%, 0.25)",
  surprise: "hsla(280, 65%, 65%, 0.25)",
  disgust:  "hsla(160, 60%, 50%, 0.25)",
  neutral:  "hsla(220, 15%, 60%, 0.25)",
};

const EMOTION_GLOW = {
  fear:     "hsla(38,  80%, 60%, 0.45)",
  sadness:  "hsla(210, 70%, 60%, 0.45)",
  anger:    "hsla(0,   70%, 60%, 0.45)",
  joy:      "hsla(120, 60%, 55%, 0.45)",
  surprise: "hsla(280, 65%, 65%, 0.45)",
  disgust:  "hsla(160, 60%, 50%, 0.45)",
  neutral:  "hsla(220, 15%, 60%, 0.45)",
};

function computeStreak(historyDict) {
  if (!historyDict) return 0;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    if (historyDict[key]) streak++;
    else break;
  }
  return streak;
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function Meditate() {
  const [activeTab, setActiveTab] = useState("guided");
  const [suggestion, setSuggestion] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Dashboard
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isDashboardHovered, setIsDashboardHovered] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);

  // Track library
  const [activeTrackId, setActiveTrackId] = useState("fear");

  // Matrix tooltip
  const [hoveredCell, setHoveredCell] = useState(null);

  // Fetch stats when dashboard opens or hovered
  useEffect(() => {
    if ((isDashboardOpen || isDashboardHovered) && !dashboardStats) {
      getMeditationStats()
        .then(setDashboardStats)
        .catch((err) => console.error("Failed to load stats:", err));
    }
  }, [isDashboardOpen, isDashboardHovered, dashboardStats]);

  // Breathe tab
  const [selectedBreath, setSelectedBreath] = useState(null);
  const breathing = useBreathingTimer(selectedBreath || "box");

  // Guided audio
  const guidedAudio = useAudioPlayer();

  // Background ambient
  const bgAudioRef = useRef(null);
  useEffect(() => {
    const bg = new Audio("/audio/meditations/medi.mp3");
    bg.loop = true;
    bg.volume = 0.22;
    bg.preload = "auto";
    bgAudioRef.current = bg;
    bg.play().catch(() => {});
    return () => {
      bg.pause();
      bgAudioRef.current = null;
    };
  }, []);

  // Streak
  const streak = useMemo(
    () => computeStreak(dashboardStats?.history_dict),
    [dashboardStats]
  );

  // 7-day chart data
  const chartDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const entry = dashboardStats?.history_dict?.[dateStr];
      days.push({
        dateStr,
        dayMins: entry ? Math.floor(entry.duration / 60) : 0,
        pattern: entry?.pattern ?? null,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
      });
    }
    return days;
  }, [dashboardStats]);

  const maxMins = useMemo(
    () => Math.max(...chartDays.map((d) => d.dayMins), 1),
    [chartDays]
  );

  // Save session
  const saveSession = useCallback(
    async (pattern_used, duration_seconds, completed, emotion = null) => {
      if (duration_seconds < 60) return;
      try {
        await logMeditationSession({ pattern_used, duration_seconds, completed, emotion });
        setDashboardStats(null);
      } catch (err) {
        console.error("Failed to save session", err);
      }
    },
    []
  );

  // Generate
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const data = await getMeditationSuggestion();
      setSuggestion(data);
      const track = TRACKS.find((t) => t.id === activeTrackId) || TRACKS[0];
      if (track) guidedAudio.loadAudio(track.file);
    } catch (e) {
      setError(e.message || "Failed to generate session");
    } finally {
      setGenerating(false);
    }
  }, [guidedAudio, activeTrackId]);

  // Track select
  const handleTrackSelect = useCallback(
    (track) => {
      setActiveTrackId(track.id);
      guidedAudio.loadAudio(track.file);
    },
    [guidedAudio]
  );

  // Guided play/pause
  const handleGuidedToggle = useCallback(() => {
    if (!suggestion) return;
    if (guidedAudio.isPlaying) {
      saveSession(
        suggestion.suggested_pattern,
        Math.floor(guidedAudio.audioProgress * guidedAudio.audioDuration),
        false,
        suggestion.emotion
      );
    }
    guidedAudio.togglePlayPause();
  }, [suggestion, guidedAudio, saveSession]);

  // Guided reset
  const handleGuidedReset = useCallback(() => {
    if (guidedAudio.isPlaying || guidedAudio.audioProgress > 0) {
      saveSession(
        suggestion.suggested_pattern,
        Math.floor(guidedAudio.audioProgress * guidedAudio.audioDuration),
        false,
        suggestion.emotion
      );
    }
    guidedAudio.stop();
    setSuggestion(null);
  }, [guidedAudio, suggestion, saveSession]);

  // Guided natural completion
  useEffect(() => {
    if (suggestion && guidedAudio.audioProgress >= 0.99 && !guidedAudio.isPlaying) {
      saveSession(
        suggestion.suggested_pattern,
        Math.floor(guidedAudio.audioDuration),
        true,
        suggestion.emotion
      );
    }
  }, [guidedAudio.audioProgress, guidedAudio.isPlaying, guidedAudio.audioDuration, suggestion, saveSession]);

  // Breathe select
  const handlePatternSelect = useCallback(
    (key) => {
      if (breathing.isRunning) return;
      if (selectedBreath === key) {
        setSelectedBreath(null);
        return;
      }
      setSelectedBreath(key);
      breathing.handlePatternChange(key);
    },
    [selectedBreath, breathing]
  );

  // Breathe play/pause
  const handleBreatheToggle = useCallback(() => {
    if (!selectedBreath) return;
    if (breathing.isRunning && breathing.sessionSecs > 0) {
      saveSession(selectedBreath, breathing.sessionSecs, false);
    }
    breathing.setIsRunning((r) => !r);
  }, [selectedBreath, breathing, saveSession]);

  // Breathe reset
  const handleBreatheReset = useCallback(() => {
    if (breathing.sessionSecs > 0) {
      saveSession(selectedBreath, breathing.sessionSecs, false);
    }
    breathing.handleReset();
    setSelectedBreath(null);
  }, [breathing, selectedBreath, saveSession]);

  // Clear errors
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const insightLabel = activeTab === "guided" ? "Session Insight" : "Today's Insight";
  const insightText =
    activeTab === "guided"
      ? suggestion?.insight || "Serenity will craft a session from your journal & emotions."
      : suggestion?.insight || "Select a breathing pattern and begin your session.";

  const breathHueIndex =
    selectedBreath !== null ? BREATHWORK_KEYS.indexOf(selectedBreath) : -1;

  const isOrbActive =
    activeTab === "guided" ? guidedAudio.isPlaying : breathing.isRunning;

  const tagline =
    activeTab === "guided"
      ? suggestion
        ? `${PATTERN_LABELS[suggestion.suggested_pattern] || "Session"} — tailored for you.`
        : "Serenity will craft a session from your journal & emotions."
      : selectedBreath
        ? `${PATTERN_LABELS[selectedBreath]} — find your rhythm.`
        : "Choose a technique and let your breath lead.";

  return (
    <div className={styles.app}>
      {/* Atmospheric layers */}
      <div className={styles.nebula1} />
      <div className={styles.nebula2} />
      <div className={styles.nebula3} />
      <div className={styles.starField} />
      <div className={styles.vignette} />

      <div className={styles.particles}>
        {[...Array(16)].map((_, i) => (
          <span key={i} className={`${styles.particle} ${styles[`p${i + 1}`]}`} />
        ))}
      </div>

      {/* Tab Toggle */}
      <div className={styles.tabToggle}>
        <button
          className={`${styles.tabBtn} ${activeTab === "guided" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("guided")}
        >
          {activeTab === "guided" && <span className={styles.tabDot} />}
          Guided
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "breathe" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("breathe")}
        >
          {activeTab === "breathe" && <span className={styles.tabDot} />}
          Breathe
        </button>
      </div>

      {/* ── Guided Tab ── */}
      <div className={`${styles.tabContent} ${activeTab === "guided" ? styles.tabContentVisible : ""}`}>
        <div className={styles.gridWrapper}>
          <div className={styles.gridContainer}>
            {/* Left column — spacer */}
            <div className={styles.column}>
              <button className={`${styles.gridButton} ${styles.hidden}`}>_</button>
              <button className={`${styles.gridButton} ${styles.hidden}`}>_</button>
              <button className={`${styles.gridButton} ${styles.hidden}`}>_</button>
            </div>

            {/* Right column */}
            <div className={styles.column}>
              <button
                className={`${styles.gridButton} ${styles.moonlightRight} ${styles.playBtn}`}
                onClick={handleGuidedToggle}
                disabled={!suggestion}
                style={!suggestion ? { opacity: 0.3, cursor: "default" } : {}}
              >
                <span className={styles.playIcon}>{guidedAudio.isPlaying ? "⏸" : "▶"}</span>
                {guidedAudio.isPlaying ? "Pause" : "Play"}
              </button>

              <button
                className={`${styles.gridButton} ${styles.moonlightRight} ${styles.craftBtn} ${generating ? styles.loading : ""}`}
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? "Crafting..." : suggestion ? "Regenerate" : "Craft Session"}
              </button>

              <button
                className={`${styles.gridButton} ${styles.ghostBtn}`}
                onClick={handleGuidedReset}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Orbital ring */}
          <div className={`${styles.orbRing} ${isOrbActive ? styles.orbRingActive : ""}`}>
            <span className={`${styles.moon} ${styles.moon1} ${isOrbActive ? styles.moonActive : ""}`} />
            <span className={`${styles.moon} ${styles.moon2} ${isOrbActive ? styles.moonActive : ""}`} />
            <span className={`${styles.moon} ${styles.moon3} ${isOrbActive ? styles.moonActive : ""}`} />
          </div>

          {/* Orb */}
          <div
            className={`${styles.orb} ${guidedAudio.isPlaying ? styles.orbBreathing : ""} ${guidedAudio.isPlaying ? styles.orbSway : ""}`}
          />
          <div className={styles.orbReflection} />

          {/* Orb center */}
          <div className={styles.orbCenter} onClick={handleGuidedToggle}>
            {!suggestion && !generating && <span className={styles.orbHint}>begin</span>}
            {generating && <span className={styles.orbHint}>crafting...</span>}
            {suggestion && !generating && (
              <span className={styles.orbHint}>
                {guidedAudio.isPlaying ? "pause" : "play"}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {suggestion && (
            <div className={styles.progressWrap}>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${guidedAudio.audioProgress * 100}%` }}
                />
              </div>
              <span className={styles.progressTime}>
                {formatTime(Math.floor(guidedAudio.audioProgress * guidedAudio.audioDuration))}
                {" / "}
                {formatTime(Math.floor(guidedAudio.audioDuration))}
              </span>
            </div>
          )}

          {/* Insight Card (crescent — preserved) */}
          <div className={styles.insightBox}>
            <div className={styles.insightContent}>
              <span className={styles.insightLabel}>{insightLabel}</span>
              {suggestion && (
                <div className={styles.insightMeta}>
                  <span
                    className={styles.emotionPill}
                    style={{
                      background: EMOTION_COLORS[suggestion.emotion] || EMOTION_COLORS.neutral,
                      boxShadow: `0 0 10px ${EMOTION_GLOW[suggestion.emotion] || EMOTION_GLOW.neutral}`,
                    }}
                  >
                    {suggestion.emotion}
                  </span>
                  <span className={styles.patternLine}>
                    {PATTERN_LABELS[suggestion.suggested_pattern]}
                  </span>
                </div>
              )}
              <p className={styles.insightText}>{insightText}</p>
            </div>
            <div className={styles.insightOverlay} />
          </div>
        </div>

        {/* Track Library */}
        {TRACKS.length > 0 && (
          <div className={styles.trackShelf}>
            {TRACKS.map((track) => {
              const isActive = activeTrackId === track.id;
              const isPlaying = isActive && guidedAudio.isPlaying;
              return (
                <div
                  key={track.id}
                  className={`${styles.trackCard} ${isActive ? styles.trackCardActive : ""}`}
                  style={
                    isActive
                      ? { boxShadow: `0 0 28px ${EMOTION_GLOW[track.emotion] || EMOTION_GLOW.neutral}, 0 4px 24px rgba(0,0,0,0.5)` }
                      : undefined
                  }
                  onClick={() => handleTrackSelect(track)}
                >
                  <span className={styles.trackEmotion}>{track.label}</span>
                  <span className={styles.trackDuration}>{track.duration}</span>
                  <div className={styles.waveform}>
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`${styles.waveBar} ${isPlaying ? styles.waveBarActive : ""}`}
                        style={{ animationDelay: `${i * 0.13}s` }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Breathe Tab ── */}
      <div className={`${styles.tabContent} ${activeTab === "breathe" ? styles.tabContentVisible : ""}`}>
        <div className={styles.gridWrapper}>
          <div className={styles.gridContainer}>
            <div className={styles.column} />

            <div className={styles.column}>
              <button className={`${styles.gridButton} ${styles.moonlightRight} ${styles.labelOnly}`}>
                {suggestion?.suggested_pattern ? "Serenity's Pick" : "Techniques"}
              </button>

              {BREATHWORK_KEYS.map((key, i) => (
                <button
                  key={key}
                  className={`${styles.gridButton} ${styles.moonlightRight} ${styles.breathworkBtn} ${
                    selectedBreath === key ? styles.breathworkBtnSelected : ""
                  }`}
                  style={{ animationDelay: `${i * 0.07}s` }}
                  onClick={() => handlePatternSelect(key)}
                >
                  <span className={styles.patternName}>
                    {PATTERN_LABELS[key]}
                    {suggestion?.suggested_pattern === key ? " ✦" : ""}
                  </span>
                  <span
                    className={`${styles.patternTiming} ${
                      selectedBreath === key ? styles.patternTimingSelected : ""
                    }`}
                  >
                    {PATTERN_TIMING[key]}
                  </span>
                </button>
              ))}

              <div className={styles.columnGap} />

              <button
                className={`${styles.gridButton} ${styles.moonlightRight} ${styles.playBtn}`}
                onClick={handleBreatheToggle}
                disabled={!selectedBreath}
                style={!selectedBreath ? { opacity: 0.3, cursor: "default" } : {}}
              >
                <span className={styles.playIcon}>{breathing.isRunning ? "⏸" : "▶"}</span>
                {breathing.isRunning ? "Pause" : "Play"}
              </button>

              <button className={`${styles.gridButton} ${styles.ghostBtn}`} onClick={handleBreatheReset}>
                Reset
              </button>
            </div>
          </div>

          {/* Orbital ring */}
          <div className={`${styles.orbRing} ${isOrbActive ? styles.orbRingActive : ""}`}>
            <span className={`${styles.moon} ${styles.moon1} ${isOrbActive ? styles.moonActive : ""}`} />
            <span className={`${styles.moon} ${styles.moon2} ${isOrbActive ? styles.moonActive : ""}`} />
            <span className={`${styles.moon} ${styles.moon3} ${isOrbActive ? styles.moonActive : ""}`} />
          </div>

          {/* Orb */}
          <div
            className={`${styles.orb} ${breathing.isRunning ? styles.orbBreathing : ""} ${
              breathHueIndex >= 0 ? styles[`orbHue${breathHueIndex}`] : ""
            }`}
          />
          <div className={styles.orbReflection} />

          {/* Orb center */}
          <div className={styles.orbCenter} onClick={handleBreatheToggle}>
            {!breathing.isRunning && !selectedBreath && (
              <span className={styles.orbHint}>tap</span>
            )}
            {!breathing.isRunning && selectedBreath && (
              <span className={styles.orbHint}>ready</span>
            )}
            {breathing.isRunning && (
              <>
                <span className={styles.phaseLabel}>{breathing.currentLabel}</span>
                <span className={styles.countdown}>{breathing.countdown}</span>
                <span className={styles.sessionTime}>{formatTime(breathing.sessionSecs)}</span>
              </>
            )}
          </div>

          {/* Insight Card (crescent — preserved) */}
          <div className={styles.insightBox}>
            <div className={styles.insightContent}>
              <span className={styles.insightLabel}>Today's Insight</span>
              <p className={styles.insightText}>
                {suggestion?.insight || "Select a breathing pattern and begin your session."}
              </p>
            </div>
            <div className={styles.insightOverlay} />
          </div>
        </div>
      </div>

      {/* Tagline */}
      <p
        className={`${styles.tagline} ${isDashboardHovered || isDashboardOpen ? styles.hidden : ""}`}
      >
        {tagline}
      </p>

      {/* Error toast */}
      {error && <div className={styles.errorToast}>{error}</div>}

      {/* Cinematic overlay */}
      <div
        className={`${styles.cinematicOverlay} ${isDashboardOpen ? styles.cinematicOpen : ""}`}
        onClick={() => isDashboardOpen && setIsDashboardOpen(false)}
      />

      {/* Zenith trigger */}
      <div
        className={`${styles.zenithTriggerArea} ${isDashboardOpen ? styles.hidden : ""}`}
        onMouseEnter={() => setIsDashboardHovered(true)}
        onMouseLeave={() => setIsDashboardHovered(false)}
      >
        <button
          className={styles.zenithButton}
          onClick={() => {
            setIsDashboardHovered(false);
            setIsDashboardOpen(true);
          }}
        >
          <span className={styles.zenithIcon}>✦</span>
          <span className={styles.zenithLabel}>Insights</span>
        </button>

        <div
          className={`${styles.sneakPeekCard} ${isDashboardHovered ? styles.sneakPeekVisible : ""}`}
          onClick={() => {
            setIsDashboardHovered(false);
            setIsDashboardOpen(true);
          }}
        >
          <div className={styles.sneakPeekHeader}>
            <span className={styles.sneakPeekTitle}>Your Journey</span>
          </div>
          <div className={styles.sneakPeekBody}>
            <div className={styles.sneakPeekStat}>
              <span className={styles.sneakPeekValue}>{dashboardStats?.total_minutes || 0}</span>
              <span className={styles.sneakPeekLabel}>Mins</span>
            </div>
            <div className={styles.sneakPeekStat}>
              <span className={styles.sneakPeekValue}>{dashboardStats?.session_count || 0}</span>
              <span className={styles.sneakPeekLabel}>Sessions</span>
            </div>
            <div className={styles.sneakPeekStat}>
              <span className={styles.sneakPeekValue}>{streak}</span>
              <span className={styles.sneakPeekLabel}>Streak</span>
            </div>
          </div>
          <div className={styles.sneakPeekHint}>Click to expand full matrix</div>
        </div>
      </div>

      {/* ── Zenith Dashboard ── */}
      <div className={`${styles.zenithDashboard} ${isDashboardOpen ? styles.zenithDashboardOpen : ""}`}>
        {isDashboardOpen && (
          <div className={styles.dashboardContent}>
            <button className={styles.closeZenith} onClick={() => setIsDashboardOpen(false)}>
              <span className={styles.closeIcon}>✕</span>
            </button>

            {/* Hero insight */}
            <div className={styles.dashboardTopSection}>
              <h2 className={styles.whisperingInsight}>
                {dashboardStats?.insight || "Every mindful moment is a step toward clarity."}
              </h2>
            </div>

            {/* 4 Stat Cards */}
            <div className={styles.statsCards}>
              {/* Total Minutes */}
              <div className={styles.statCard}>
                <span className={styles.statCardValue}>
                  {dashboardStats?.total_minutes ?? "—"}
                </span>
                <span className={styles.statCardLabel}>Total Minutes</span>
                <svg className={styles.arcSvg} viewBox="0 0 60 60">
                  <circle
                    cx="30" cy="30" r="24"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="30" cy="30" r="24"
                    fill="none"
                    stroke="rgba(180,160,220,0.5)"
                    strokeWidth="3"
                    strokeDasharray={`${Math.min((dashboardStats?.total_minutes || 0) / 1000, 1) * 150.8} 150.8`}
                    strokeLinecap="round"
                    transform="rotate(-90 30 30)"
                  />
                </svg>
              </div>

              {/* Sessions + sparkline */}
              <div className={styles.statCard}>
                <span className={styles.statCardValue}>
                  {dashboardStats?.session_count ?? "—"}
                </span>
                <span className={styles.statCardLabel}>Sessions</span>
                <div className={styles.sparkline}>
                  {chartDays.map((d, i) => (
                    <div
                      key={i}
                      className={styles.sparkBar}
                      style={{ height: `${Math.max((d.dayMins / maxMins) * 28, 2)}px` }}
                    />
                  ))}
                </div>
              </div>

              {/* Top Pattern */}
              <div className={styles.statCard}>
                <span className={`${styles.statCardValue} ${styles.statCardValueSm}`}>
                  {PATTERN_LABELS[dashboardStats?.top_pattern] || "—"}
                </span>
                <span className={styles.statCardLabel}>Top Pattern</span>
                {dashboardStats?.top_pattern && (
                  <span className={styles.statCardSub}>
                    {PATTERN_TIMING[dashboardStats.top_pattern]}
                  </span>
                )}
              </div>

              {/* Streak */}
              <div className={styles.statCard}>
                <span className={styles.statCardValue}>{streak}</span>
                <span className={styles.statCardLabel}>Day Streak</span>
                <span className={styles.streakGlyph}>{streak > 0 ? "✦" : "○"}</span>
              </div>
            </div>

            {/* 7-Day Bar Chart */}
            <div className={styles.sessionChart}>
              <h3 className={styles.chartTitle}>Last 7 Days</h3>
              <div className={styles.chartBars}>
                {chartDays.map((d, i) => {
                  const hueIdx = d.pattern ? BREATHWORK_KEYS.indexOf(d.pattern) : -1;
                  return (
                    <div key={i} className={styles.chartBarWrap}>
                      <div
                        className={`${styles.chartBar} ${hueIdx >= 0 ? styles[`orbHue${hueIdx}`] : ""}`}
                        style={{ height: `${Math.max((d.dayMins / maxMins) * 80, 4)}px` }}
                        title={`${d.dayMins}min${d.pattern ? ` · ${PATTERN_LABELS[d.pattern]}` : ""}`}
                      />
                      <span className={styles.chartLabel}>{d.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mindful Matrix */}
            <div className={styles.mindfulMatrixContainer}>
              <h3 className={styles.matrixTitle}>The Mindful Matrix</h3>
              <div className={styles.matrixScrollWrapper}>
                <div className={styles.matrixGrid}>
                  {(() => {
                    const daysToRender = 35;
                    const today = new Date();
                    const cells = [];
                    for (let i = daysToRender - 1; i >= 0; i--) {
                      const d = new Date(today);
                      d.setDate(d.getDate() - i);
                      const dateStr = d.toISOString().split("T")[0];
                      const data = dashboardStats?.history_dict?.[dateStr];
                      const hueIdx = data ? BREATHWORK_KEYS.indexOf(data.pattern) : -1;
                      const intensity = data ? Math.min(data.duration / 600, 1) : 0;
                      cells.push(
                        <div
                          key={dateStr}
                          className={`${styles.matrixCell} ${data ? styles.matrixCellActive : ""} ${
                            hueIdx >= 0 ? styles[`orbHue${hueIdx}`] : ""
                          }`}
                          style={data ? { opacity: 0.35 + intensity * 0.65 } : {}}
                          onMouseEnter={() => setHoveredCell({ dateStr, data })}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {hoveredCell?.dateStr === dateStr && (
                            <div className={styles.matrixTooltip}>
                              {dateStr}
                              {data
                                ? ` · ${Math.floor(data.duration / 60)}min · ${PATTERN_LABELS[data.pattern]}`
                                : " · Rest"}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return cells;
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Meditate;
