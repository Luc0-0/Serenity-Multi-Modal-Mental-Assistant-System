import { useState, useRef, useEffect } from "react";

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  const loadAudio = (url) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Reset state so stale values from previous audio don't linger
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioDuration(0);

    const audio = new Audio(url);
    audio.preload = "auto";
    audio.ontimeupdate = () =>
      setAudioProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    audio.onloadedmetadata = () => setAudioDuration(audio.duration);
    audio.onended = () => {
      setIsPlaying(false);
      // Keep progress at 1.0 (not 0) so completion detection works.
      // Consumer calls stop() or loadAudio() to reset when ready.
      setAudioProgress(1);
    };
    audio.onerror = () => setIsPlaying(false);
    audioRef.current = audio;
  };

  const play = () => {
    if (!audioRef.current) return;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const pause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setAudioProgress(0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    setIsMuted(!isMuted);
    audioRef.current.muted = !isMuted;
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return {
    audioRef,
    isPlaying,
    audioProgress,
    audioDuration,
    isMuted,
    loadAudio,
    play,
    pause,
    togglePlayPause,
    stop,
    toggleMute,
  };
}
