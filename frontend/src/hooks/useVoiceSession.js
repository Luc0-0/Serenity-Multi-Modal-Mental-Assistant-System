import { useState, useRef, useCallback, useEffect } from 'react';
import { voiceChat, speakText } from '../services/api';

/**
 * Status machine:
 *  idle → listening → processing → speaking → [repeat] → session_ready
 *  breathwork_idle → breathwork_listening → breathwork_processing → breathwork_speaking → breathwork_idle
 */

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

function browserSpeak(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.88;
    utt.pitch = 0.95;
    // Pick a calm female voice if available
    const voices = window.speechSynthesis.getVoices();
    const calm = voices.find(
      (v) => /female|woman|samantha|zira|karen|moira/i.test(v.name)
    ) || voices[0];
    if (calm) utt.voice = calm;
    utt.onend = resolve;
    utt.onerror = resolve;
    window.speechSynthesis.speak(utt);
  });
}

async function speakWithFallback(text) {
  try {
    const blob = await speakText(text);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await new Promise((resolve, reject) => {
        audio.onended = resolve;
        audio.onerror = reject;
        audio.play().catch(reject);
      });
      URL.revokeObjectURL(url);
      return;
    }
  } catch (_) { /* fall through */ }
  await browserSpeak(text);
}

export function useVoiceSession({ onSessionStart, onBreathworkCue }) {
  const [status, setStatus] = useState('idle');
  // idle | listening | processing | speaking | session_ready
  // breathwork_idle | breathwork_listening | breathwork_processing | breathwork_speaking
  const [messages, setMessages] = useState([]);
  const [turn, setTurn] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const abortRef = useRef(false);

  const isActive = status !== 'idle' && status !== 'session_ready';

  // ── Start full guided conversation ──────────────────────────────────────────
  const startConversation = useCallback(async () => {
    if (!SpeechRecognition) {
      setError('Voice input not supported in this browser. Use Chrome.');
      return;
    }
    abortRef.current = false;
    setMessages([]);
    setTurn(1);
    setError(null);

    // Turn 1 — AI opens
    setStatus('processing');
    try {
      const res = await voiceChat({ messages: [], turn: 1, context: 'guided' });
      if (abortRef.current) return;
      setStatus('speaking');
      setMessages([{ role: 'assistant', content: res.text }]);
      await speakWithFallback(res.text);
      if (abortRef.current) return;
      // Listen for user response
      listenForUser(1, [{ role: 'assistant', content: res.text }]);
    } catch (e) {
      setError('Could not start session.');
      setStatus('idle');
    }
  }, []);

  // ── Listen for user speech ───────────────────────────────────────────────
  const listenForUser = useCallback((currentTurn, currentMessages) => {
    if (abortRef.current) return;
    setStatus('listening');
    setTranscript('');

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    let finalTranscript = '';

    recognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += t;
        else interim += t;
      }
      setTranscript(finalTranscript || interim);
    };

    recognition.onerror = () => {
      // If no speech detected, treat as "I don't know" and proceed
      finalTranscript = finalTranscript || 'I am not sure';
      processUserTurn(currentTurn, currentMessages, finalTranscript);
    };

    recognition.onend = () => {
      if (!abortRef.current) {
        processUserTurn(currentTurn, currentMessages, finalTranscript || 'I am not sure');
      }
    };

    recognition.start();
  }, []);

  // ── Process user's spoken response ──────────────────────────────────────
  const processUserTurn = useCallback(async (currentTurn, prevMessages, userText) => {
    if (abortRef.current) return;
    setStatus('processing');
    setTranscript('');

    const nextTurn = currentTurn + 1;
    const updatedMessages = [
      ...prevMessages,
      { role: 'user', content: userText },
    ];
    setMessages(updatedMessages);
    setTurn(nextTurn);

    try {
      const res = await voiceChat({
        messages: updatedMessages,
        turn: nextTurn,
        context: 'guided',
      });
      if (abortRef.current) return;

      const allMessages = [...updatedMessages, { role: 'assistant', content: res.text }];
      setMessages(allMessages);
      setStatus('speaking');
      await speakWithFallback(res.text);
      if (abortRef.current) return;

      if (res.action === 'start_session') {
        setStatus('session_ready');
        onSessionStart?.({
          track_id: res.track_id || 'fear',
          pattern: res.pattern || 'box',
          emotion: res.emotion || 'neutral',
        });
      } else {
        // Continue conversation (max turn 3)
        listenForUser(nextTurn, allMessages);
      }
    } catch (e) {
      // On any error, force-resolve to session start
      setStatus('session_ready');
      onSessionStart?.({ track_id: 'fear', pattern: 'box', emotion: 'neutral' });
    }
  }, [onSessionStart, listenForUser]);

  // ── Breathwork check-in (single turn, non-blocking) ─────────────────────
  const breathworkCheckIn = useCallback(async () => {
    if (!SpeechRecognition) return;
    if (status.startsWith('breathwork_') && status !== 'breathwork_idle') return;

    abortRef.current = false;
    setStatus('breathwork_listening');
    setTranscript('');

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    let finalText = '';
    recognition.onresult = (e) => {
      finalText = e.results[0][0].transcript;
      setTranscript(finalText);
    };
    recognition.onend = async () => {
      if (!finalText || abortRef.current) { setStatus('breathwork_idle'); return; }
      setStatus('breathwork_processing');
      try {
        const res = await voiceChat({
          messages: [{ role: 'user', content: finalText }],
          turn: 1,
          context: 'breathwork',
        });
        setStatus('breathwork_speaking');
        await speakWithFallback(res.text);
        onBreathworkCue?.(res.text);
      } catch (_) {}
      setStatus('breathwork_idle');
    };
    recognition.onerror = () => setStatus('breathwork_idle');
    recognition.start();
  }, [status, onBreathworkCue]);

  // ── Stop / reset ────────────────────────────────────────────────────────
  const stopConversation = useCallback(() => {
    abortRef.current = true;
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
    setStatus('idle');
    setMessages([]);
    setTurn(0);
    setTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    status,
    transcript,
    turn,
    error,
    isActive,
    startConversation,
    stopConversation,
    breathworkCheckIn,
    isListening: status === 'listening' || status === 'breathwork_listening',
    isSpeaking: status === 'speaking' || status === 'breathwork_speaking',
    isProcessing: status === 'processing' || status === 'breathwork_processing',
  };
}
