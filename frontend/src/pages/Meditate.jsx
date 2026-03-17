import { useState, useEffect, useRef, useCallback } from "react";
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

const GUIDED_IDLE_TEXT =
  "Serenity will craft a session from your journal & emotions.";

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getTrackUrl() {
  return `/audio/meditations/fear.mp3`;
}

export function Meditate() {
  const [activeTab, setActiveTab] = useState("guided");
  const [suggestion, setSuggestion] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Zenith Dashboard State
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isDashboardHovered, setIsDashboardHovered] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);

  // Fetch stats when dashboard opens
  useEffect(() => {
    if (isDashboardOpen && !dashboardStats) {
      getMeditationStats()
        .then(setDashboardStats)
        .catch((err) => console.error("Failed to load stats:", err));
    }
  }, [isDashboardOpen, dashboardStats]);

  // Breathe tab
  const [selectedBreath, setSelectedBreath] = useState(null);
  const breathing = useBreathingTimer(selectedBreath || "box");

  // Guided tab audio
  const guidedAudio = useAudioPlayer();

  // Background ambient audio
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

  // Save session helper
  const saveSession = useCallback(async (pattern_used, duration_seconds, completed, emotion = null) => {
    if (duration_seconds < 10) return; // Don't log trivial sessions
    try {
      await logMeditationSession({
        pattern_used,
        duration_seconds,
        completed,
        emotion
      });
      // Invalidate stats so they refresh next time dashboard opens
      setDashboardStats(null);
    } catch (err) {
      console.error("Failed to save session", err);
    }
  }, []);

  // Generate meditation suggestion
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const data = await getMeditationSuggestion();
      setSuggestion(data);
      const url = getTrackUrl();
      guidedAudio.loadAudio(url);
    } catch (e) {
      setError(e.message || "Failed to generate session");
    } finally {
      setGenerating(false);
    }
  }, [guidedAudio]);

  // Guided play/pause
  const handleGuidedToggle = useCallback(() => {
    if (!suggestion) return;
    if (guidedAudio.isPlaying) {
      // User is pausing, let's log the accumulated session
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

  // If guided completes naturally
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


  // Breathe pattern select
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

  // Clear errors after 4s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  // Insight text for the crescent card
  const insightLabel = activeTab === "guided" ? "Session Insight" : "Today's Insight";
  const insightText =
    activeTab === "guided"
      ? suggestion?.insight || GUIDED_IDLE_TEXT
      : suggestion?.insight || "Select a breathing pattern and begin your session.";

  // Determine breathing pattern index for hue class
  const breathHueIndex =
    selectedBreath !== null ? BREATHWORK_KEYS.indexOf(selectedBreath) : -1;

  // Tagline
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
      <div className={styles.ambientGlow} />
      <div className={styles.vignette} />

      <div className={styles.particles}>
        {[...Array(7)].map((_, i) => (
          <span key={i} className={styles.particle} />
        ))}
      </div>

      {/* Tab Toggle */}
      <div className={styles.tabToggle}>
        <button
          className={`${styles.tabBtn} ${activeTab === "guided" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("guided")}
        >
          Guided
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "breathe" ? styles.tabBtnActive : ""}`}
          onClick={() => setActiveTab("breathe")}
        >
          Breathe
        </button>
      </div>

      {/* ── Guided Tab ── */}
      <div
        className={`${styles.tabContent} ${activeTab === "guided" ? styles.tabContentVisible : ""}`}
      >
        <div className={styles.gridWrapper}>
          <div className={styles.gridContainer}>
            {/* Left column — empty (insight card fills this space) */}
            <div className={styles.column}>
              <button className={`${styles.gridButton} ${styles.hidden}`}>_</button>
              <button className={`${styles.gridButton} ${styles.hidden}`}>_</button>
              <button className={`${styles.gridButton} ${styles.hidden}`}>_</button>
            </div>

            {/* Right column — Play/Pause, Generate, Reset */}
            <div className={styles.column}>
              <button
                className={`${styles.gridButton} ${styles.moonlightRight}`}
                onClick={handleGuidedToggle}
                disabled={!suggestion}
                style={!suggestion ? { opacity: 0.3, cursor: "default" } : {}}
              >
                {guidedAudio.isPlaying ? "Pause" : "Play"}
              </button>

              <button
                className={`${styles.gridButton} ${styles.moonlightRight} ${generating ? styles.loading : ""}`}
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating
                  ? "Generating..."
                  : suggestion
                    ? "Regenerate"
                    : "Generate"}
              </button>

              <button
                className={`${styles.gridButton} ${styles.moonlightRight}`}
                onClick={handleGuidedReset}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Orb */}
          <div
            className={`${styles.orb} ${guidedAudio.isPlaying ? styles.orbBreathing : ""}`}
          />
          <div className={styles.orbReflection} />

          {/* Orb center: hint or nothing while playing */}
          <div className={styles.orbCenter} onClick={handleGuidedToggle}>
            {!suggestion && !generating && (
              <span className={styles.orbHint}>begin</span>
            )}
            {generating && (
              <span className={styles.orbHint}>crafting...</span>
            )}
            {suggestion && !generating && (
              <span className={styles.orbHint}>
                {guidedAudio.isPlaying ? "pause" : "play"}
              </span>
            )}
          </div>

          {/* Progress bar for guided audio */}
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

          {/* Insight Card (crescent) */}
          <div className={styles.insightBox}>
            <div className={styles.insightContent}>
              <span className={styles.insightLabel}>{insightLabel}</span>
              <p className={styles.insightText}>{insightText}</p>
            </div>
            <div className={styles.insightOverlay} />
          </div>
        </div>
      </div>

      {/* ── Breathe Tab ── */}
      <div
        className={`${styles.tabContent} ${activeTab === "breathe" ? styles.tabContentVisible : ""}`}
      >
        <div className={styles.gridWrapper}>
          <div className={styles.gridContainer}>
            {/* Left column — empty */}
            <div className={styles.column} />

            {/* Right column — patterns + controls */}
            <div className={styles.column}>
              <button
                className={`${styles.gridButton} ${styles.moonlightRight} ${styles.labelOnly}`}
              >
                {suggestion?.suggested_pattern
                  ? "Serenity's Pick"
                  : "Techniques"}
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
                  {PATTERN_LABELS[key]}
                  {suggestion?.suggested_pattern === key ? " ✦" : ""}
                </button>
              ))}

              <div className={styles.columnGap} />

              <button
                className={`${styles.gridButton} ${styles.moonlightRight}`}
                onClick={handleBreatheToggle}
                disabled={!selectedBreath}
                style={!selectedBreath ? { opacity: 0.3, cursor: "default" } : {}}
              >
                {breathing.isRunning ? "Pause" : "Play"}
              </button>

              <button
                className={`${styles.gridButton} ${styles.moonlightRight}`}
                onClick={handleBreatheReset}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Orb */}
          <div
            className={`${styles.orb} ${breathing.isRunning ? styles.orbBreathing : ""} ${
              breathHueIndex >= 0 ? styles[`orbHue${breathHueIndex}`] : ""
            }`}
          />
          <div className={styles.orbReflection} />

          {/* Orb center: hint / phase label + countdown */}
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
                <span className={styles.sessionTime}>
                  {formatTime(breathing.sessionSecs)}
                </span>
              </>
            )}
          </div>

          {/* Insight Card (crescent) */}
          <div className={styles.insightBox}>
            <div className={styles.insightContent}>
              <span className={styles.insightLabel}>Today's Insight</span>
              <p className={styles.insightText}>
                {suggestion?.insight ||
                  "Select a breathing pattern and begin your session."}
              </p>
            </div>
            <div className={styles.insightOverlay} />
          </div>
        </div>
      </div>

      {/* Tagline */}
      <p className={`${styles.tagline} ${isDashboardHovered || isDashboardOpen ? styles.hidden : ""}`}>{tagline}</p>

      {/* Error toast */}
      {error && <div className={styles.errorToast}>{error}</div>}

      {/* ── Zenith Dashboard Overlay ── */}
      <div 
        className={`${styles.cinematicOverlay} ${isDashboardHovered ? styles.cinematicHover : ""} ${isDashboardOpen ? styles.cinematicOpen : ""}`} 
        onClick={() => isDashboardOpen && setIsDashboardOpen(false)}
      />

      <button 
        className={`${styles.zenithButton} ${isDashboardOpen ? styles.hidden : ""}`}
        onMouseEnter={() => setIsDashboardHovered(true)}
        onMouseLeave={() => setIsDashboardHovered(false)}
        onClick={() => {
          setIsDashboardHovered(false);
          setIsDashboardOpen(true);
        }}
      >
        <span className={styles.zenithIcon}>✦</span> 
        <span className={styles.zenithLabel}>Insights</span>
      </button>

      <div className={`${styles.zenithDashboard} ${isDashboardOpen ? styles.zenithDashboardOpen : ""}`}>
        {isDashboardOpen && (
          <div className={styles.dashboardContent}>
            <button className={styles.closeZenith} onClick={() => setIsDashboardOpen(false)}>×</button>

            <h2 className={styles.whisperingInsight}>
              {dashboardStats?.insight || "Every mindful moment is a step toward clarity."}
            </h2>

            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{dashboardStats?.total_minutes || 0}</span>
                <span className={styles.statLabel}>Total Vol. (mins)</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{dashboardStats?.session_count || 0}</span>
                <span className={styles.statLabel}>Sessions</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{PATTERN_LABELS[dashboardStats?.top_pattern] || "N/A"}</span>
                <span className={styles.statLabel}>Top Resonance</span>
              </div>
            </div>

            <div className={styles.auraLogContainer}>
              <h3 className={styles.auraLogTitle}>The Aura Log</h3>
              <div className={styles.auraGrid}>
                {dashboardStats?.history?.length > 0 ? (
                  dashboardStats.history.map((day, idx) => {
                     // Determine hue index from technique for the glow color
                     const hueIdx = BREATHWORK_KEYS.indexOf(day.pattern);
                     return (
                      <div 
                        key={idx} 
                        className={`${styles.auraDot} ${hueIdx >= 0 ? styles[`orbHue${hueIdx}`] : ""}`}
                        style={{ 
                          opacity: Math.min(0.3 + (day.duration / 600), 1),
                          transform: `scale(${Math.min(0.8 + (day.duration / 1200), 1.2)})`
                        }}
                        title={`${day.date}: ${Math.floor(day.duration/60)} mins (${day.pattern})`}
                      />
                     );
                  })
                ) : (
                  <div className={styles.auraEmpty}>No recent aura logs. Begin your journey.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default Meditate;

