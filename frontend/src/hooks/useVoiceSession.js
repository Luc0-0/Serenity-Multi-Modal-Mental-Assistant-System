import { useState, useRef, useCallback, useEffect } from 'react';
import { voiceChat, speakText } from '../services/api';

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

// ── Browser TTS fallback ───────────────────────────────────────────────────
function browserSpeak(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();

    let spoken = false;
    const doSpeak = () => {
      if (spoken) return; // guard against double-fire
      spoken = true;
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
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak();
      };
      // Fallback if onvoiceschanged never fires
      setTimeout(doSpeak, 600);
    }

    // Hard timeout — never hang more than 15s on TTS
    setTimeout(resolve, 15000);
  });
}

// ── Kokoro TTS with browser fallback ───────────────────────────────────────
async function speakWithFallback(text) {
  try {
    const blob = await speakText(text);
    // speakText returns null on 204 (no Kokoro) or non-ok
    if (blob && blob.size > 0) {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await new Promise((resolve) => {
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(resolve);
      });
      URL.revokeObjectURL(url);
      return;
    }
  } catch (_) { /* fall through to browser TTS */ }
  await browserSpeak(text);
}

// ── Main hook ──────────────────────────────────────────────────────────────
export function useVoiceSession({ onSessionStart, onBreathworkCue }) {
  const [status, setStatus] = useState('idle');
  const [messages, setMessages] = useState([]);
  const [turn, setTurn] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  const abortRef = useRef(false);
  const runningRef = useRef(false);
  const recognitionRef = useRef(null);
  const listenRef = useRef(null);
  const processRef = useRef(null);
  const onSessionStartRef = useRef(onSessionStart);
  const onBreathworkCueRef = useRef(onBreathworkCue);

  // Keep callback refs fresh
  onSessionStartRef.current = onSessionStart;
  onBreathworkCueRef.current = onBreathworkCue;

  // Auto-clear errors after 5s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  // ── Listen for user speech ───────────────────────────────────────────────
  listenRef.current = (currentTurn, currentMessages) => {
    if (abortRef.current) { runningRef.current = false; return; }
    setStatus('listening');
    setTranscript('');

    // No SpeechRecognition API → skip to process with fallback text
    if (!SpeechRecognition) {
      processRef.current(currentTurn, currentMessages, 'I am not sure');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognitionRef.current = recognition;
    let finalTranscript = '';
    let dispatched = false;

    const dispatch = (text) => {
      if (dispatched || abortRef.current) return;
      dispatched = true;
      recognitionRef.current = null;
      processRef.current(currentTurn, currentMessages, text || 'I am not sure');
    };

    recognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += t;
        else interim += t;
      }
      setTranscript(finalTranscript || interim);
    };

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Microphone access denied. Please allow mic permission.');
        setStatus('idle');
        runningRef.current = false;
        dispatched = true; // prevent onend from also dispatching
        return;
      }
      // 'no-speech', 'network', 'aborted' → proceed with whatever we have
      dispatch(finalTranscript);
    };

    recognition.onend = () => {
      dispatch(finalTranscript);
    };

    // Auto-timeout: if user hasn't spoken after 10s, stop recognition
    const listenTimeout = setTimeout(() => {
      if (!dispatched) {
        try { recognition.stop(); } catch (_) {}
      }
    }, 10000);

    // Clean up timeout when dispatch happens
    const originalDispatch = dispatch;
    const dispatchWithCleanup = (text) => {
      clearTimeout(listenTimeout);
      originalDispatch(text);
    };
    // Reassign handlers to use cleanup version
    recognition.onerror = (e) => {
      clearTimeout(listenTimeout);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Microphone access denied. Please allow mic permission.');
        setStatus('idle');
        runningRef.current = false;
        dispatched = true;
        return;
      }
      dispatchWithCleanup(finalTranscript);
    };
    recognition.onend = () => {
      dispatchWithCleanup(finalTranscript);
    };

    try {
      recognition.start();
    } catch (_) {
      clearTimeout(listenTimeout);
      dispatch(finalTranscript);
    }
  };

  // ── Process user turn ────────────────────────────────────────────────────
  processRef.current = async (currentTurn, prevMessages, userText) => {
    if (abortRef.current) { runningRef.current = false; return; }
    setStatus('processing');
    setTranscript('');

    const nextTurn = currentTurn + 1;
    const updatedMessages = [...prevMessages, { role: 'user', content: userText }];
    setMessages(updatedMessages);
    setTurn(nextTurn);

    try {
      const res = await voiceChat({ messages: updatedMessages, turn: nextTurn, context: 'guided' });
      if (abortRef.current) { runningRef.current = false; return; }

      const allMessages = [...updatedMessages, { role: 'assistant', content: res.text }];
      setMessages(allMessages);
      setStatus('speaking');
      await speakWithFallback(res.text);
      if (abortRef.current) { runningRef.current = false; return; }

      if (res.action === 'start_session') {
        setStatus('session_ready');
        runningRef.current = false;
        onSessionStartRef.current?.({
          track_id: res.track_id || 'fear',
          pattern: res.pattern || 'box',
          emotion: res.emotion || 'neutral',
        });
      } else {
        // Small delay so browser recognition teardown completes
        setTimeout(() => listenRef.current(nextTurn, allMessages), 300);
      }
    } catch (_) {
      // On any API failure, gracefully start a default session
      runningRef.current = false;
      if (!abortRef.current) {
        setStatus('session_ready');
        onSessionStartRef.current?.({ track_id: 'fear', pattern: 'box', emotion: 'neutral' });
      }
    }
  };

  // ── Start guided conversation ────────────────────────────────────────────
  const startConversation = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    abortRef.current = false;
    setMessages([]);
    setTurn(1);
    setError(null);
    setStatus('processing');

    try {
      const res = await voiceChat({ messages: [], turn: 1, context: 'guided' });
      if (abortRef.current) { runningRef.current = false; return; }
      const opening = [{ role: 'assistant', content: res.text }];
      setMessages(opening);
      setStatus('speaking');
      await speakWithFallback(res.text);
      if (abortRef.current) { runningRef.current = false; return; }
      listenRef.current(1, opening);
    } catch (err) {
      runningRef.current = false;
      const msg = err?.code === 'HTTP_401'
        ? 'Please log in to use voice sessions.'
        : 'Could not start voice session. Check your connection.';
      setError(msg);
      setStatus('idle');
    }
  }, []);

  // ── Breathwork check-in ──────────────────────────────────────────────────
  const breathworkCheckIn = useCallback(() => {
    if (!SpeechRecognition) return;
    if (abortRef.current) return;
    if (runningRef.current) return;
    setStatus('breathwork_listening');
    setTranscript('');

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognitionRef.current = recognition;
    let finalText = '';
    let dispatched = false;

    // Auto-timeout for breathwork listen
    const timeout = setTimeout(() => {
      if (!dispatched) {
        try { recognition.stop(); } catch (_) {}
      }
    }, 8000);

    recognition.onresult = (e) => { finalText = e.results[0][0].transcript; };
    recognition.onerror = () => {
      clearTimeout(timeout);
      if (!dispatched) { dispatched = true; setStatus('breathwork_idle'); }
    };
    recognition.onend = async () => {
      clearTimeout(timeout);
      if (dispatched) return;
      dispatched = true;
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

    try { recognition.start(); } catch (_) {
      clearTimeout(timeout);
      setStatus('breathwork_idle');
    }
  }, []);

  // ── Stop ─────────────────────────────────────────────────────────────────
  const stopConversation = useCallback(() => {
    abortRef.current = true;
    runningRef.current = false;
    try { recognitionRef.current?.abort(); } catch (_) {}
    recognitionRef.current = null;
    window.speechSynthesis?.cancel();
    setStatus('idle');
    setMessages([]);
    setTurn(0);
    setTranscript('');
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
      runningRef.current = false;
      try { recognitionRef.current?.abort(); } catch (_) {}
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
