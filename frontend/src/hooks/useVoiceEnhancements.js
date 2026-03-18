/* ═══════════════════════════════════════════════════════════════════════════
   HOOKS FOR VOICE MODE ENHANCEMENTS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * useHapticFeedback
 * Provides haptic patterns synced to voice interactions
 * Falls back gracefully on devices without vibration API
 */
export const useHapticFeedback = () => {
  const supportsHaptic = () => {
    return (
      typeof navigator !== "undefined" &&
      (navigator.vibrate ||
        navigator.webkitVibrate ||
        navigator.mozVibrate ||
        navigator.msVibrate)
    );
  };

  const vibrate = (pattern) => {
    if (!supportsHaptic()) return;
    try {
      const vib =
        navigator.vibrate ||
        navigator.webkitVibrate ||
        navigator.mozVibrate ||
        navigator.msVibrate;
      vib.call(navigator, pattern);
    } catch (_) {}
  };

  return {
    // Single tap — microphone activation
    tap: () => vibrate([50]),

    // Double confirmation — response received
    double: () => vibrate([50, 30, 50]),

    // Triple confirmation — success/completion
    triple: () => vibrate([50, 30, 50, 30, 50]),

    // Listening pulse — subtle continuous feedback
    listeningPulse: () => {
      const pulse = [10, 5, 10, 5, 10];
      for (let i = 0; i < 3; i++) {
        setTimeout(() => vibrate(pulse), i * 600);
      }
    },

    // Warning pattern — errors
    warning: () => vibrate([50, 50, 50]),

    // Processing — gentle pulsing
    processing: () => vibrate([20, 30, 20]),

    // Cancel/stop
    cancel: () => vibrate([100, 50, 100]),
  };
};

/**
 * useAudioVisualizer
 * Real-time waveform analysis for speaking state
 * Uses AudioContext to analyze frequency data
 */
export const useAudioVisualizer = () => {
  const analyzeAudio = (audioElement) => {
    if (!audioElement) return [];

    try {
      const audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaElementAudioSource(audioElement);

      source.connect(analyser);
      analyser.connect(audioContext.destination);
      analyser.fftSize = 256;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      // Return normalized frequency data for visualization
      return Array.from(dataArray)
        .slice(0, 12)
        .map((val) => (val / 255) * 100);
    } catch (_) {
      // Fallback: return dummy data if AudioContext fails
      return Array.from({ length: 12 }, () => Math.random() * 100);
    }
  };

  return { analyzeAudio };
};

/**
 * useVoiceStateTransition
 * Smooth state transitions with 250-350ms easing
 */
export const useVoiceStateTransition = (newState, onTransitionComplete) => {
  const transitionTime = 300; // Apple standard

  return {
    transitionTime,
    easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  };
};
