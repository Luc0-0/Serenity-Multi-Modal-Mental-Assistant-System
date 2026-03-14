import { useState } from "react";
import styles from "./GuidedSession.module.css";
import { MeditationOrb } from "./MeditationOrb";
import { OrbLayout, OrbButton } from "./OrbLayout";
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
  const h = new Date().getHours();
  if ((emotion === "neutral" || emotion === "joy") && h >= 5 && h < 11)
    return "/audio/meditations/fear.mp3";
  if ((emotion === "neutral" || emotion === "joy") && (h >= 22 || h < 4))
    return "/audio/meditations/fear.mp3";
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
    stop,
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
    <div className={styles.guidedContent}>
      <OrbLayout width="100%" height="clamp(400px, 60vh, 600px)">
        {/* Center Orb */}
        <MeditationOrb
          color={orbColor}
          isPlaying={isPlaying}
          orbTransition={isPlaying ? "transform 0.4s ease" : "transform 6s ease-in-out"}
          onClick={handleOrbClick}
          title={!suggestion ? "Generate session" : isPlaying ? "Pause" : "Play"}
        >
          {isGenerating ? (
            <div className={styles.orbGeneratingRing} />
          ) : !suggestion ? (
            <div className={styles.orbTapHint}>generate</div>
          ) : isPlaying ? (
            <div className={styles.orbCentreIcon}>⏸</div>
          ) : (
            <div className={styles.orbCentreIcon}>▶</div>
          )}
        </MeditationOrb>

        {/* Left Button - Generate/Regenerate */}
        <OrbButton position="left" className={styles.buttonContainer}>
          <button
            className={styles.actionBtn}
            onClick={!suggestion ? handleGenerate : () => handleGenerate()}
            disabled={isGenerating}
            title={suggestion ? "Regenerate" : "Generate session"}
          >
            {isGenerating ? "..." : suggestion ? "Regenerate" : "Generate"}
          </button>
        </OrbButton>

        {/* Right Top Buttons - Play/Pause */}
        {suggestion && (
          <OrbButton position="rightTop" className={styles.buttonContainer}>
            <button
              className={styles.controlBtn}
              onClick={togglePlayPause}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
          </OrbButton>
        )}

        {/* Right Top-Bottom Button - Mute */}
        {suggestion && (
          <OrbButton position="rightTopBottom" className={styles.buttonContainer}>
            <button
              className={`${styles.controlBtn} ${isMuted ? styles.btnMuted : ""}`}
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
          </OrbButton>
        )}
      </OrbLayout>

      {/* Info Display */}
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

      {/* Apply pattern button */}
      {suggestion && (
        <button
          className={styles.applyPatternBtn}
          onClick={() => onApplyPattern(suggestion.suggested_pattern)}
        >
          ✦ {PATTERNS[suggestion.suggested_pattern]?.name} breathing →
        </button>
      )}

      {generateError && <p className={styles.errorMsg}>{generateError}</p>}
    </div>
  );
}
