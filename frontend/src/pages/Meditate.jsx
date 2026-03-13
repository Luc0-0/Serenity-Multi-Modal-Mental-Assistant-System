import { useState, useEffect, useCallback, useRef } from "react";
import styles from "./Meditate.module.css";
import { getMeditationSuggestion } from "../services/api";

const PATTERNS = {
  box: { name: "Box", phases: [4, 4, 4, 4], labels: ["Inhale", "Hold", "Exhale", "Hold"] },
  calm: { name: "4-7-8", phases: [4, 7, 8, 0], labels: ["Inhale", "Hold", "Exhale", ""] },
  deep: { name: "Deep", phases: [5, 5, 0, 0], labels: ["Inhale", "Exhale", "", ""] },
};

const PHASE_SCALE = { Inhale: 1.48, Hold: null, Exhale: 1.0 };

const PHASE_COLOR = {
  Inhale: "rgba(212, 167, 116, 0.55)",
  Hold: "rgba(110, 140, 215, 0.50)",
  Exhale: "rgba(90, 175, 155, 0.45)",
};

function playBreathingTone(label) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
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
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    } else if (label === "Hold") {
      // Gentle binaural-like double oscillator
      [396, 402].forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.022, ctx.currentTime + 0.4);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
        osc.connect(gain);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      });
    } else if (label === "Exhale") {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 1.5);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    }

    setTimeout(() => ctx.close(), 2200);
  } catch {
    // Audio unavailable
  }
}

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function Meditate() {
  const [activeTab, setActiveTab] = useState("guided");

  // ── Guided meditation state ─────────────────────────────────────────────
  const [suggestion, setSuggestion] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // ── Breathing state ─────────────────────────────────────────────────────
  const [patternKey, setPatternKey] = useState("box");
  const [isRunning, setIsRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [countdown, setCountdown] = useState(PATTERNS.box.phases[0]);
  const [sessionSecs, setSessionSecs] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [orbScale, setOrbScale] = useState(1.0);

  const pattern = PATTERNS[patternKey];
  const currentLabel = pattern.labels[phaseIndex];
  const currentDuration = pattern.phases[phaseIndex];
  const orbColor = PHASE_COLOR[currentLabel] || PHASE_COLOR.Hold;

  // Cancel speech on unmount / tab switch
  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  // ── Guided: generate ────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    try {
      const data = await getMeditationSuggestion();
      setSuggestion(data);
    } catch {
      setGenerateError("Couldn't generate a session right now. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Guided: TTS ─────────────────────────────────────────────────────────
  const handleSpeak = () => {
    if (!suggestion?.guided_script) return;

    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      return;
    }
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(suggestion.guided_script);
    utterance.rate = 0.78;
    utterance.pitch = 0.92;
    utterance.volume = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) =>
        ["Samantha", "Karen", "Moira", "Google UK English Female", "Microsoft Zira"].some((n) =>
          v.name.includes(n)
        )
      ) || voices.find((v) => v.lang.startsWith("en") && !v.name.toLowerCase().includes("male"));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => { setIsSpeaking(true); setIsPaused(false); };
    utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); };
    utterance.onerror = () => { setIsSpeaking(false); setIsPaused(false); };

    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const handleApplyAISuggestion = () => {
    if (suggestion?.suggested_pattern) {
      handlePatternChange(suggestion.suggested_pattern);
      setActiveTab("breathe");
    }
  };

  // ── Breathing logic ─────────────────────────────────────────────────────
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
            while (phases[next] === 0 && next !== prev) {
              next = (next + 1) % phases.length;
            }
            return next;
          });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, patternKey]);

  const phaseIndexRef = useRef(phaseIndex);
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
    currentLabel === "Inhale" || currentLabel === "Exhale"
      ? `transform ${currentDuration}s ease-in-out`
      : "transform 0.4s ease";

  return (
    <div className={styles.container} style={{ "--phase-color": orbColor }}>
      <div className={styles.backgroundImage} />
      <div className={styles.overlay} />
      <div
        className={styles.phaseAmbient}
        style={{ background: `radial-gradient(circle at 50% 50%, ${orbColor} 0%, transparent 65%)` }}
      />

      {/* ── Tab switcher ── */}
      <div className={styles.tabRow}>
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

      {/* ══════════════════════ GUIDED TAB ══════════════════════ */}
      {activeTab === "guided" && (
        <div className={styles.guidedPanel}>
          {!suggestion && !isGenerating && (
            <div className={styles.guidedEmpty}>
              <div className={styles.guidedEmptyOrb}>✦</div>
              <p className={styles.guidedEmptyTitle}>Your Personal Session</p>
              <p className={styles.guidedEmptyText}>
                Serenity reads your journal and emotions to craft a meditation
                that&apos;s just for you — then reads it aloud.
              </p>
              <button className={styles.generateBtn} onClick={handleGenerate}>
                Generate My Session
              </button>
              {generateError && <p className={styles.generateError}>{generateError}</p>}
            </div>
          )}

          {isGenerating && (
            <div className={styles.guidedLoading}>
              <div className={styles.loadingRing} />
              <p className={styles.loadingText}>Crafting your session…</p>
            </div>
          )}

          {suggestion && !isGenerating && (
            <div className={styles.guidedCard}>
              {/* Reason */}
              <p className={styles.guidedReason}>{suggestion.reason}</p>

              {/* AI breathing recommendation */}
              <div className={styles.aiSuggestionRow}>
                <span className={styles.aiSuggestionLabel}>
                  ✦ Recommended breathing:{" "}
                  <strong>{PATTERNS[suggestion.suggested_pattern]?.name}</strong>
                </span>
                <button className={styles.applyPatternBtn} onClick={handleApplyAISuggestion}>
                  Apply &amp; Breathe →
                </button>
              </div>

              {/* Script */}
              <div className={styles.scriptArea}>
                {suggestion.guided_script.split(/\n+/).map((para, i) =>
                  para.trim() ? (
                    <p key={i} className={styles.scriptPara}>
                      {para.trim()}
                    </p>
                  ) : null
                )}
              </div>

              {/* TTS controls */}
              <div className={styles.ttsRow}>
                <button
                  className={`${styles.ttsBtn} ${isSpeaking && !isPaused ? styles.ttsBtnActive : ""}`}
                  onClick={handleSpeak}
                >
                  {isSpeaking && !isPaused ? "⏸ Pause" : isPaused ? "▶ Resume" : "▶ Read Aloud"}
                </button>
                {(isSpeaking || isPaused) && (
                  <button className={`${styles.ttsBtn} ${styles.ttsBtnStop}`} onClick={handleStopSpeaking}>
                    ■ Stop
                  </button>
                )}
                <button className={styles.regenerateBtn} onClick={handleGenerate} disabled={isGenerating}>
                  Regenerate
                </button>
              </div>

              {isSpeaking && !isPaused && (
                <div className={styles.speakingWave}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ BREATHE TAB ══════════════════════ */}
      {activeTab === "breathe" && (
        <>
          {/* Pattern pills */}
          <div className={styles.patternSelector}>
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
                title={`AI recommends ${PATTERNS[suggestion.suggested_pattern]?.name} for your current state`}
              >
                ✦ AI Pick
              </button>
            )}
          </div>

          {/* Session row */}
          <div className={styles.sessionRow}>
            <span className={styles.sessionTimer}>{formatTime(sessionSecs)}</span>
            <button
              className={`${styles.audioBtn} ${audioEnabled ? styles.audioBtnOn : ""}`}
              onClick={() => setAudioEnabled((a) => !a)}
              aria-label={audioEnabled ? "Disable audio cues" : "Enable audio cues"}
            >
              {audioEnabled ? "♪" : "♩"}
            </button>
          </div>

          {/* Orb (tap to start/pause) */}
          <div className={styles.orbArea}>
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
                  background: `radial-gradient(circle, ${orbColor} 0%, rgba(255,255,255,0.08) 60%, transparent 100%)`,
                  boxShadow: `0 0 40px 10px ${orbColor}`,
                }}
              />
              {/* Tap hint when idle */}
              {!isRunning && (
                <div className={styles.orbTapHint}>tap</div>
              )}
            </div>

            <div className={styles.phaseDisplay}>
              <p className={styles.phaseLabel}>{currentLabel || "\u00A0"}</p>
              <p className={styles.phaseCountdown}>
                {isRunning && currentDuration > 0
                  ? countdown
                  : currentDuration > 0
                  ? currentDuration
                  : ""}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className={styles.controlRow}>
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

          {/* No suggestion yet: nudge */}
          {!suggestion && (
            <button
              className={styles.getAiHintBtn}
              onClick={() => { setActiveTab("guided"); handleGenerate(); }}
            >
              ✦ Get AI breathing recommendation
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default Meditate;
