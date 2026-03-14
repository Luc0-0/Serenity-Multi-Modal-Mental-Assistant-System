# Meditation Module - Complete Code Reference

---

## 1. Meditate.jsx
**Location:** `frontend/src/pages/Meditate.jsx`

```jsx
import { useState, useEffect, useRef } from "react";
import styles from "./Meditate.module.css";
import { GuidedSession } from "../components/GuidedSession";
import { BreatheSession } from "../components/BreatheSession";

export function Meditate() {
  const [activeTab, setActiveTab] = useState("guided");
  const [suggestion, setSuggestion] = useState(null);
  const [currentPattern, setCurrentPattern] = useState("box");
  const backgroundMediRef = useRef(null);
  const backgroundBreathRef = useRef(null);

  // Setup background audio on mount
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
    };
  }, []);

  // Manage background audio based on active tab
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

  const handleApplyPattern = (pattern) => {
    setCurrentPattern(pattern);
    setActiveTab("breathe");
  };

  return (
    <div
      className={styles.container}
      style={{
        "--phase-color": activeTab === "guided"
          ? "rgba(110, 140, 215, 0.45)"
          : "rgba(90, 175, 155, 0.45)",
      }}
    >
      <div className={styles.backgroundImage} />
      <div className={styles.overlay} />
      <div
        className={styles.phaseAmbient}
        style={{
          background:
            activeTab === "guided"
              ? "radial-gradient(circle at 50% 50%, rgba(110, 140, 215, 0.45) 0%, transparent 65%)"
              : "radial-gradient(circle at 50% 50%, rgba(90, 175, 155, 0.45) 0%, transparent 65%)",
        }}
      />

      {/* Neomorphic Tab Toggle */}
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

      {/* Tab Content */}
      {activeTab === "guided" && (
        <GuidedSession
          suggestion={suggestion}
          onSuggestionUpdate={setSuggestion}
          onApplyPattern={handleApplyPattern}
        />
      )}

      {activeTab === "breathe" && (
        <BreatheSession
          suggestion={suggestion}
          currentPattern={currentPattern}
          onPatternChange={setCurrentPattern}
        />
      )}
    </div>
  );
}

export default Meditate;
```

---

## 2. Meditate.module.css
**Location:** `frontend/src/pages/Meditate.module.css`

```css
/* Meditate page - Main layout and container */

/* Container & background */
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(2rem, 4vh, 3rem);
  min-height: 100dvh;
  box-sizing: border-box;
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  color: var(--color-text-primary);
  padding: clamp(1.5rem, 4vh, 2.5rem) 1rem;
}

.backgroundImage {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("/images/background2.png");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    ellipse 120% 100% at 50% 50%,
    rgba(0, 0, 0, 0.15) 0%,
    rgba(0, 0, 0, 0.75) 50%,
    rgba(0, 0, 0, 0.92) 100%
  );
  z-index: 1;
  pointer-events: none;
}

.phaseAmbient {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  transition: background 2.2s ease;
  opacity: 0.5;
}

/* Neomorphic Tab Toggle */
.tabRow {
  position: fixed;
  top: clamp(1rem, 3vh, 1.5rem);
  z-index: 100;
  display: flex;
  gap: 2px;
  background: rgba(15, 15, 18, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 3px;
  transition: all 0.3s ease;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3),
              0 1px 0 rgba(255, 255, 255, 0.08);
}

.tab {
  padding: 10px 24px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: rgba(230, 220, 195, 0.5);
  font-family: var(--font-family-sans);
  font-size: 0.78rem;
  font-variant-caps: small-caps;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.3s ease;
  outline: none;
  font-weight: 500;
}

.tab:hover {
  color: rgba(230, 220, 195, 0.7);
}

.tab:focus-visible {
  outline: 2px solid rgba(212, 175, 55, 0.4);
  outline-offset: -2px;
}

.tabActive {
  background: linear-gradient(135deg, 
    rgba(230, 220, 195, 0.08) 0%, 
    rgba(212, 175, 55, 0.06) 100%);
  color: rgba(230, 220, 195, 0.9);
  box-shadow: inset -1px -1px 2px rgba(0, 0, 0, 0.3),
              inset 1px 1px 2px rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(212, 175, 55, 0.15);
}

/* Animations */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulseCore {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.85;
    transform: scale(1.1);
  }
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .backgroundImage {
    opacity: 0.35;
  }

  .overlay {
    background: radial-gradient(
      ellipse 100% 100% at 50% 50%,
      rgba(0, 0, 0, 0.25) 0%,
      rgba(0, 0, 0, 0.88) 100%
    );
  }

  .container {
    padding: clamp(4rem, 12vh, 6rem) 1rem clamp(1rem, 3vh, 2rem);
  }

  .tabRow {
    padding: 2px;
  }

  .tab {
    padding: 8px 18px;
    font-size: 0.72rem;
  }
}
```

---

## 3. GuidedSession.jsx
**Location:** `frontend/src/components/GuidedSession.jsx`

```jsx
import { useState } from "react";
import styles from "./GuidedSession.module.css";
import { MeditationOrb } from "./MeditationOrb";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { getMeditationSuggestion } from "../services/api";

const PATTERNS = {
  box:  { name: "Box" },
  calm: { name: "4-7-8" },
  deep: { name: "Deep" },
};

const GUIDED_COLOR_IDLE = "rgba(110, 140, 215, 0.45)";
const GUIDED_COLOR_PLAYING = "rgba(90, 175, 155, 0.50)";

function getTrackUrl(emotion) {
  return "/audio/meditations/fear.mp3";
}

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function GuidedSession({ suggestion, onSuggestionUpdate, onApplyPattern }) {
  const {
    isPlaying,
    audioProgress,
    audioDuration,
    isMuted,
    loadAudio,
    togglePlayPause,
    toggleMute,
  } = useAudioPlayer();

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const data = await getMeditationSuggestion();
      onSuggestionUpdate(data);
      const url = getTrackUrl(data.emotion || "neutral");
      loadAudio(url);
    } catch {
      setGenerateError("Couldn't load your session. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const orbColor = isPlaying ? GUIDED_COLOR_PLAYING : GUIDED_COLOR_IDLE;

  const handleOrbClick = () => {
    if (!suggestion) {
      handleGenerate();
      return;
    }
    togglePlayPause();
  };

  return (
    <div className={styles.guidedGrid}>
      {/* Left - Generate button */}
      <div className={styles.leftCol}>
        <button
          className={styles.actionBtn}
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? "..." : suggestion ? "Regenerate" : "Generate"}
        </button>
      </div>

      {/* Center - Orb */}
      <div className={styles.centerCol}>
        <MeditationOrb
          color={orbColor}
          isPlaying={isPlaying}
          orbTransition={isPlaying ? "transform 0.4s ease" : "transform 6s ease-in-out"}
          onClick={handleOrbClick}
        >
          {isGenerating ? (
            <div className={styles.orbGeneratingRing} />
          ) : !suggestion ? (
            <div className={styles.orbTapHint}>generate</div>
          ) : isPlaying ? (
            <div className={styles.orbCentreIcon}>||</div>
          ) : (
            <div className={styles.orbCentreIcon}>▶</div>
          )}
        </MeditationOrb>

        {suggestion && (
          <div className={styles.infoDisplay}>
            <p className={styles.insight}>{suggestion.insight}</p>
            {audioDuration > 0 && (
              <>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${audioProgress * 100}%` }}
                  />
                </div>
                <p className={styles.timer}>
                  {formatTime(Math.round(audioProgress * audioDuration))} /{" "}
                  {formatTime(Math.round(audioDuration))}
                </p>
              </>
            )}
          </div>
        )}

        {isGenerating && (
          <div className={styles.infoDisplay}>
            <p className={styles.label}>Crafting your session…</p>
          </div>
        )}

        {!suggestion && !isGenerating && (
          <div className={styles.infoDisplay}>
            <p className={styles.idleText}>
              Serenity will craft a session from your journal &amp; emotions.
            </p>
          </div>
        )}
      </div>

      {/* Right top - Play button */}
      {suggestion && (
        <div className={styles.rightTopCol}>
          <button
            className={styles.controlBtn}
            onClick={togglePlayPause}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
        </div>
      )}

      {/* Right middle - Mute button */}
      {suggestion && (
        <div className={styles.rightMidCol}>
          <button
            className={`${styles.controlBtn} ${isMuted ? styles.btnMuted : ""}`}
            onClick={toggleMute}
          >
            {isMuted ? "Muted" : "Sound"}
          </button>
        </div>
      )}

      {/* Apply pattern button */}
      {suggestion && (
        <div className={styles.applySection}>
          <button
            className={styles.applyPatternBtn}
            onClick={() => onApplyPattern(suggestion.suggested_pattern)}
          >
            ✦ {PATTERNS[suggestion.suggested_pattern]?.name} breathing →
          </button>
        </div>
      )}

      {generateError && (
        <div className={styles.errorSection}>
          <p className={styles.errorMsg}>{generateError}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 4. GuidedSession.module.css
**Location:** `frontend/src/components/GuidedSession.module.css`

```css
/* GuidedSession - Grid with aggressive clipping */

.guidedGrid {
  display: grid;
  grid-template-columns: 80px 1fr 80px;
  grid-template-rows: auto auto auto;
  align-items: center;
  justify-items: center;
  gap: 0;
  width: 100%;
  max-width: 1000px;
  height: clamp(400px, 60vh, 600px);
  position: relative;
}

/* Left column - Generate button with aggressive right-side clip */
.leftCol {
  grid-column: 1;
  grid-row: 2;
  width: 100%;
  display: flex;
  justify-content: flex-end;
  padding-right: 4px;
  clip-path: polygon(0% 0%, 70% 0%, 70% 100%, 0% 100%);
  overflow: visible;
}

/* Center column - Orb + info */
.centerCol {
  grid-column: 2;
  grid-row: 1 / 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  z-index: 10;
}

/* Right top - Play button with aggressive left-side clip */
.rightTopCol {
  grid-column: 3;
  grid-row: 1;
  width: 100%;
  display: flex;
  justify-content: flex-start;
  padding-left: 4px;
  clip-path: polygon(30% 0%, 100% 0%, 100% 100%, 30% 100%);
  overflow: visible;
}

/* Right middle - Mute button with aggressive left-side clip */
.rightMidCol {
  grid-column: 3;
  grid-row: 2;
  width: 100%;
  display: flex;
  justify-content: flex-start;
  padding-left: 4px;
  clip-path: polygon(30% 0%, 100% 0%, 100% 100%, 30% 100%);
  overflow: visible;
}

/* Apply pattern section */
.applySection {
  grid-column: 2;
  grid-row: 4;
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}

/* Error section */
.errorSection {
  grid-column: 2;
  grid-row: 5;
  width: 100%;
  display: flex;
  justify-content: center;
}

/* Button styles */
.actionBtn {
  padding: 12px 28px;
  border-radius: 8px;
  border: 1px solid rgba(230, 220, 195, 0.3);
  background: rgba(20, 20, 25, 0.6);
  color: rgba(230, 220, 195, 0.8);
  font-family: var(--font-family-sans);
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.3s ease;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

.actionBtn:hover:not(:disabled) {
  border-color: rgba(230, 220, 195, 0.5);
  background: rgba(230, 220, 195, 0.05);
  color: rgba(230, 220, 195, 1);
  transform: scale(1.05);
}

.actionBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.controlBtn {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(230, 220, 195, 0.3);
  background: rgba(20, 20, 25, 0.6);
  color: rgba(230, 220, 195, 0.8);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
}

.controlBtn:hover {
  border-color: rgba(230, 220, 195, 0.5);
  background: rgba(230, 220, 195, 0.05);
  transform: scale(1.08);
}

.btnMuted {
  opacity: 0.6;
}

/* Orb elements */
.orbGeneratingRing {
  position: absolute;
  width: 60px;
  height: 60px;
  border: 2px solid rgba(230, 220, 195, 0.2);
  border-top-color: rgba(230, 220, 195, 0.6);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.orbTapHint {
  position: absolute;
  font-family: var(--font-family-sans);
  font-size: 0.7rem;
  text-transform: uppercase;
  color: rgba(230, 220, 195, 0.4);
  font-weight: 500;
}

.orbCentreIcon {
  position: absolute;
  font-size: 1.4rem;
  color: rgba(230, 220, 195, 0.85);
  font-weight: 500;
}

/* Info display */
.infoDisplay {
  text-align: center;
  max-width: 420px;
  width: 100%;
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.label {
  font-family: var(--font-family-sans);
  font-size: 0.9rem;
  color: rgba(230, 220, 195, 0.7);
  margin: 0;
}

.insight {
  font-family: var(--font-family-serif);
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--color-text-primary);
  margin: 0;
  font-weight: 300;
}

.idleText {
  font-family: var(--font-family-serif);
  font-size: 0.95rem;
  color: rgba(230, 220, 195, 0.5);
  line-height: 1.5;
  margin: 0;
}

.progressTrack {
  width: 100%;
  height: 2px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 1px;
  overflow: hidden;
  margin: 12px 0;
}

.progressFill {
  height: 100%;
  background: linear-gradient(90deg, rgba(90, 175, 155, 0.8), rgba(212, 175, 55, 0.6));
  transition: width 0.2s linear;
}

.timer {
  font-family: var(--font-family-sans);
  font-size: 0.8rem;
  color: rgba(230, 220, 195, 0.5);
  margin: 8px 0 0 0;
}

/* Apply pattern button */
.applyPatternBtn {
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid rgba(212, 175, 55, 0.25);
  background: rgba(212, 175, 55, 0.06);
  color: rgba(230, 220, 195, 0.75);
  font-family: var(--font-family-sans);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.applyPatternBtn:hover {
  background: rgba(212, 175, 55, 0.12);
  border-color: rgba(212, 175, 55, 0.4);
  color: var(--color-text-primary);
  transform: scale(1.05);
}

/* Error message */
.errorMsg {
  font-family: var(--font-family-sans);
  font-size: 0.8rem;
  color: rgba(220, 120, 100, 0.85);
  margin: 0;
  text-align: center;
  max-width: 300px;
}

/* Responsive */
@media (max-width: 1024px) {
  .guidedGrid {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto auto;
    gap: 1rem;
    height: auto;
  }

  .leftCol {
    grid-column: 1;
    grid-row: 1;
    justify-content: center;
    padding-right: 0;
    clip-path: none;
  }

  .centerCol {
    grid-column: 1;
    grid-row: 2;
  }

  .rightTopCol {
    grid-column: 1;
    grid-row: 3;
    justify-content: center;
    padding-left: 0;
    clip-path: none;
  }

  .rightMidCol {
    grid-column: 1;
    grid-row: 4;
    justify-content: center;
    padding-left: 0;
    clip-path: none;
  }

  .applySection {
    grid-column: 1;
    grid-row: 5;
    margin-top: 1rem;
  }

  .errorSection {
    grid-column: 1;
    grid-row: 6;
  }
}
```

---

## 5. BreatheSession.jsx
**Location:** `frontend/src/components/BreatheSession.jsx`

```jsx
import { useState, useEffect } from "react";
import styles from "./BreatheSession.module.css";
import { MeditationOrb } from "./MeditationOrb";
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
    handlePatternChange: changePattern,
    handleReset,
  } = breathingTimer;

  useEffect(() => {
    if (!isRunning || !audioEnabled) return;
    playBreathingTone(currentLabel);
  }, [isRunning, audioEnabled, currentLabel]);

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
    <div className={styles.breatheGrid}>
      {/* Left - AI Insight */}
      {suggestion && (
        <div className={styles.leftCol}>
          <div className={styles.insightBox}>
            <p className={styles.insightText}>{suggestion.insight}</p>
            <div className={styles.insightOverlay} />
          </div>
        </div>
      )}

      {/* Center - Orb */}
      <div className={styles.centerCol}>
        <MeditationOrb
          color={breatheOrbColor}
          scale={orbScale}
          isRunning={isRunning}
          currentDuration={currentDuration}
          currentLabel={currentLabel}
          orbTransition={orbTransition}
          onClick={() => setIsRunning((r) => !r)}
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

      {/* Right Top - Pattern Pills */}
      <div className={styles.rightTopCol}>
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
              AI
            </button>
          )}
        </div>
      </div>

      {/* Right Middle - Timer + Audio */}
      <div className={styles.rightMidCol}>
        <span className={styles.sessionTimer}>{formatTime(sessionSecs)}</span>
        <button
          className={`${styles.audioBtn} ${audioEnabled ? styles.audioBtnOn : ""}`}
          onClick={() => setAudioEnabled((a) => !a)}
        >
          {audioEnabled ? "On" : "Off"}
        </button>
      </div>

      {/* Right Bottom - Controls */}
      <div className={styles.rightBottomCol}>
        <button className={styles.controlBtn} onClick={() => setIsRunning((r) => !r)}>
          {isRunning ? "Pause" : "Begin"}
        </button>
        <button className={`${styles.controlBtn} ${styles.controlBtnSecondary}`} onClick={handleReset}>
          Reset
        </button>
      </div>

      {/* AI Hint Button */}
      {!suggestion && (
        <div className={styles.aiHintSection}>
          <button className={styles.getAiHintBtn}>
            Get AI session &amp; recommendation
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 6. BreatheSession.module.css
**Location:** `frontend/src/components/BreatheSession.module.css`

```css
/* BreatheSession - Grid with aggressive clipping */

.breatheGrid {
  display: grid;
  grid-template-columns: 100px 1fr 100px;
  grid-template-rows: auto auto auto auto;
  align-items: center;
  justify-items: center;
  gap: 0;
  width: 100%;
  max-width: 1000px;
  height: clamp(400px, 60vh, 600px);
  position: relative;
}

/* Left - AI Insight */
.leftCol {
  grid-column: 1;
  grid-row: 2;
  width: 100%;
  padding: 0 8px;
  overflow: visible;
}

.insightBox {
  position: relative;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(230, 220, 195, 0.15);
  background: rgba(20, 20, 25, 0.4);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  max-height: 120px;
  overflow: hidden;
  transition: all 0.4s ease;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.insightBox:hover {
  max-height: 400px;
  background: rgba(20, 20, 25, 0.8);
  border-color: rgba(230, 220, 195, 0.25);
  z-index: 20;
}

.insightText {
  font-family: var(--font-family-serif);
  font-size: 0.85rem;
  line-height: 1.4;
  color: rgba(230, 220, 195, 0.75);
  margin: 0;
  font-weight: 300;
}

.insightOverlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30px;
  background: linear-gradient(to top, rgba(20, 20, 25, 0.8), transparent);
  pointer-events: none;
  transition: opacity 0.4s ease;
  border-radius: 0 0 11px 11px;
}

.insightBox:hover .insightOverlay {
  opacity: 0;
}

/* Center - Orb */
.centerCol {
  grid-column: 2;
  grid-row: 1 / 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  z-index: 10;
}

.phaseDisplay {
  text-align: center;
}

.phaseLabel {
  font-family: var(--font-family-sans);
  font-size: 1rem;
  color: rgba(230, 220, 195, 0.7);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 500;
  min-height: 1.2em;
}

.phaseCountdown {
  font-family: var(--font-family-sans);
  font-size: 2.4rem;
  color: var(--color-text-primary);
  margin: 4px 0 0 0;
  font-weight: 300;
  min-height: 2.8em;
}

.orbTapHint {
  position: absolute;
  font-family: var(--font-family-sans);
  font-size: 0.75rem;
  text-transform: uppercase;
  color: rgba(230, 220, 195, 0.4);
  font-weight: 500;
}

/* Right Top - Pattern Pills with aggressive left-side clip */
.rightTopCol {
  grid-column: 3;
  grid-row: 1;
  width: 100%;
  display: flex;
  justify-content: flex-start;
  padding-left: 4px;
  clip-path: polygon(30% 0%, 100% 0%, 100% 100%, 30% 100%);
  overflow: visible;
}

.patternSelector {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.patternPill {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 15, 18, 0.4);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  color: rgba(230, 220, 195, 0.5);
  font-family: var(--font-family-sans);
  font-size: 0.75rem;
  font-variant-caps: small-caps;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.patternPill:hover {
  border-color: rgba(212, 175, 55, 0.25);
  color: rgba(230, 220, 195, 0.8);
  transform: scale(1.05);
}

.patternActive {
  border-color: rgba(212, 175, 55, 0.35);
  background: rgba(212, 175, 55, 0.08);
  color: var(--color-text-primary);
}

.patternAI {
  border-color: rgba(90, 175, 155, 0.2);
  color: rgba(160, 220, 200, 0.55);
}

.patternAI:hover {
  border-color: rgba(90, 175, 155, 0.4);
  color: rgba(160, 220, 200, 0.85);
}

/* Right Middle - Timer + Audio with aggressive left-side clip */
.rightMidCol {
  grid-column: 3;
  grid-row: 2;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  flex-direction: column;
  padding-left: 4px;
  clip-path: polygon(30% 0%, 100% 0%, 100% 100%, 30% 100%);
  overflow: visible;
}

.sessionTimer {
  font-family: var(--font-family-sans);
  font-size: 0.85rem;
  color: rgba(230, 220, 195, 0.6);
  font-weight: 300;
  letter-spacing: 0.05em;
}

.audioBtn {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 15, 18, 0.4);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  color: rgba(230, 220, 195, 0.4);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.audioBtn:hover {
  border-color: rgba(212, 175, 55, 0.28);
  color: rgba(230, 220, 195, 0.75);
  transform: scale(1.08);
}

.audioBtnOn {
  border-color: rgba(212, 175, 55, 0.4);
  color: rgba(212, 175, 55, 0.9);
  background: rgba(212, 175, 55, 0.08);
}

/* Right Bottom - Controls with aggressive left-side clip */
.rightBottomCol {
  grid-column: 3;
  grid-row: 3;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: flex-start;
  padding-left: 4px;
  clip-path: polygon(30% 0%, 100% 0%, 100% 100%, 30% 100%);
  overflow: visible;
}

.controlBtn {
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid rgba(230, 220, 195, 0.2);
  background: rgba(20, 20, 25, 0.5);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  color: rgba(230, 220, 195, 0.75);
  font-family: var(--font-family-sans);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  flex-shrink: 0;
}

.controlBtn:hover {
  border-color: rgba(230, 220, 195, 0.4);
  background: rgba(230, 220, 195, 0.05);
  color: rgba(230, 220, 195, 0.9);
  transform: scale(1.05);
}

.controlBtnSecondary {
  background: rgba(15, 15, 18, 0.3);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(230, 220, 195, 0.5);
}

.controlBtnSecondary:hover {
  background: rgba(15, 15, 18, 0.5);
  border-color: rgba(255, 255, 255, 0.15);
  color: rgba(230, 220, 195, 0.7);
}

/* AI Hint */
.aiHintSection {
  grid-column: 2;
  grid-row: 5;
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}

.getAiHintBtn {
  padding: 8px 18px;
  border-radius: 6px;
  border: 1px solid rgba(90, 175, 155, 0.18);
  background: transparent;
  color: rgba(160, 220, 200, 0.45);
  font-family: var(--font-family-sans);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

.getAiHintBtn:hover {
  border-color: rgba(90, 175, 155, 0.4);
  color: rgba(160, 220, 200, 0.85);
  transform: scale(1.05);
}

/* Mobile */
@media (max-width: 1024px) {
  .breatheGrid {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto auto auto;
    gap: 1rem;
    height: auto;
  }

  .leftCol {
    grid-column: 1;
    grid-row: 1;
    padding: 0;
  }

  .centerCol {
    grid-column: 1;
    grid-row: 2;
  }

  .rightTopCol {
    grid-column: 1;
    grid-row: 3;
    justify-content: center;
    padding-left: 0;
    clip-path: none;
  }

  .rightMidCol {
    grid-column: 1;
    grid-row: 4;
    justify-content: center;
    flex-direction: row;
    padding-left: 0;
    clip-path: none;
  }

  .rightBottomCol {
    grid-column: 1;
    grid-row: 5;
    flex-direction: row;
    padding-left: 0;
    clip-path: none;
  }

  .aiHintSection {
    grid-column: 1;
    grid-row: 6;
  }
}
```

---

## 7. MeditationOrb.jsx
**Location:** `frontend/src/components/MeditationOrb.jsx`

```jsx
/**
 * MeditationOrb.jsx
 * Core breathing orb component with rings and glow effects
 * Positioned at the center of OrbLayout
 */

import styles from "./MeditationOrb.module.css";

export function MeditationOrb({
  color = "rgba(110, 140, 215, 0.45)",
  scale = 1,
  isPlaying = false,
  isRunning = false,
  currentDuration = 0,
  currentLabel = "",
  orbTransition = "transform 6s ease-in-out",
  children,
  onClick,
  title,
}) {
  return (
    <div className={styles.orbWrapper}>
      {/* Flow container for orb rings and glow */}
      <div className={styles.flowContainer} onClick={onClick} title={title}>
        {/* Rotating ring */}
        <div className={styles.flowRing} />
        
        {/* Aurora ring */}
        <div className={styles.auroraRing} />
        
        {/* Texture ring */}
        <div className={styles.textureRing} />
        
        {/* Static glow */}
        <div className={styles.staticGlow} />
        
        {/* Core glow pulse */}
        <div className={styles.coreGlow} />

        {/* Main breathing orb (animated) */}
        <div
          className={styles.breathingOrb}
          style={{
            transform: `scale(${scale})`,
            transition: orbTransition,
            background: `radial-gradient(circle, ${color} 0%, rgba(255,255,255,0.08) 60%, transparent 100%)`,
            boxShadow: `0 0 40px 10px ${color}`,
          }}
        />

        {/* Children (icons, text, loading spinners) */}
        {children}
      </div>
    </div>
  );
}

export default MeditationOrb;
```

---

## 8. MeditationOrb.module.css
**Location:** `frontend/src/components/MeditationOrb.module.css`

```css
/* MeditationOrb - Core orb with rings and effects */

.orbWrapper {
  position: relative;
  width: clamp(200px, 42vh, 320px);
  height: clamp(200px, 42vh, 320px);
  z-index: 20;
  flex-shrink: 0;
}

/* Flow container for orb */
.flowContainer {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s ease;
  will-change: transform;
}

.flowContainer:active {
  transform: scale(0.98);
}

/* Rotating flow ring */
.flowRing {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.08) 30%,
    rgba(255, 255, 255, 0.04) 70%,
    rgba(255, 255, 255, 0) 100%
  );
  -webkit-mask: radial-gradient(transparent 62%, black 63%);
  mask: radial-gradient(transparent 62%, black 63%);
  animation: spin 28s linear infinite;
  opacity: 0.5;
  pointer-events: none;
}

/* Aurora ring - slow reverse spin */
.auroraRing {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: conic-gradient(
    from 180deg,
    transparent 0%,
    rgba(90, 175, 155, 0.08) 40%,
    transparent 60%,
    rgba(212, 175, 55, 0.06) 100%
  );
  -webkit-mask: radial-gradient(transparent 58%, black 60%);
  mask: radial-gradient(transparent 58%, black 60%);
  filter: blur(12px);
  animation: spin 22s linear infinite reverse;
  opacity: 0.6;
  pointer-events: none;
}

/* Texture ring - thin border */
.textureRing {
  position: absolute;
  inset: 14px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.06);
  opacity: 0.35;
  pointer-events: none;
}

/* Static outer glow */
.staticGlow {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(90, 175, 155, 0.02) 35%,
    rgba(212, 175, 55, 0.02) 70%,
    transparent 88%
  );
  border: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow: 0 0 50px rgba(255, 255, 255, 0.06);
  pointer-events: none;
}

/* Core glow - pulsing center */
.coreGlow {
  position: absolute;
  inset: -24px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.08) 0%,
    transparent 70%
  );
  animation: pulseCore 6s ease-in-out infinite;
  pointer-events: none;
}

/* Main breathing orb */
.breathingOrb {
  position: absolute;
  width: 28%;
  height: 28%;
  border-radius: 50%;
  will-change: transform;
  z-index: 30;
}

/* Animations */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulseCore {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.85;
    transform: scale(1.1);
  }
}

/* Mobile */
@media (max-width: 768px) {
  .orbWrapper {
    width: min(72vw, 38vh);
    height: min(72vw, 38vh);
    touch-action: manipulation;
  }

  .flowContainer {
    touch-action: manipulation;
  }
}
```

---

## Note
**MeditationTabs.jsx** does not exist in the codebase. Tab functionality is handled within `Meditate.jsx` using React state management.

---

*End of MEDITATION_FILES.md*
