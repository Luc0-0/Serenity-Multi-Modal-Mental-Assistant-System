import { useState, useEffect, useCallback, useRef } from "react";
import styles from "./Meditate.module.css";

const PATTERNS = {
  box: {
    name: "Box",
    phases: [4, 4, 4, 4],
    labels: ["Inhale", "Hold", "Exhale", "Hold"],
  },
  calm: {
    name: "4-7-8",
    phases: [4, 7, 8, 0],
    labels: ["Inhale", "Hold", "Exhale", ""],
  },
  deep: {
    name: "Deep",
    phases: [5, 5, 0, 0],
    labels: ["Inhale", "Exhale", "", ""],
  },
};

// Which phases expand vs. contract the orb
const PHASE_SCALE = { Inhale: 1.48, Hold: null, Exhale: 1.0 };

// Ambient orb glow color per phase label
const PHASE_COLOR = {
  Inhale: "rgba(212, 167, 116, 0.55)",
  Hold: "rgba(110, 140, 215, 0.50)",
  Exhale: "rgba(90, 175, 155, 0.45)",
};

function playTone(freq, duration) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    setTimeout(() => ctx.close(), duration * 1000 + 200);
  } catch {
    // Audio unavailable
  }
}

const PHASE_TONES = { Inhale: 432, Hold: 528, Exhale: 396 };

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function Meditate() {
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

  // Update orb scale when phase changes
  useEffect(() => {
    const scale = PHASE_SCALE[currentLabel];
    if (scale !== null && scale !== undefined) {
      setOrbScale(scale);
    }
  }, [phaseIndex, currentLabel]);

  // Play audio cue at phase start
  useEffect(() => {
    if (!isRunning || !audioEnabled) return;
    const freq = PHASE_TONES[currentLabel];
    if (freq) playTone(freq, 1.2);
  }, [phaseIndex, isRunning, audioEnabled, currentLabel]);

  // Master tick: countdown + session timer
  useEffect(() => {
    if (!isRunning) return;

    const id = setInterval(() => {
      setSessionSecs((s) => s + 1);
      setCountdown((c) => {
        if (c <= 1) {
          // Advance to next phase, skipping zero-duration phases
          setPhaseIndex((prev) => {
            const phases = PATTERNS[patternKey].phases;
            let next = (prev + 1) % phases.length;
            // Skip zero-duration phases
            while (phases[next] === 0 && next !== prev) {
              next = (next + 1) % phases.length;
            }
            return next;
          });
          return 0; // will be reset by phase change effect below
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [isRunning, patternKey]);

  // Reset countdown when phaseIndex changes
  const phaseIndexRef = useRef(phaseIndex);
  useEffect(() => {
    if (phaseIndexRef.current === phaseIndex) return;
    phaseIndexRef.current = phaseIndex;
    const dur = PATTERNS[patternKey].phases[phaseIndex];
    setCountdown(dur > 0 ? dur : PATTERNS[patternKey].phases[0]);
  }, [phaseIndex, patternKey]);

  const handleStart = () => {
    if (isRunning) {
      setIsRunning(false);
    } else {
      setIsRunning(true);
    }
  };

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setPhaseIndex(0);
    phaseIndexRef.current = 0;
    setCountdown(PATTERNS[patternKey].phases[0]);
    setSessionSecs(0);
    setOrbScale(1.0);
  }, [patternKey]);

  const handlePatternChange = (key) => {
    setIsRunning(false);
    setPatternKey(key);
    setPhaseIndex(0);
    phaseIndexRef.current = 0;
    setCountdown(PATTERNS[key].phases[0]);
    setSessionSecs(0);
    setOrbScale(1.0);
  };

  // Orb transition duration matches the current phase duration (smooth expand/contract)
  const orbTransition =
    currentLabel === "Inhale" || currentLabel === "Exhale"
      ? `transform ${currentDuration}s ease-in-out`
      : "transform 0.4s ease";

  return (
    <div
      className={styles.container}
      style={{ "--phase-color": orbColor }}
    >
      <div className={styles.backgroundImage} />
      <div className={styles.overlay} />

      {/* Ambient phase background */}
      <div
        className={styles.phaseAmbient}
        style={{ background: `radial-gradient(circle at 50% 50%, ${orbColor} 0%, transparent 65%)` }}
      />

      {/* ── Pattern selector ── */}
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
      </div>

      {/* ── Session row ── */}
      <div className={styles.sessionRow}>
        <span className={styles.sessionTimer}>{formatTime(sessionSecs)}</span>
        <button
          className={`${styles.audioBtn} ${audioEnabled ? styles.audioBtnOn : ""}`}
          onClick={() => setAudioEnabled((a) => !a)}
          aria-label={audioEnabled ? "Disable audio cues" : "Enable audio cues"}
          title={audioEnabled ? "Audio on" : "Audio off"}
        >
          {audioEnabled ? "♪" : "♩"}
        </button>
      </div>

      {/* ── Orb + rings ── */}
      <div className={styles.orbArea}>
        <div className={styles.flowContainer}>
          <div className={styles.flowRing} />
          <div className={styles.auroraRing} />
          <div className={styles.textureRing} />
          <div className={styles.staticGlow} />
          <div className={styles.coreGlow} />

          {/* Breathing orb */}
          <div
            className={styles.breathingOrb}
            style={{
              transform: `scale(${orbScale})`,
              transition: orbTransition,
              background: `radial-gradient(circle, ${orbColor} 0%, rgba(255,255,255,0.08) 60%, transparent 100%)`,
              boxShadow: `0 0 40px 10px ${orbColor}`,
            }}
          />
        </div>

        {/* ── Phase label + countdown ── */}
        <div className={styles.phaseDisplay}>
          <p className={styles.phaseLabel}>{currentLabel || "\u00A0"}</p>
          <p className={styles.phaseCountdown}>
            {isRunning && currentDuration > 0 ? countdown : currentDuration > 0 ? currentDuration : ""}
          </p>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className={styles.controlRow}>
        <button className={styles.controlBtn} onClick={handleStart}>
          {isRunning ? "Pause" : "Begin"}
        </button>
        <button className={`${styles.controlBtn} ${styles.controlBtnSecondary}`} onClick={handleReset}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default Meditate;
