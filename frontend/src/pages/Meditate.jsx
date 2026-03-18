import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import styles from "./Meditate.module.css";
import { useBreathingTimer, PATTERNS } from "../hooks/useBreathingTimer";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { useVoiceSession } from "../hooks/useVoiceSession";
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
  { id: "fear",     label: "Fear",     file: "/audio/meditations/fear.mp3", duration: "~8 min",  emotion: "fear",     comingSoon: false },
  { id: "sadness",  label: "Sadness",  file: "/audio/meditations/fear.mp3", duration: "~10 min", emotion: "sadness",  comingSoon: true  },
  { id: "anger",    label: "Anger",    file: "/audio/meditations/fear.mp3", duration: "~7 min",  emotion: "anger",    comingSoon: true  },
  { id: "joy",      label: "Joy",      file: "/audio/meditations/fear.mp3", duration: "~12 min", emotion: "joy",      comingSoon: true  },
  { id: "surprise", label: "Surprise", file: "/audio/meditations/fear.mp3", duration: "~6 min",  emotion: "surprise", comingSoon: true  },
  { id: "disgust",  label: "Disgust",  file: "/audio/meditations/fear.mp3", duration: "~9 min",  emotion: "disgust",  comingSoon: true  },
  { id: "neutral",  label: "Neutral",  file: "/audio/meditations/fear.mp3", duration: "~15 min", emotion: "neutral",  comingSoon: true  },
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

  // Carousel
  const [isCarouselOpen, setIsCarouselOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Completion popup
  const [showCompletion, setShowCompletion] = useState(false);

  // Breathe tab — must be before voice session
  const [selectedBreath, setSelectedBreath] = useState(null);
  const breathing = useBreathingTimer(selectedBreath || "box");

  // Guided audio — must be before voice session
  const guidedAudio = useAudioPlayer();

  // Voice session — declared after its dependencies
  const handleVoiceSessionStart = useCallback(({ track_id, pattern }) => {
    const track = TRACKS.find((t) => t.id === track_id) || TRACKS[0];
    setActiveTrackId(track.id);
    guidedAudio.loadAudio(track.file);
    setSelectedBreath(pattern);
    setTimeout(() => guidedAudio.togglePlayPause(), 400);
  }, [guidedAudio]);

  const handleBreathworkCue = useCallback(() => {}, []);

  const voice = useVoiceSession({
    onSessionStart: handleVoiceSessionStart,
    onBreathworkCue: handleBreathworkCue,
  });

  // Fetch stats whenever nulled (on load + after each session save)
  useEffect(() => {
    if (!dashboardStats) {
      getMeditationStats()
        .then(setDashboardStats)
        .catch((err) => console.error("Failed to load stats:", err));
    }
  }, [dashboardStats]);

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

  // Guided natural completion → show popup then auto-switch to breathe
  useEffect(() => {
    if (suggestion && guidedAudio.audioProgress >= 0.99 && !guidedAudio.isPlaying) {
      saveSession(
        suggestion.suggested_pattern,
        Math.floor(guidedAudio.audioDuration),
        true,
        suggestion.emotion
      );
      setShowCompletion(true);
      // Auto-switch to breathe tab after popup delay
      setTimeout(() => {
        setActiveTab("breathe");
      }, 3200);
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

          {/* Voice Mic Button — orbital position (right of orb) */}
          {!guidedAudio.isPlaying && (
            <button
              className={`${styles.voiceMicBtn} ${
                voice.isListening ? styles.voiceMicListening :
                voice.isSpeaking ? styles.voiceMicSpeaking :
                voice.isProcessing ? styles.voiceMicProcessing : ""
              }`}
              onClick={() => {
                if (voice.isActive) voice.stopConversation();
                else voice.startConversation();
              }}
              title={voice.isActive ? "Stop voice session" : "Talk to Serenity"}
            >
              {voice.isListening ? (
                <span className={styles.micWaves}>
                  {[...Array(3)].map((_, i) => (
                    <span key={i} className={styles.micWave} style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </span>
              ) : (
                <svg className={styles.micIcon} viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor" opacity="0.9"/>
                  <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                  <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <line x1="9" y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          )}

          {/* Voice transcript bubble */}
          {voice.transcript && (
            <div className={styles.voiceTranscript}>{voice.transcript}</div>
          )}

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

        {/* Library Trigger */}
        <button
          className={styles.libraryBtn}
          onClick={() => {
            setCarouselIndex(Math.max(0, TRACKS.findIndex((t) => t.id === activeTrackId)));
            setIsCarouselOpen(true);
          }}
        >
          <span className={styles.libraryBtnWaves}>
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className={`${styles.libraryBtnBar} ${guidedAudio.isPlaying ? styles.libraryBtnBarActive : ""}`}
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </span>
          <span className={styles.libraryBtnLabel}>
            {TRACKS.find((t) => t.id === activeTrackId)?.label || "Fear"}
          </span>
          <span className={styles.libraryBtnHint}>change session</span>
        </button>
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

          {/* Breathwork mic check-in */}
          {breathing.isRunning && (
            <button
              className={`${styles.breathMicBtn} ${
                voice.status === "breathwork_listening" ? styles.breathMicListening : ""
              }`}
              onClick={voice.breathworkCheckIn}
              title="Check in with Serenity"
            >
              <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                <rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor" opacity="0.8"/>
                <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          )}

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

      {/* ── Track Carousel ── */}
      {isCarouselOpen && (
        <div className={styles.carouselOverlay} onClick={() => setIsCarouselOpen(false)}>
          <div className={styles.carouselModal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.carouselClose} onClick={() => setIsCarouselOpen(false)}>✕</button>
            <p className={styles.carouselTitle}>Choose Your Session</p>
            <div className={styles.carouselStage}>
              <button
                className={styles.carouselNav}
                onClick={() => setCarouselIndex((i) => Math.max(0, i - 1))}
                disabled={carouselIndex === 0}
              >‹</button>
              <div className={styles.carouselTrack}>
                {TRACKS.map((track, i) => {
                  const offset = i - carouselIndex;
                  const absOff = Math.abs(offset);
                  if (absOff > 2) return null;
                  const isCenter = offset === 0;
                  return (
                    <div
                      key={track.id}
                      className={`${styles.carouselCard} ${isCenter ? styles.carouselCardCenter : ""}`}
                      style={{
                        transform: `rotateY(${offset * 42}deg) translateZ(${absOff === 0 ? 300 : absOff === 1 ? 200 : 80}px) scale(${isCenter ? 1 : absOff === 1 ? 0.82 : 0.65})`,
                        opacity: absOff === 0 ? 1 : absOff === 1 ? 0.65 : 0.3,
                        zIndex: 10 - absOff,
                      }}
                      onClick={() => {
                        if (!isCenter) { setCarouselIndex(i); return; }
                        if (!track.comingSoon) {
                          handleTrackSelect(track);
                          setIsCarouselOpen(false);
                        }
                      }}
                    >
                      <div
                        className={styles.carouselCardInner}
                        style={{
                          background: `linear-gradient(145deg, ${EMOTION_COLORS[track.emotion]}, rgba(14,12,22,0.8))`,
                          boxShadow: isCenter ? `0 0 60px ${EMOTION_GLOW[track.emotion]}, 0 20px 60px rgba(0,0,0,0.6)` : undefined,
                        }}
                      >
                        <span className={styles.carouselEmotion}>{track.label}</span>
                        <span className={styles.carouselDuration}>{track.duration}</span>
                        {track.comingSoon ? (
                          <span className={styles.comingSoonBadge}>coming soon</span>
                        ) : (
                          <>
                            <div className={styles.carouselWave}>
                              {[...Array(5)].map((_, wi) => (
                                <span
                                  key={wi}
                                  className={`${styles.waveBar} ${isCenter && activeTrackId === track.id && guidedAudio.isPlaying ? styles.waveBarActive : ""}`}
                                  style={{ animationDelay: `${wi * 0.13}s` }}
                                />
                              ))}
                            </div>
                            {isCenter && <span className={styles.carouselSelectHint}>tap to select</span>}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                className={styles.carouselNav}
                onClick={() => setCarouselIndex((i) => Math.min(TRACKS.length - 1, i + 1))}
                disabled={carouselIndex === TRACKS.length - 1}
              >›</button>
            </div>
            <div className={styles.carouselDots}>
              {TRACKS.map((_, i) => (
                <span
                  key={i}
                  className={`${styles.carouselDot} ${i === carouselIndex ? styles.carouselDotActive : ""}`}
                  onClick={() => setCarouselIndex(i)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Completion Popup ── */}
      {showCompletion && (
        <div className={styles.completionOverlay}>
          <div className={styles.completionCard}>
            <div className={styles.completionGlow} />
            <div className={styles.completionOrb} />
            <h2 className={styles.completionTitle}>Session Complete</h2>
            <p className={styles.completionText}>Your mind finds its stillness.</p>
            <button className={styles.completionBtn} onClick={() => setShowCompletion(false)}>
              Continue
            </button>
          </div>
        </div>
      )}

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
                        style={{ height: `${Math.max((d.dayMins / maxMins) * 120, 4)}px` }}
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
