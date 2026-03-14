import { useState, useEffect, useCallback, useRef } from "react";
import styles from "./Meditate.module.css";
import { getMeditationSuggestion } from "../services/api";

const PATTERNS = {
  box:  { name: "Box",   phases: [4, 4, 4, 4], labels: ["Inhale", "Hold", "Exhale", "Hold"] },
  calm: { name: "4-7-8", phases: [4, 7, 8, 0], labels: ["Inhale", "Hold", "Exhale", ""] },
  deep: { name: "Deep",  phases: [5, 5, 0, 0], labels: ["Inhale", "Exhale", "", ""] },
};

const PHASE_SCALE = { Inhale: 1.48, Hold: null, Exhale: 1.0 };
const PHASE_COLOR = {
  Inhale: "rgba(212, 167, 116, 0.55)",
  Hold:   "rgba(110, 140, 215, 0.50)",
  Exhale: "rgba(90, 175, 155, 0.45)",
};

// Placeholder paths; replace with real files when ready
const TRACK_MAP = {
  fear:    "/audio/meditations/fear.mp3",
  sadness: "/audio/meditations/fear.mp3",
  anger:   "/audio/meditations/fear.mp3",
  joy:     "/audio/meditations/fear.mp3",
  neutral: "/audio/meditations/fear.mp3",
  morning: "/audio/meditations/fear.mp3",
  night:   "/audio/meditations/fear.mp3",
};

function getTrackUrl(emotion) {
  const h = new Date().getHours();
  if ((emotion === "neutral" || emotion === "joy") && h >= 5 && h < 11)
    return TRACK_MAP.morning;
  if ((emotion === "neutral" || emotion === "joy") && (h >= 22 || h < 4))
    return TRACK_MAP.night;
  return TRACK_MAP[emotion] ?? TRACK_MAP.neutral;
}

const GUIDED_COLOR_IDLE    = "rgba(110, 140, 215, 0.45)";
const GUIDED_COLOR_PLAYING = "rgba(90, 175, 155, 0.50)";

function playBreathingTone(label) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx  = new Ctx();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    if (label === "Inhale") {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(330, ctx.currentTime + 1.5);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.3);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.connect(gain); osc.start(); osc.stop(ctx.currentTime + 1.5);
    } else if (label === "Hold") {
      [396, 402].forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = "sine"; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.022, ctx.currentTime + 0.4);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
        osc.connect(gain); osc.start(); osc.stop(ctx.currentTime + 1.2);
      });
    } else if (label === "Exhale") {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 1.5);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
      osc.connect(gain); osc.start(); osc.stop(ctx.currentTime + 1.5);
    }
    setTimeout(() => ctx.close(), 2200);
  } catch { /* no audio */ }
}

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function Meditate() {
  const [activeTab, setActiveTab] = useState("guided");

  const [suggestion,    setSuggestion]    = useState(null);
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef(null);
  const backgroundMediRef = useRef(null);
  const backgroundBreathRef = useRef(null);

  const [patternKey,   setPatternKey]   = useState("box");
  const [isRunning,    setIsRunning]    = useState(false);
  const [phaseIndex,   setPhaseIndex]   = useState(0);
  const [countdown,    setCountdown]    = useState(PATTERNS.box.phases[0]);
  const [sessionSecs,  setSessionSecs]  = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [orbScale,     setOrbScale]     = useState(1.0);
  const phaseIndexRef = useRef(0);

  const pattern         = PATTERNS[patternKey];
  const currentLabel    = pattern.labels[phaseIndex];
  const currentDuration = pattern.phases[phaseIndex];
  const breatheOrbColor = PHASE_COLOR[currentLabel] || PHASE_COLOR.Hold;

  const guidedOrbColor = isPlaying ? GUIDED_COLOR_PLAYING : GUIDED_COLOR_IDLE;
  const activeOrbColor = activeTab === "guided" ? guidedOrbColor : breatheOrbColor;

  useEffect(() => {
    const medi = new Audio("/audio/meditations/medi.mp3");
    medi.loop = true;
    medi.volume = 0.22;
    medi.preload = "auto";
    backgroundMediRef.current = medi;

    const breath = new Audio("/audio/meditations/Breath.mp3");
    breath.loop = true;
    breath.volume = 0.22;
    breath.preload = "auto";
    backgroundBreathRef.current = breath;

    return () => {
      medi.pause();
      breath.pause();
      backgroundMediRef.current = null;
      backgroundBreathRef.current = null;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const medi = backgroundMediRef.current;
    const breath = backgroundBreathRef.current;
    if (!medi || !breath) return;
    if (activeTab === "guided") {
      breath.pause();
      breath.currentTime = 0;
      medi.play().catch(() => {});
    } else {
      medi.pause();
      medi.currentTime = 0;
      breath.play().catch(() => {});
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "guided" && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [activeTab]);

  const handleGenerate = async () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioDuration(0);
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const data = await getMeditationSuggestion();
      setSuggestion(data);
      const url = getTrackUrl(data.emotion || "neutral");
      const audio = new Audio(url);
      audio.preload = "auto";
      audio.ontimeupdate  = () => setAudioProgress(audio.duration ? audio.currentTime / audio.duration : 0);
      audio.onloadedmetadata = () => setAudioDuration(audio.duration);
      audio.onended = () => { setIsPlaying(false); setAudioProgress(0); };
      audio.onerror = () => { setIsPlaying(false); };
      audioRef.current = audio;
    } catch {
      setGenerateError("Couldn't load your session. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOrbClick = () => {
    if (activeTab === "guided") {
      if (!suggestion) { handleGenerate(); return; }
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    } else {
      setIsRunning((r) => !r);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setAudioProgress(0);
  };

  const handleApplyAISuggestion = () => {
    if (suggestion?.suggested_pattern) {
      handlePatternChange(suggestion.suggested_pattern);
      setActiveTab("breathe");
    }
  };

  useEffect(() => {
    const scale = PHASE_SCALE[currentLabel];
    if (scale !== null && scale !== undefined) setOrbScale(scale);
  }, [phaseIndex, currentLabel]);

  useEffect(() => {
    if (!isRunning || !audioEnabled) return;
    playBreathingTone(currentLabel);
  }, [phaseIndex, isRunning, audioEnabled, currentLabel]);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setSessionSecs((s) => s + 1);
      setCountdown((c) => {
        if (c <= 1) {
          setPhaseIndex((prev) => {
            const phases = PATTERNS[patternKey].phases;
            let next = (prev + 1) % phases.length;
            while (phases[next] === 0 && next !== prev) next = (next + 1) % phases.length;
            return next;
          });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, patternKey]);

  useEffect(() => {
    if (phaseIndexRef.current === phaseIndex) return;
    phaseIndexRef.current = phaseIndex;
    const dur = PATTERNS[patternKey].phases[phaseIndex];
    setCountdown(dur > 0 ? dur : PATTERNS[patternKey].phases[0]);
  }, [phaseIndex, patternKey]);

  const handlePatternChange = (key) => {
    setIsRunning(false);
    setPatternKey(key);
    setPhaseIndex(0);
    phaseIndexRef.current = 0;
    setCountdown(PATTERNS[key].phases[0]);
    setSessionSecs(0);
    setOrbScale(1.0);
  };

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setPhaseIndex(0);
    phaseIndexRef.current = 0;
    setCountdown(PATTERNS[patternKey].phases[0]);
    setSessionSecs(0);
    setOrbScale(1.0);
  }, [patternKey]);

  const orbTransition =
    activeTab === "guided"
      ? "transform 4s ease-in-out"
      : currentLabel === "Inhale" || currentLabel === "Exhale"
      ? `transform ${currentDuration}s ease-in-out`
      : "transform 0.4s ease";

  const guidedOrbScale = isPlaying ? null : 1.0;
  const activeOrbScale = activeTab === "guided"
    ? (isPlaying ? null : 1.0)
    : orbScale;

  return (
    <div className={styles.container} style={{ "--phase-color": activeOrbColor }}>
      <div className={styles.backgroundImage} />
      <div className={styles.overlay} />
      <div
        className={styles.phaseAmbient}
        style={{ background: `radial-gradient(circle at 50% 50%, ${activeOrbColor} 0%, transparent 65%)` }}
      />

      <div className={`${styles.tabRow} ${styles.revealStagger1}`}>
        <button
          className={`${styles.tab} ${activeTab === "guided" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("guided")}
        >
          Guided
        </button>
        <button
          className={`${styles.tab} ${activeTab === "breathe" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("breathe")}
        >
          Breathe
        </button>
      </div>

      {activeTab === "guided" && (
        <div className={styles.tabContent}>
          <div className={`${styles.orbArea} ${styles.revealStagger2}`}>
            <div
              className={styles.flowContainer}
              onClick={handleOrbClick}
              title={!suggestion ? "Generate session" : isPlaying ? "Pause" : "Play"}
            >
              <div className={styles.flowRing} />
              <div className={styles.auroraRing} />
              <div className={styles.textureRing} />
              <div className={styles.staticGlow} />
              <div className={styles.coreGlow} />

              <div
                className={`${styles.breathingOrb} ${isPlaying ? styles.guidedOrbPlaying : ""}`}
                style={
                  isPlaying
                    ? {
                        background: `radial-gradient(circle, ${guidedOrbColor} 0%, rgba(255,255,255,0.08) 60%, transparent 100%)`,
                        boxShadow: `0 0 40px 10px ${guidedOrbColor}`,
                      }
                    : {
                        transform: `scale(${activeOrbScale ?? 1})`,
                        transition: orbTransition,
                        background: `radial-gradient(circle, ${guidedOrbColor} 0%, rgba(255,255,255,0.08) 60%, transparent 100%)`,
                        boxShadow: `0 0 30px 6px ${guidedOrbColor}`,
                      }
                }
              />

              {isGenerating ? (
                <div className={styles.orbGeneratingRing} />
              ) : !suggestion ? (
                <div className={styles.orbTapHint}>generate</div>
              ) : isPlaying ? (
                <div className={styles.orbCentreIcon}>⏸</div>
              ) : (
                <div className={styles.orbCentreIcon}>▶</div>
              )}
            </div>

            {suggestion && audioDuration > 0 && (
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${audioProgress * 100}%` }}
                />
              </div>
            )}

            <div className={styles.phaseDisplay}>
              {isGenerating ? (
                <p className={styles.phaseLabel}>Crafting your session…</p>
              ) : suggestion ? (
                <>
                  <p className={`${styles.guidedInsight} ${isPlaying ? styles.guidedInsightFade : ""}`}>
                    {suggestion.insight}
                  </p>
                  {audioDuration > 0 && (
                    <p className={styles.sessionTimer}>
                      {formatTime(Math.round(audioProgress * audioDuration))} / {formatTime(Math.round(audioDuration))}
                    </p>
                  )}
                </>
              ) : (
                <p className={styles.guidedIdleText}>
                  Serenity will craft a session from your journal &amp; emotions.
                </p>
              )}
            </div>
          </div>

          <div className={`${styles.controlRow} ${styles.revealStagger3}`}>
            {!suggestion ? (
              <button className={styles.controlBtn} onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? "Loading…" : "Generate My Session"}
              </button>
            ) : (
              <>
                <button className={styles.controlBtn} onClick={handleOrbClick}>
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  className={`${styles.controlBtn} ${styles.controlBtnSecondary}`}
                  onClick={handleStop}
                >
                  Stop
                </button>
              </>
            )}
          </div>

          {suggestion && (
            <div className={`${styles.guidedSecondaryRow} ${styles.revealStagger4}`}>
              <button
                className={styles.regenerateBtn}
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                Regenerate
              </button>
              <button className={styles.applyPatternBtn} onClick={handleApplyAISuggestion}>
                ✦ {PATTERNS[suggestion.suggested_pattern]?.name} breathing →
              </button>
            </div>
          )}

          {generateError && (
            <p className={`${styles.generateError} ${styles.revealStagger5}`}>{generateError}</p>
          )}
        </div>
      )}

      {activeTab === "breathe" && (
        <div className={styles.tabContent}>
          <div className={`${styles.patternSelector} ${styles.revealStagger2}`}>
            {Object.entries(PATTERNS).map(([key, p]) => (
              <button
                key={key}
                className={`${styles.patternPill} ${patternKey === key ? styles.patternPillActive : ""}`}
                onClick={() => handlePatternChange(key)}
              >
                {p.name}
              </button>
            ))}
            {suggestion && (
              <button
                className={`${styles.patternPill} ${styles.patternPillAI} ${
                  patternKey === suggestion.suggested_pattern ? styles.patternPillActive : ""
                }`}
                onClick={() => handlePatternChange(suggestion.suggested_pattern)}
                title={`AI recommends ${PATTERNS[suggestion.suggested_pattern]?.name}`}
              >
                ✦ AI Pick
              </button>
            )}
          </div>

          <div className={`${styles.sessionRow} ${styles.revealStagger3}`}>
            <span className={styles.sessionTimer}>{formatTime(sessionSecs)}</span>
            <button
              className={`${styles.audioBtn} ${audioEnabled ? styles.audioBtnOn : ""}`}
              onClick={() => setAudioEnabled((a) => !a)}
              aria-label={audioEnabled ? "Disable audio cues" : "Enable audio cues"}
            >
              {audioEnabled ? "♪" : "♩"}
            </button>
          </div>

          <div className={`${styles.orbArea} ${styles.revealStagger4}`}>
            <div
              className={styles.flowContainer}
              onClick={() => setIsRunning((r) => !r)}
              title={isRunning ? "Tap to pause" : "Tap to begin"}
            >
              <div className={styles.flowRing} />
              <div className={styles.auroraRing} />
              <div className={styles.textureRing} />
              <div className={styles.staticGlow} />
              <div className={styles.coreGlow} />
              <div
                className={styles.breathingOrb}
                style={{
                  transform: `scale(${orbScale})`,
                  transition: orbTransition,
                  background: `radial-gradient(circle, ${breatheOrbColor} 0%, rgba(255,255,255,0.08) 60%, transparent 100%)`,
                  boxShadow: `0 0 40px 10px ${breatheOrbColor}`,
                }}
              />
              {!isRunning && <div className={styles.orbTapHint}>tap</div>}
            </div>

            <div className={styles.phaseDisplay}>
              <p className={styles.phaseLabel}>{currentLabel || "\u00A0"}</p>
              <p className={styles.phaseCountdown}>
                {isRunning && currentDuration > 0
                  ? countdown
                  : currentDuration > 0 ? currentDuration : ""}
              </p>
            </div>
          </div>

          <div className={`${styles.controlRow} ${styles.revealStagger5}`}>
            <button className={styles.controlBtn} onClick={() => setIsRunning((r) => !r)}>
              {isRunning ? "Pause" : "Begin"}
            </button>
            <button
              className={`${styles.controlBtn} ${styles.controlBtnSecondary}`}
              onClick={handleReset}
            >
              Reset
            </button>
          </div>

          {!suggestion && (
            <button
              className={styles.getAiHintBtn}
              onClick={() => { setActiveTab("guided"); handleGenerate(); }}
            >
              ✦ Get AI session &amp; breathing recommendation
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Meditate;
