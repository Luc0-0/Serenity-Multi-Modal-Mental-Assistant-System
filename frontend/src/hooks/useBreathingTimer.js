import { useState, useEffect } from "react";

const PATTERNS = {
  box:      { name: "Box",            phases: [4, 4, 4, 4],   labels: ["Inhale", "Hold", "Exhale", "Hold"] },
  calm:     { name: "4-7-8",          phases: [4, 7, 8, 0],   labels: ["Inhale", "Hold", "Exhale", ""] },
  deep:     { name: "Deep",           phases: [5, 5, 0, 0],   labels: ["Inhale", "Exhale", "", ""] },
  wim_hof:  { name: "Wim Hof",        phases: [2, 0, 15, 0],  labels: ["Inhale", "", "Hold", ""] },
  coherent: { name: "Coherent",       phases: [5, 0, 5, 0],   labels: ["Inhale", "", "Exhale", ""] },
};

const PHASE_SCALE = { Inhale: 1.48, Hold: null, Exhale: 1.0 };

const PHASE_COLOR = {
  Inhale: "rgba(212, 167, 116, 0.55)",
  Hold:   "rgba(110, 140, 215, 0.50)",
  Exhale: "rgba(90, 175, 155, 0.45)",
};

export function useBreathingTimer(patternKey = "box") {
  const [isRunning, setIsRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [countdown, setCountdown] = useState(PATTERNS[patternKey]?.phases[0] ?? 4);
  const [sessionSecs, setSessionSecs] = useState(0);
  const [orbScale, setOrbScale] = useState(1.0);

  const pattern = PATTERNS[patternKey] ?? PATTERNS.box;
  const currentLabel = pattern.labels[phaseIndex];
  const currentDuration = pattern.phases[phaseIndex];
  const breatheOrbColor = PHASE_COLOR[currentLabel] || PHASE_COLOR.Hold;

  useEffect(() => {
    const scale = PHASE_SCALE[currentLabel];
    if (scale !== null && scale !== undefined) setOrbScale(scale);
  }, [phaseIndex, currentLabel]);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setSessionSecs((s) => s + 1);
      setCountdown((c) => {
        if (c <= 1) {
          setPhaseIndex((prev) => {
            const phases = PATTERNS[patternKey]?.phases ?? PATTERNS.box.phases;
            let next = (prev + 1) % phases.length;
            while (phases[next] === 0 && next !== prev) next = (next + 1) % phases.length;
            // Reset countdown to the next phase duration
            setTimeout(() => setCountdown(phases[next]), 0);
            return next;
          });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, patternKey]);

  const handlePatternChange = (newPattern) => {
    const p = PATTERNS[newPattern] ?? PATTERNS.box;
    setPhaseIndex(0);
    setCountdown(p.phases[0]);
    setSessionSecs(0);
    setOrbScale(1.0);
  };

  const handleReset = () => {
    setIsRunning(false);
    setPhaseIndex(0);
    setCountdown(pattern.phases[0]);
    setSessionSecs(0);
    setOrbScale(1.0);
  };

  return {
    isRunning,
    setIsRunning,
    phaseIndex,
    countdown,
    sessionSecs,
    orbScale,
    currentLabel,
    currentDuration,
    breatheOrbColor,
    pattern,
    handlePatternChange,
    handleReset,
  };
}

export { PATTERNS };
