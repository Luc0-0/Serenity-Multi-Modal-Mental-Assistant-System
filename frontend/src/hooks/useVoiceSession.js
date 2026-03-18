import { useState, useRef, useCallback, useEffect } from 'react';
import { voiceChat, speakText } from '../services/api';

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

function browserSpeak(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.88;
    utt.pitch = 0.95;
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
  } catch (_) { /* fall through to browser TTS */ }
  await browserSpeak(text);
}

export function useVoiceSession({ onSessionStart, onBreathworkCue }) {
  const [status, setStatus] = useState('idle');
  const [messages, setMessages] = useState([]);
  const [turn, setTurn] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  const abortRef = useRef(false);
  const recognitionRef = useRef(null);
  // Stable refs to break circular useCallback dependency
  const listenRef = useRef(null);
  const processRef = useRef(null);
  const onSessionStartRef = useRef(onSessionStart);
  const onBreathworkCueRef = useRef(onBreathworkCue);

  // Keep refs fresh on every render
  onSessionStartRef.current = onSessionStart;
  onBreathworkCueRef.current = onBreathworkCue;

  // ── Listen for user speech ─────────────────────────────────────────────────
  listenRef.current = (currentTurn, currentMessages) => {
    if (abortRef.current) return;
    setStatus('listening');
    setTranscript('');

    if (!SpeechRecognition) {
      // No speech API — skip to resolve
      processRef.current(currentTurn, currentMessages, 'I am not sure');
      return;
    }

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
      if (!abortRef.current) {
        processRef.current(currentTurn, currentMessages, finalTranscript || 'I am not sure');
      }
    };

    recognition.onend = () => {
      if (!abortRef.current) {
        processRef.current(currentTurn, currentMessages, finalTranscript || 'I am not sure');
      }
    };

    try { recognition.start(); } catch (_) {
      processRef.current(currentTurn, currentMessages, 'I am not sure');
    }
  };

  // ── Process user turn ──────────────────────────────────────────────────────
  processRef.current = async (currentTurn, prevMessages, userText) => {
    if (abortRef.current) return;
    setStatus('processing');
    setTranscript('');

    const nextTurn = currentTurn + 1;
    const updatedMessages = [...prevMessages, { role: 'user', content: userText }];
    setMessages(updatedMessages);
    setTurn(nextTurn);

    try {
      const res = await voiceChat({ messages: updatedMessages, turn: nextTurn, context: 'guided' });
      if (abortRef.current) return;

      const allMessages = [...updatedMessages, { role: 'assistant', content: res.text }];
      setMessages(allMessages);
      setStatus('speaking');
      await speakWithFallback(res.text);
      if (abortRef.current) return;

      if (res.action === 'start_session') {
        setStatus('session_ready');
        onSessionStartRef.current?.({
          track_id: res.track_id || 'fear',
          pattern: res.pattern || 'box',
          emotion: res.emotion || 'neutral',
        });
      } else {
        listenRef.current(nextTurn, allMessages);
      }
    } catch (_) {
      setStatus('session_ready');
      onSessionStartRef.current?.({ track_id: 'fear', pattern: 'box', emotion: 'neutral' });
    }
  };

  // ── Start guided conversation ──────────────────────────────────────────────
  const startConversation = useCallback(async () => {
    abortRef.current = false;
    setMessages([]);
    setTurn(1);
    setError(null);
    setStatus('processing');

    try {
      const res = await voiceChat({ messages: [], turn: 1, context: 'guided' });
      if (abortRef.current) return;
      const opening = [{ role: 'assistant', content: res.text }];
      setMessages(opening);
      setStatus('speaking');
      await speakWithFallback(res.text);
      if (abortRef.current) return;
      listenRef.current(1, opening);
    } catch (_) {
      setError('Could not start voice session.');
      setStatus('idle');
    }
  }, []);

  // ── Breathwork check-in ────────────────────────────────────────────────────
  const breathworkCheckIn = useCallback(() => {
    if (!SpeechRecognition) return;
    if (abortRef.current) return;
    setStatus('breathwork_listening');
    setTranscript('');

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognitionRef.current = recognition;
    let finalText = '';

    recognition.onresult = (e) => { finalText = e.results[0][0].transcript; };
    recognition.onerror = () => setStatus('breathwork_idle');
    recognition.onend = async () => {
      if (!finalText) { setStatus('breathwork_idle'); return; }
      setStatus('breathwork_processing');
      try {
        const res = await voiceChat({
          messages: [{ role: 'user', content: finalText }],
          turn: 1,
          context: 'breathwork',
        });
        setStatus('breathwork_speaking');
        await speakWithFallback(res.text);
        onBreathworkCueRef.current?.(res.text);
      } catch (_) {}
      setStatus('breathwork_idle');
    };

    try { recognition.start(); } catch (_) { setStatus('breathwork_idle'); }
  }, []);

  // ── Stop ───────────────────────────────────────────────────────────────────
  const stopConversation = useCallback(() => {
    abortRef.current = true;
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
    setStatus('idle');
    setMessages([]);
    setTurn(0);
    setTranscript('');
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current = true;
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const isActive = !['idle', 'session_ready', 'breathwork_idle'].includes(status);

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
