import { useState, useRef, useEffect, useCallback } from 'react';
import { speakText } from '../services/api';
import { useHapticFeedback } from './useVoiceEnhancements';

/**
 * useVoiceMode - Complete voice conversation management
 * Handles: STT (Web Speech API), TTS (Kokoro + browser fallback),
 * state machine, interruption, frequency analysis, error recovery
 */
export function useVoiceMode({ sendChatMessage, conversationId, onConversationCreated, onMessageAdded }) {
  // ── State ──
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [voiceMessages, setVoiceMessages] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [frequencyData, setFrequencyData] = useState(new Uint8Array(16));

  // ── Refs ──
  const recognitionRef = useRef(null);
  const abortRef = useRef(false);
  const convIdRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const listenRef = useRef(null);
  const processRef = useRef(null);
  const exitingRef = useRef(false);

  const haptic = useHapticFeedback();

  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition || null
      : null;

  // ── Frequency Analysis (for waveform visualization) ──
  const startFrequencyAnalysis = useCallback((audioElement) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.85;

      const source = ctx.createMediaElementAudioSource(audioElement);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const bands = new Uint8Array(16);
      const binPerBand = Math.floor(dataArray.length / 16);

      const update = () => {
        analyser.getByteFrequencyData(dataArray);
        for (let i = 0; i < 16; i++) {
          let sum = 0;
          for (let j = i * binPerBand; j < (i + 1) * binPerBand; j++) {
            sum += dataArray[j];
          }
          bands[i] = Math.round((sum / binPerBand / 255) * 100);
        }
        setFrequencyData(new Uint8Array(bands));
        animFrameRef.current = requestAnimationFrame(update);
      };
      animFrameRef.current = requestAnimationFrame(update);
    } catch (_) {
      // Fallback: AudioContext not available
    }
  }, []);

  const stopFrequencyAnalysis = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setFrequencyData(new Uint8Array(16));
  }, []);

  // ── TTS: Kokoro with browser fallback ──
  const speak = useCallback(async (text) => {
    if (abortRef.current) return;
    setVoiceStatus('speaking');
    haptic.double();

    // Try Kokoro TTS first
    try {
      const blob = await speakText(text);
      if (blob && blob.size > 0) {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        startFrequencyAnalysis(audio);

        await new Promise((resolve) => {
          audio.onended = resolve;
          audio.onerror = resolve;
          audio.play().catch(resolve);
        });

        stopFrequencyAnalysis();
        URL.revokeObjectURL(url);
        audioRef.current = null;
        return;
      }
    } catch (_) {
      /* fall through to browser TTS */
    }

    // Browser TTS fallback
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      await new Promise((resolve) => {
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 0.9;
        utt.pitch = 0.95;
        const voices = window.speechSynthesis.getVoices();
        const calm = voices.find((v) => /female|samantha|zira|karen|moira/i.test(v.name)) || voices[0];
        if (calm) utt.voice = calm;
        utt.onend = resolve;
        utt.onerror = resolve;
        window.speechSynthesis.speak(utt);
        setTimeout(resolve, 20000);
      });
    }
  }, [haptic, startFrequencyAnalysis, stopFrequencyAnalysis]);

  // ── Interrupt: stop AI speaking, resume listening ──
  const interrupt = useCallback(() => {
    if (voiceStatus !== 'speaking') return;
    haptic.tap();

    // Stop Kokoro audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    // Stop browser TTS
    window.speechSynthesis?.cancel();
    stopFrequencyAnalysis();

    // Resume listening
    setVoiceStatus('listening');
    setTimeout(() => listenRef.current?.(), 200);
  }, [voiceStatus, haptic, stopFrequencyAnalysis]);

  // ── Listen (STT via Web Speech API) ──
  listenRef.current = () => {
    if (abortRef.current || exitingRef.current) return;
    if (!SpeechRecognitionAPI) {
      setError({ type: 'mic_denied', message: 'Speech recognition not supported in this browser.', recoverable: false });
      haptic.warning();
      return;
    }

    haptic.tap();
    setVoiceStatus('listening');
    setTranscript('');

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    let finalTranscript = '';
    let silenceTimer = null;
    let dispatched = false;

    const SILENCE_TIMEOUT = 3000;

    const resetSilenceTimer = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (!dispatched && finalTranscript.trim()) {
          dispatched = true;
          try { recognition.stop(); } catch (_) {}
        }
      }, SILENCE_TIMEOUT);
    };

    recognition.onresult = (e) => {
      let interim = '';
      finalTranscript = '';
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += t;
        else interim += t;
      }
      setTranscript(finalTranscript || interim);
      resetSilenceTimer();
    };

    recognition.onerror = (e) => {
      if (silenceTimer) clearTimeout(silenceTimer);
      haptic.warning();
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError({ type: 'mic_denied', message: 'Microphone access denied. Please allow mic permission.', recoverable: true });
        setVoiceStatus('idle');
        return;
      }
      if (!dispatched && finalTranscript.trim()) {
        dispatched = true;
        processRef.current(finalTranscript.trim());
      }
    };

    recognition.onend = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (!dispatched && finalTranscript.trim()) {
        dispatched = true;
        processRef.current(finalTranscript.trim());
      } else if (!dispatched && !abortRef.current) {
        setTimeout(() => listenRef.current?.(), 300);
      }
    };

    const absoluteTimeout = setTimeout(() => {
      if (!dispatched) {
        dispatched = true;
        try { recognition.stop(); } catch (_) {}
        if (finalTranscript.trim()) {
          processRef.current(finalTranscript.trim());
        } else if (!abortRef.current) {
          setTimeout(() => listenRef.current?.(), 300);
        }
      }
    }, 60000);

    recognition.addEventListener('end', () => clearTimeout(absoluteTimeout), { once: true });

    try {
      recognition.start();
      resetSilenceTimer();
    } catch (_) {
      setError({ type: 'mic_denied', message: 'Could not start microphone.', recoverable: true });
      setVoiceStatus('idle');
    }
  };

  // ── Process: send transcribed text to chat API ──
  processRef.current = async (userText) => {
    if (abortRef.current) return;
    haptic.tap();
    setVoiceStatus('processing');
    setTranscript('');

    const userMsg = { role: 'user', content: userText, timestamp: new Date(), confidence: 0.85 };
    setVoiceMessages((prev) => [...prev, userMsg]);

    onMessageAdded?.({ sender: 'user', text: userText });

    try {
      const response = await sendChatMessage({
        message: userText,
        conversation_id: convIdRef.current || conversationId,
      });

      if (abortRef.current) return;

      if (!convIdRef.current && response.conversation_id) {
        convIdRef.current = response.conversation_id;
        onConversationCreated?.(response.conversation_id);
      }

      const aiText = response.reply;
      const aiMsg = {
        role: 'assistant',
        content: aiText,
        timestamp: new Date(),
        crisis: response.crisis_detected
          ? { severity: response.crisis_severity, resources: response.resources }
          : null,
      };
      setVoiceMessages((prev) => [...prev, aiMsg]);

      onMessageAdded?.({
        sender: 'assistant',
        text: aiText,
        crisis: aiMsg.crisis,
      });

      await speak(aiText);

      if (abortRef.current) return;
      haptic.processing();
      setTimeout(() => listenRef.current?.(), 400);
    } catch (err) {
      if (abortRef.current) return;
      haptic.warning();
      setError({ type: 'network', message: 'Connection issue. Trying again...', recoverable: true });
      setTimeout(() => {
        setError(null);
        if (!abortRef.current) listenRef.current?.();
      }, 2000);
    }
  };

  // ── Enter Voice Mode ──
  const enterVoiceMode = useCallback(() => {
    haptic.tap();
    setVoiceMode(true);
    exitingRef.current = false;
    setVoiceMessages([]);
    setError(null);
    setTranscript('');
    abortRef.current = false;
    convIdRef.current = conversationId;

    setTimeout(() => {
      if (!abortRef.current) listenRef.current?.();
    }, 600);
  }, [conversationId, haptic]);

  // ── Exit Voice Mode ──
  const exitVoiceMode = useCallback(() => {
    haptic.tap();
    abortRef.current = true;
    exitingRef.current = true;

    try { recognitionRef.current?.abort(); } catch (_) {}
    recognitionRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    stopFrequencyAnalysis();

    setTimeout(() => {
      setVoiceMode(false);
      setVoiceStatus('idle');
      setTranscript('');
      setError(null);
      exitingRef.current = false;
    }, 400);
  }, [haptic, stopFrequencyAnalysis]);

  // ── Retry ──
  const retryLastAction = useCallback(() => {
    setError(null);
    haptic.tap();
    if (!abortRef.current) {
      listenRef.current?.();
    }
  }, [haptic]);

  // ── Auto-clear errors after 5s ──
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      abortRef.current = true;
      try { recognitionRef.current?.abort(); } catch (_) {}
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis?.cancel();
      stopFrequencyAnalysis();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stopFrequencyAnalysis]);

  return {
    voiceMode,
    voiceStatus,
    voiceMessages,
    transcript,
    error,
    frequencyData,
    enterVoiceMode,
    exitVoiceMode,
    retryLastAction,
    interrupt,
  };
}
