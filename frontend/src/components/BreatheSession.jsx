import { useState, useEffect } from "react";
import styles from "./BreatheSession.module.css";
import { MeditationOrb } from "./MeditationOrb";
import { OrbButton } from "./OrbLayout";
import { useBreathingTimer } from "../hooks/useBreathingTimer";

const PATTERNS = {
  box:  { name: "Box" },
  calm: { name: "4-7-8" },
  deep: { name: "Deep" },
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
    /* no audio */
  }
}

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function BreatheSession({ suggestion, currentPattern, onPatternChange }) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const breathingTimer = useBreathingTimer(currentPattern);
  const {
    isRunning,
    setIsRunning,
    countdown,
    sessionSecs,
    orbScale,
    currentLabel,
    currentDuration,
    breatheOrbColor,
    pattern,
    handlePatternChange: changePattern,
    handleReset,
  } = breathingTimer;

  // Play tone on phase change
  useEffect(() => {
    if (!isRunning || !audioEnabled) return;
    playBreathingTone(currentLabel);
  }, [isRunning, audioEnabled, currentLabel]);

  // Sync with parent pattern change
  useEffect(() => {
    changePattern(currentPattern);
  }, [currentPattern]);

  const handlePatternSelect = (patternKey) => {
    changePattern(patternKey);
    onPatternChange(patternKey);
  };

  const orbTransition = 
    currentLabel === "Inhale" || currentLabel === "Exhale"
      ? `transform ${currentDuration}s ease-in-out`
      : "transform 0.4s ease";

  return (
    <div className={styles.breatheContent}>
      {/* Left - AI Insight */}
      {suggestion && (
        <div className={styles.leftInsight}>
          <div className={styles.insightBox}>
            <p className={styles.insightText}>{suggestion.insight}</p>
            <div className={styles.insightOverlay} />
          </div>
        </div>
      )}

      {/* Center Orb */}
      <div className={styles.orbWrapper}>
        <MeditationOrb
          color={breatheOrbColor}
          scale={orbScale}
          isRunning={isRunning}
          currentDuration={currentDuration}
          currentLabel={currentLabel}
          orbTransition={orbTransition}
          onClick={() => setIsRunning((r) => !r)}
          title={isRunning ? "Tap to pause" : "Tap to begin"}
        >
          {!isRunning && <div className={styles.orbTapHint}>tap</div>}
        </MeditationOrb>

        {/* Phase display */}
        <div className={styles.phaseDisplay}>
          <p className={styles.phaseLabel}>{currentLabel || "\u00A0"}</p>
          <p className={styles.phaseCountdown}>
            {isRunning && currentDuration > 0
              ? countdown
              : currentDuration > 0 ? currentDuration : ""}
          </p>
        </div>
      </div>

      {/* Right Top - Pattern Selector */}
      <OrbButton position="rightTop" className={styles.patternContainer}>
        <div className={styles.patternSelector}>
          {Object.entries(PATTERNS).map(([key, p]) => (
            <button
              key={key}
              className={`${styles.patternPill} ${currentPattern === key ? styles.patternActive : ""}`}
              onClick={() => handlePatternSelect(key)}
            >
              {p.name}
            </button>
          ))}
          {suggestion && (
            <button
              className={`${styles.patternPill} ${styles.patternAI} ${
                currentPattern === suggestion.suggested_pattern ? styles.patternActive : ""
              }`}
              onClick={() => handlePatternSelect(suggestion.suggested_pattern)}
            >
              AI Pick
            </button>
          )}
        </div>
      </OrbButton>

      {/* Right Mid - Session Timer & Audio Toggle */}
      <OrbButton position="rightTopBottom" className={styles.sessionContainer}>
        <div className={styles.sessionRow}>
          <span className={styles.sessionTimer}>{formatTime(sessionSecs)}</span>
          <button
            className={`${styles.audioBtn} ${audioEnabled ? styles.audioBtnOn : ""}`}
            onClick={() => setAudioEnabled((a) => !a)}
            title={audioEnabled ? "Disable audio cues" : "Enable audio cues"}
          >
            {audioEnabled ? "On" : "Off"}
          </button>
        </div>
      </OrbButton>

      {/* Right Bottom - Controls */}
      <OrbButton position="rightBottom" className={styles.controlContainer}>
        <div className={styles.controlButtons}>
          <button className={styles.controlBtn} onClick={() => setIsRunning((r) => !r)}>
            {isRunning ? "Pause" : "Begin"}
          </button>
          <button className={`${styles.controlBtn} ${styles.controlBtnSecondary}`} onClick={handleReset}>
            Reset
          </button>
        </div>
      </OrbButton>

      {/* Get AI hint button */}
      {!suggestion && (
        <button className={styles.getAiHintBtn}>
          Get AI session &amp; recommendation
        </button>
      )}
    </div>
  );
}
