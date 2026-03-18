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

/**
 * useRealtimeFrequencyAnalyzer
 * Advanced audio frequency analysis for waveform visualization
 * Provides real-time frequency data in multiple bands
 */
export const useRealtimeFrequencyAnalyzer = () => {
  const analyzeFrequencies = (audioElement) => {
    if (!audioElement) return [];

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaElementAudioSource(audioElement);

      source.connect(analyser);
      analyser.connect(audioContext.destination);
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.85;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      // Process frequency bands for visualization
      const bands = [];
      const bandCount = 16;
      const binPerBand = Math.floor(dataArray.length / bandCount);

      for (let i = 0; i < bandCount; i++) {
        const start = i * binPerBand;
        const end = start + binPerBand;
        const bandData = dataArray.slice(start, end);
        const average = bandData.reduce((a, b) => a + b, 0) / bandData.length;
        bands.push((average / 255) * 100);
      }

      return bands;
    } catch (_) {
      // Fallback: smooth random data
      return Array.from({ length: 16 }, () => Math.random() * 100);
    }
  };

  return { analyzeFrequencies };
};

/**
 * useVoiceMessageTimestamp
 * Automatically adds timestamps to voice messages
 */
export const useVoiceMessageTimestamp = () => {
  const addTimestamp = (message) => {
    return {
      ...message,
      timestamp: new Date(),
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return { addTimestamp, formatTime };
};

/**
 * useVoiceTranscriptConfidence
 * Estimates confidence levels based on recognition API data
 */
export const useVoiceTranscriptConfidence = () => {
  const calculateConfidence = (isFinal, alternatives = 1) => {
    // Base confidence: final transcripts are more reliable
    const baseConfidence = isFinal ? 0.85 : 0.6;
    // Adjust for number of alternatives (fewer = more confident)
    const alternativeFactor = Math.min(1, 1 / Math.max(alternatives, 1));
    return Math.min(1, baseConfidence * alternativeFactor);
  };

  return { calculateConfidence };
};
