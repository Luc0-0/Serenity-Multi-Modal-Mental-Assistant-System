import { useState } from "react";
import styles from "./GuidedSession.module.css";
import { MeditationOrb } from "./MeditationOrb";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { getMeditationSuggestion } from "../services/api";

const PATTERNS = {
  box:  { name: "Box" },
  calm: { name: "4-7-8" },
  deep: { name: "Deep" },
};

const GUIDED_COLOR_IDLE = "rgba(110, 140, 215, 0.45)";
const GUIDED_COLOR_PLAYING = "rgba(90, 175, 155, 0.50)";

function getTrackUrl(emotion) {
  return "/audio/meditations/fear.mp3";
}

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function GuidedSession({ suggestion, onSuggestionUpdate, onApplyPattern }) {
  const {
    isPlaying,
    audioProgress,
    audioDuration,
    isMuted,
    loadAudio,
    togglePlayPause,
    toggleMute,
  } = useAudioPlayer();

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const data = await getMeditationSuggestion();
      onSuggestionUpdate(data);
      const url = getTrackUrl(data.emotion || "neutral");
      loadAudio(url);
    } catch {
      setGenerateError("Couldn't load your session. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const orbColor = isPlaying ? GUIDED_COLOR_PLAYING : GUIDED_COLOR_IDLE;

  const handleOrbClick = () => {
    if (!suggestion) {
      handleGenerate();
      return;
    }
    togglePlayPause();
  };

  return (
    <div className={styles.guidedGrid}>
      {/* Left - Generate button */}
      <div className={styles.leftCol}>
        <button
          className={styles.actionBtn}
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? "..." : suggestion ? "Regenerate" : "Generate"}
        </button>
      </div>

      {/* Center - Orb */}
      <div className={styles.centerCol}>
        <MeditationOrb
          color={orbColor}
          isPlaying={isPlaying}
          orbTransition={isPlaying ? "transform 0.4s ease" : "transform 6s ease-in-out"}
          onClick={handleOrbClick}
        >
          {isGenerating ? (
            <div className={styles.orbGeneratingRing} />
          ) : !suggestion ? (
            <div className={styles.orbTapHint}>generate</div>
          ) : isPlaying ? (
            <div className={styles.orbCentreIcon}>||</div>
          ) : (
            <div className={styles.orbCentreIcon}>▶</div>
          )}
        </MeditationOrb>

        {suggestion && (
          <div className={styles.infoDisplay}>
            <p className={styles.insight}>{suggestion.insight}</p>
            {audioDuration > 0 && (
              <>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${audioProgress * 100}%` }}
                  />
                </div>
                <p className={styles.timer}>
                  {formatTime(Math.round(audioProgress * audioDuration))} /{" "}
                  {formatTime(Math.round(audioDuration))}
                </p>
              </>
            )}
          </div>
        )}

        {isGenerating && (
          <div className={styles.infoDisplay}>
            <p className={styles.label}>Crafting your session…</p>
          </div>
        )}

        {!suggestion && !isGenerating && (
          <div className={styles.infoDisplay}>
            <p className={styles.idleText}>
              Serenity will craft a session from your journal &amp; emotions.
            </p>
          </div>
        )}
      </div>

      {/* Right top - Play button */}
      {suggestion && (
        <div className={styles.rightTopCol}>
          <button
            className={styles.controlBtn}
            onClick={togglePlayPause}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
        </div>
      )}

      {/* Right middle - Mute button */}
      {suggestion && (
        <div className={styles.rightMidCol}>
          <button
            className={`${styles.controlBtn} ${isMuted ? styles.btnMuted : ""}`}
            onClick={toggleMute}
          >
            {isMuted ? "Muted" : "Sound"}
          </button>
        </div>
      )}

      {/* Apply pattern button */}
      {suggestion && (
        <div className={styles.applySection}>
          <button
            className={styles.applyPatternBtn}
            onClick={() => onApplyPattern(suggestion.suggested_pattern)}
          >
            ✦ {PATTERNS[suggestion.suggested_pattern]?.name} breathing →
          </button>
        </div>
      )}

      {generateError && (
        <div className={styles.errorSection}>
          <p className={styles.errorMsg}>{generateError}</p>
        </div>
      )}
    </div>
  );
}
