import { useState, useEffect, useRef } from "react";
import styles from "./Meditate.module.css";
import { GuidedSession } from "../components/GuidedSession";
import { BreatheSession } from "../components/BreatheSession";

export function Meditate() {
  const [activeTab, setActiveTab] = useState("guided");
  const [suggestion, setSuggestion] = useState(null);
  const [currentPattern, setCurrentPattern] = useState("box");
  const [breathingPhase, setBreathingPhase] = useState(""); // for reactive aura
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
              : breathingPhase === "Inhale"
              ? "radial-gradient(circle at 50% 50%, rgba(90, 175, 155, 0.55) 0%, transparent 65%)"
              : breathingPhase === "Exhale"
              ? "radial-gradient(circle at 50% 50%, rgba(90, 175, 155, 0.35) 0%, transparent 65%)"
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
          onBreathingPhaseChange={setBreathingPhase}
        />
      )}
    </div>
  );
}

export default Meditate;
